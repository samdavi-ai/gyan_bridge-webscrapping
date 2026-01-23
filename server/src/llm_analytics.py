import os
import json
import re
from datetime import datetime
from openai import OpenAI
from .utils import retry_with_backoff

class LLMAnalytics:
    def __init__(self, rag_engine, discovery_engine=None):
        self.rag_engine = rag_engine
        self.discovery_engine = discovery_engine
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=self.api_key)
        
    def _invoke_llm(self, prompt, model="gpt-4-turbo-preview"):
        """Direct OpenAI call with fallback logic"""
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"⚠️ LLM Error ({model}): {e}")
            if model != "gpt-3.5-turbo":
                print("🔄 Switching to Fallback (gpt-3.5-turbo)...")
                return self._invoke_llm(prompt, model="gpt-3.5-turbo")
            raise e

    @retry_with_backoff(retries=0, initial_delay=1)
    def analyze_and_graph(self, query, topic_context=None, context_docs=None, direct_context=None, lang='en'):
        """Generates a graph JSON based on the query and context."""
        
        # 1. Retrieve Context
        context_text = ""
        if direct_context:
            context_text = direct_context
            print(f"🧠 Analytics: Using DIRECT web context ({len(context_text)} chars).")
        elif context_docs:
            context_text = "\n\n".join([d.page_content if hasattr(d, 'page_content') else str(d) for d in context_docs])
        else:
            # Fallback to internal RAG
            context_docs = self.rag_engine.search(query, k=10)
            
            # Live Search Fallback
            if (not context_docs or len(context_docs) < 2) and self.discovery_engine:
                print(f"🌐 Analytics: RAG insufficient. Triggering Live Web Search...")
                live_results = self.discovery_engine.search_web(query, max_results=15)
                if live_results:
                     # Calculate average sentiment from snippets for dashboard
                    context_text = "\n\n".join([f"Source: {r['url']}\nContent: {r['metadata'].get('snippet', '')}" for r in live_results])
            
            if not context_text and context_docs:
                 context_text = "\n\n".join([f"Source: {d['metadata'].get('source', 'Unknown')}\nContent: {d['content']}" for d in context_docs])
        
        if not context_text:
             return {"error": "No relevant statistics or trend data found for this query."}

        # 2. Prompt LLM
        lang_map = {'ta': 'Tamil', 'hi': 'Hindi', 'en': 'English'}
        full_lang = lang_map.get(lang.lower(), lang).upper()
        target_instruction = f"IMPORTANT: Generate texts in {full_lang} Language." if lang != 'en' else ""

        prompt = f"""
        You are a Data Analyst AI.
        User Query: {query}
        Context:
        {context_text[:15000]} 

        Task: Analyze the context and generate a JSON object for a graph/chart.
        {target_instruction}

        REQUIRED JSON SCHEMA:
        {{
            "graph_type": "line" | "bar" | "pie",
            "title": "Descriptive Graph Title",
            "xaxis_label": "Label for X",
            "yaxis_label": "Label for Y",
            "data": [
                {{ "x": "Label/Year", "y": 123.45 }}
            ],
            "insight": "Brief data-backed insight.",
            "sentiment_score": 0.5,
            "key_entities": ["Entity1", "Entity2"],
            "sources": ["url1", "url2"],
            "timestamp": {int(datetime.now().timestamp())},
            "summary": "Executive summary of the topic."
        }}
        
        Calculate 'sentiment_score' from -1.0 (Negative) to 1.0 (Positive) based on the context.
        Extract 'key_entities' (People, Orgs, Places).
        Structure 'summary' as a detailed paragraph.
        Make 'y' values numeric.
        """
        
        try:
            text = self._invoke_llm(prompt)
            # Clean JSON
            text = re.sub(r'```json', '', text)
            text = re.sub(r'```', '', text).strip()
            
            data = json.loads(text)
            
            # Ensure numeric Y
            if 'data' in data and isinstance(data['data'], list):
                for p in data['data']:
                    try:
                        p['y'] = float(p.get('y', 0))
                    except:
                        p['y'] = 0
            
            return data
            
        except Exception as e:
            print(f"❌ Analytics Generation Failed: {e}")
            return {"error": str(e)}

    # Keep other methods as stubs or minimal if unused, but generate_forecast is used by Predictor
    def generate_forecast(self, horizon, topic=None):
        return {} # Placeholder to avoid import errors if invoked
    
    def extract_time_series(self, topic, context_text):
        return [] # Placeholder

