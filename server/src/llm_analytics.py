from langchain_openai import ChatOpenAI
import json
import re
from datetime import datetime
from .utils import retry_with_backoff

class LLMAnalytics:
    def __init__(self, rag_engine):
        self.rag_engine = rag_engine
        # Primary: GPT-4 Turbo for best quality
        self.llm_primary = ChatOpenAI(model="gpt-4-turbo-preview", temperature=0.1)
        # Fallback: GPT-3.5 Turbo for speed/cost
        self.llm_fallback = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.1)
        
    def _invoke_with_fallback(self, prompt):
        """Try primary model, fallback to 8b if rate limited or fails"""
        try:
            return self.llm_primary.invoke(prompt)
        except Exception as e:
            # Broad catch to ensure we ALWAYS fallback on high-traffic errors
            print(f"⚠️ Primary LLM Error ({type(e).__name__}). Switching to Fallback (Llama3-8b)...")
            return self.llm_fallback.invoke(prompt)
        
    @retry_with_backoff(retries=0, initial_delay=1)
    def analyze_and_graph(self, query, topic_context=None, context_docs=None, direct_context=None):
        """
        Generates a graph JSON based on the query and context.
        Strategy:
        1. If direct_context is provided (e.g. from hybrid search), use it.
        2. Else if context_docs provided, use that.
        3. Else, use RAG to fetch context.
        """
        # 1. Retrieve Context
        context_text = ""
        if direct_context:
            context_text = direct_context
            print(f"🧠 Analytics: Using DIRECT web context ({len(context_text)} chars) instead of RAG.")
        elif context_docs:
            # Assuming context_docs can be a list of Langchain Document objects or similar
            context_text = "\n\n".join([d.page_content if hasattr(d, 'page_content') else str(d) for d in context_docs])
            print(f"🧠 Analytics: Using provided context_docs ({len(context_text)} chars) instead of RAG.")
        else:
            # Fallback to internal RAG if nothing passed
            # Optimize Token Usage: Reduced k to 10
            context_docs = self.rag_engine.search(query, k=10)
            
            if not context_docs:
                return {"error": "No relevant data found in the knowledge base."}
    
            context_text = "\n\n".join([f"Source: {d['metadata'].get('source', 'Unknown')}\nContent: {d['content']}" for d in context_docs])
        
        # 2. Prompt LLM - Strict Schema Enforcement
        prompt = f"""
        You are a Data Analyst AI. 
        User Query: {query}
        Topic Context: {topic_context or 'General'}
        
        Context Data (from web scraping):
        {context_text}
        
        Task: Analyze the context and answer the user's query by generating a JSON object for a graph.
        The output must be strictly valid JSON. Do not include markdown formatting like ```json.
        
        Rules:
        - Extract numeric trends vs time, or comparisons between categories.
        - If dates are mentioned, use them for X-axis.
        - If hard numbers are missing, INFER trends or use estimates based on context.
        - Map qualitative terms (High/Surge/Rising) to proxy values (e.g., Low=10, Medium=50, High=90).
        - Graph Types: "line" (time), "bar" (comparison), "pie" (distribution).
        - Use your internal knowledge to supplement the provided context if needed.
        
        REQUIRED JSON SCHEMA:
        {{
            "graph_type": "line" | "bar" | "pie",
            "title": "Descriptive Graph Title",
            "xaxis_label": "Label for X",
            "yaxis_label": "Label for Y",
            "data": [
                {{ "x": "2023", "y": 150 }},
                {{ "x": "2024", "y": 200 }}
            ],
            "insight": "Brief, data-backed insight explaining the trend. Mention if estimates are used."
        }}
        
        If absolutely no relevant information can be found, fallback to a general trend estimation based on the topic.
        DO NOT return an error object unless the query is gibberish.
        """
        
        # No inner try/except for LLM invocation to allow retry_with_backoff to work if needed
        response = self._invoke_with_fallback(prompt)
        text = response.content
        
        print(f"DEBUG: Raw LLM Output: {text[:500]}...") # Log first 500 chars

        # Cleaning json
        text = re.sub(r'```json', '', text)
        text = re.sub(r'```', '', text).strip()
        
        if not text:
             raise ValueError("LLM returned empty response")

        try:
            data = json.loads(text)
            
            # [NEW] Post-Processing: Smart qualitative-to-numeric mapping
            # Ensure 'y' values are numbers so the chart library can render them
            if isinstance(data.get('data'), list):
                for point in data['data']:
                    val = point.get('y')
                    # Ensure we only have valid numbers
                    try:
                        # If it's a string that looks like a number, convert it
                        if isinstance(val, str):
                            # Try to clean it "approx 50" -> 50
                            match = re.search(r'\d+(\.\d+)?', val)
                            if match: 
                                point['y'] = float(match.group())
                            else:
                                # If strictly no number found, we can't map it.
                                # Mark as 0 or None so frontend can handle or skip
                                point['y'] = 0 
                    except:
                        point['y'] = 0
        except json.JSONDecodeError:
            # Try to find first { and last }
            import regex # standard re might get confused with nested braces but let's try simple finding
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1:
                try:
                    data = json.loads(text[start:end+1])
                except:
                     raise ValueError(f"Invalid JSON format. Raw: {text[:100]}")
            else:
                 raise ValueError(f"No JSON object found. Raw: {text[:100]}")
        
        # Backend Validation
        required_keys = ["graph_type", "title", "data"]
        if not all(k in data for k in required_keys):
                # If validation fails, we might want to return error or raise to retry.
                # Returning error is safer for frontend not to crash loop.
                if "error" in data: return data
                raise ValueError("Missing required JSON keys")
                
        return data

    @retry_with_backoff(retries=5, initial_delay=2)
    def generate_forecast(self, horizon, topic=None):
        """
        Generates a strategic forecast (Growth, Risk, Confidence) for a specific horizon.
        If 'topic' is provided, the forecast is tailored to that topic using RAG.
        """
        
        # 1. RAG Context Retrieval based on Topic
        if topic:
            search_query = f"future predictions for {topic} trends statistics"
            context = self.rag_engine.search(search_query, k=5)
            target_subject = topic 
        else:
            # Default Broad Context
            context = self.rag_engine.search("Christian persecution trends predictions growth statistics", k=5)
            target_subject = "Christian Persecution/Activity"

        context_text = "\n".join([c['content'] for c in context]) if context else "No specific data found."

        is_long_term = "5" in horizon or "4" in horizon

        prompt = f"""
        You are a Strategic Forecaster AI.
        
        Context Data (Real-time Scraped):
        {context_text}
        
        Task: Predict the *cumulative* growth trend for '{target_subject}' over the next {horizon}.
        
        CRITICAL INSTRUCTION:
        - The user is asking for a {horizon} forecast for: {target_subject}.
        - If the annual trend is +10%, and the horizon is 5 Years, the result should reflect the compounded effect (e.g. +50-60%).
        - Do not give the same number for 1 Year vs 5 Years.
        - { "For this LONG TERM forecast, consider macro-societal shifts." if is_long_term else "For this SHORT TERM forecast, focus on immediate active conflicts." }
        
        Using the context, estimate:
        1. Cumulative Growth Percentage for {horizon}.
        2. Impact Score (0-10) - How severe/significant is the activity?
        3. Confidence Score (0-100%) - How certain is this trend?
        4. Volatility (High/Med/Low).
        5. General Trend.
        
        Output strictly valid JSON:
        {{
            "growth": "+X%",
            "impact_score": "8.5",
            "confidence": "80%",
            "volatility": "Level",
            "trend": "Direction",
            "reason": "Short explanation based on context"
        }}
        """
        try:
            response = self._invoke_with_fallback(prompt)
            text = response.content
            # Cleaning json
            text = re.sub(r'```json', '', text)
            text = re.sub(r'```', '', text).strip()
            return json.loads(text)
        except Exception as e:
            import traceback
            traceback.print_exc()
            # Extrapolation Fallback: If AI fails after RETRIES, return explicit N/A
            try:
                # Removed hardcoded linear growth assumption (5%)
                return {
                    "growth": "N/A", 
                    "volatility": "Unknown", 
                    "trend": "Unknown",
                    "impact_score": "N/A",
                    "confidence": "0%"
                }
            except:
                return {
                    "growth": "N/A", 
                    "volatility": "Unknown", 
                    "trend": "Unknown",
                    "impact_score": "N/A",
                    "confidence": "Low"
                }

    @retry_with_backoff(retries=3, initial_delay=2)
    def extract_time_series(self, topic, context_text):
        """
        Extracts HARD NUMBERS and DATES from unstructured text snippets.
        Used by the Trend Analyzer to build 'real' event graphs rather than just article counts.
        """
        current_year = datetime.now().year
        prompt = f"""
        You are a Data Scraper AI specialized in extracting statistical data.
        Target Topic: {topic}
        
        Raw Search Snippets:
        {context_text}
        
        Task: Extract EVERY number that relates to incidents, attacks, cases, or events.
        
        EXAMPLES OF WHAT TO EXTRACT:
        - "UCF reported 731 attacks" → {{"date": "{current_year}", "count": 731, "summary": "UCF reported 731 attacks"}}
        - "599 incidents in 2022" → {{"date": "2022", "count": 599, "summary": "599 incidents in 2022"}}
        - "301 cases in Uttar Pradesh" → {{"date": "{current_year}", "count": 301, "summary": "301 cases in Uttar Pradesh"}}
        - "Between January and November there were 600 attacks" → {{"date": "{current_year}-11", "count": 600, "summary": "600 attacks Jan-Nov"}}
        
        CRITICAL RULES:
        1. Extract EVERY number you find, even if uncertain about the year
        2. If no year is mentioned, assume current year ({current_year})
        3. Look for: "attacks", "incidents", "cases", "reported", "documented"
        4. Extract numbers from organization names like "United Christian Forum", "UCF", "EFI"
        5. If you find MULTIPLE numbers for the same year, include ALL of them
        6. Normalize dates: use YYYY or YYYY-MM format
        
        CRITICAL OUTPUT FORMAT:
        - Return ONLY a valid JSON array
        - NO explanatory text before or after
        - Start your response with [ and end with ]
        - Each entry must be complete
        
        Example output:
        [{{"date": "{current_year}", "count": 731, "summary": "UCF reported 731 attacks in {current_year}"}},{{"date": "2023", "count": 599, "summary": "599 incidents in 2023"}}]
        
        If you find NO numbers at all, return: []
        """
        
        try:
            response = self._invoke_with_fallback(prompt)
            full_response = response.content
            print(f"📊 DEBUG: Full LLM response length: {len(full_response)} chars")
            print(f"📊 DEBUG: First 500 chars: {full_response[:500]}")
            print(f"📊 DEBUG: Last 200 chars: {full_response[-200:]}")
            
            data = self._clean_and_parse_json(full_response)
            is_list = isinstance(data, list)
            print(f"📊 DEBUG: Parsed {len(data) if is_list else 0} items from LLM")
            if is_list and len(data) > 0:
                print(f"📊 DEBUG: Sample parsed items: {data[:2]}")
            return data if is_list else []
        except Exception as e:
            print(f"Extraction Error: {e}")
            return []

    def _clean_and_parse_json(self, text):
        """Helper to clean and parse LLM JSON output, handles truncated responses"""
        try:
            text = re.sub(r'```json', '', text)
            text = re.sub(r'```', '', text).strip()
            
            # Find first [ and last ]
            start = text.find('[')
            end = text.rfind(']')
            
            if start != -1 and end != -1:
                json_text = text[start:end+1]
                try:
                    return json.loads(json_text)
                except json.JSONDecodeError:
                    # If JSON is incomplete, try to fix it by closing the array
                    # Find the last complete object
                    last_complete = json_text.rfind('}')
                    if last_complete != -1:
                        fixed_json = json_text[:last_complete+1] + ']'
                        try:
                            return json.loads(fixed_json)
                        except:
                            pass
                    return []
            elif text.strip().startswith('{'):
                 # Sometimes it returns a single object instead of list
                 return [json.loads(text)]
            return []
        except Exception as e:
            print(f"JSON Parse Error: {e}")
            return []
