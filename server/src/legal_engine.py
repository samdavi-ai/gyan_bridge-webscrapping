import os
import json
from openai import OpenAI
from src.searcher import DiscoveryEngine
from src.translator import ContentTranslator
from src.constitutional_knowledge import get_constitutional_context
from src.real_world_scenarios import get_real_world_scenarios

class LegalAssistant:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
             print("⚠️ No OPENAI_API_KEY found. Legal Assistant may fail.")
        self.client = OpenAI(api_key=self.api_key)
        self.searcher = DiscoveryEngine()
        self.translator = ContentTranslator(api_key=self.api_key)
        
    def _filter_relevant_news(self, items):
        """
        Filters news items to ensure they are actually relevant to Legal/Rights/Christian context.
        """
        # Keywords that signify relevance
        relevant_keywords = [
            'court', 'judgement', 'supreme court', 'high court', 'law', 'act', 'bill', 
            'rights', 'christian', 'church', 'bishop', 'persecution', 'attack', 
            'polity', 'constitution', 'freedom', 'religion', 'minority', 
            'justice', 'petition', 'plea', 'verdict', 'bench', 'tribunal'
        ]
        
        filtered = []
        for item in items:
            # Check title and snippet
            text = (item.get('title', '') + " " + item.get('metadata', {}).get('snippet', '')).lower()
            
            # Must match at least one keyword
            if any(k in text for k in relevant_keywords):
                filtered.append(item)
                
        return filtered

    def _search_acts(self, query):
        """Searches specifically for Indian Acts and Rules (Optimized & Parallel)."""
        base_exclusions = "-site:google.com -site:youtube.com -site:facebook.com -site:support.* -site:baidu.com -site:*.cn"
        
        # Reduced to 3 high-yield queries
        queries = [
            f'"{query}" Indian Act Section site:indiankanoon.org',
            f'"{query}" act text site:indiacode.nic.in OR site:legislative.gov.in',
            f'"{query}" legal provision India {base_exclusions}'
        ]
        
        results = []
        
        # [NEW] Direct Constitution Injection
        if "constitution" in query.lower():
            results.append({
                "title": "The Constitution of India (Official PDF)",
                "url": "https://indiacode.nic.in/bitstream/123456789/19151/1/constitution_of_india.pdf",
                "metadata": {"snippet": "Full text of the Constitution of India including all amendments up to date. Source: India Code."}
            })

        # Parallel Execution
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def fetch_query(q):
            # Try specific region first, fallback within the same thread if needed
            res = self.searcher.search_web(q, max_results=2, region='in-en', include_news=False)
            if not res:
                res = self.searcher.search_web(q, max_results=2, region='wt-wt', include_news=False)
            return res

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(fetch_query, q) for q in queries]
            for future in as_completed(futures):
                try:
                    results.extend(future.result())
                except Exception:
                    pass
        
        unique = {r['url']: r for r in results}.values()
        return list(unique)[:5]

    def _search_procedures(self, query):
        """Searches for procedural steps and forms (Optimized & Parallel)."""
        base_exclusions = "-site:google.com -site:yahoo.com -site:bing.com -site:support.* help topic -site:baidu.com -site:*.cn"
        queries = [
            f'{query} procedure step by step India official guide {base_exclusions}',
            f'{query} required documents checklist India legal compliance'
        ]
        
        results = []
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def fetch_query(q):
            res = self.searcher.search_web(q, max_results=2, region='in-en', include_news=False)
            if not res:
                res = self.searcher.search_web(q, max_results=2, region='wt-wt', include_news=False)
            return res

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(fetch_query, q) for q in queries]
            for future in as_completed(futures):
                try:
                    results.extend(future.result())
                except Exception:
                    pass
              
        unique = {r['url']: r for r in results}.values()
        return list(unique)[:5]

    def ask(self, query, lang='en', generate_audio=False):
        """
        Main entry point.
        Returns structured data with categories:
        - acts: List of relevant Acts/Statutes
        - procedures: List of procedural guides
        - news: Related news articles
        - answer: LLM-generated summary
        - audio_base64: (Optional) Base64-encoded audio if generate_audio=True
        """
        print(f"⚖️ Legal Assistant: Analyzing '{query}' (Lang: {lang}, Audio: {generate_audio})...")
        
        # [NEW] Translate Query to English for better Search Results
        english_query = query
        if lang != 'en':
            english_query = self.translator.translate_text(query, 'en')
            print(f"   -> Translated Query: '{english_query}'")

        # [STRICT TOPIC CONTROL]
        from src.topic_manager import topic_manager
        active_topics = topic_manager.get_active_keywords()
        if active_topics:
             # [FIX] Simplified constraint for DDG compatibility (removed boolean AND/OR/Parentheses complexity)
             topic_join = " ".join([f'{t}' for t in active_topics]) 
             topic_constraint = f" {topic_join}"
             
             # Prevent double strictness if user already typed it
             if not any(t.lower() in english_query.lower() for t in active_topics):
                 english_query += topic_constraint
                 print(f"🔒 [LegalAssistant] Strict Topic applied: {english_query}")

        # 1. Parallelize Searches (Speed Optimization)
        # Use ThreadPool to run Acts, Procedures, and News searches concurrently
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        acts_hits = []
        proc_hits = []
        news_hits = []
        
        def run_acts():
             return self._search_acts(english_query)
        
        def run_proc():
             return self._search_procedures(english_query)
             
        def run_news():
            news_query = f"{english_query} (court OR law OR rights OR persecution) India news"
            # Try region-specific first
            raw_news = self.searcher.search_web(news_query, max_results=10, region='in-en')
            # Fallback to global if low results
            # Fallback to global if low results
            if not raw_news or len(raw_news) < 2:
                print(f"⚠️ Low results with 'in-en', retrying global search for: {news_query}")
                raw_news = self.searcher.search_web(news_query, max_results=10, region='wt-wt')
            
            return self._filter_relevant_news(raw_news)[:3]

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(run_acts): 'acts',
                executor.submit(run_proc): 'procs',
                executor.submit(run_news): 'news'
            }
            
            for future in as_completed(futures):
                try:
                    res = future.result()
                    rtype = futures[future]
                    if rtype == 'acts': acts_hits = res
                    elif rtype == 'procs': proc_hits = res
                    elif rtype == 'news': news_hits = res
                except Exception as e:
                    print(f"⚠️ Search Error ({futures[future]}): {e}")

        # 4. Prepare Context for LLM
        context_str = "--- RELEVANT ACTS & STATUTES ---\n"
        for i, item in enumerate(acts_hits, 1):
            snippet = item.get('metadata', {}).get('snippet', '')
            context_str += f"Source {i}: {item['title']} ({item['url']})\nSnippet: {snippet[:300]}\n\n"
            
        context_str += "--- PROCEDURAL GUIDES & FORMS ---\n"
        for i, item in enumerate(proc_hits, 1):
            snippet = item.get('metadata', {}).get('snippet', '')
            context_str += f"Source {i}: {item['title']} ({item['url']})\nSnippet: {snippet[:300]}\n\n"
            
        # 5. LLM Synthesis
        lang_map = {'ta': 'Tamil', 'hi': 'Hindi', 'en': 'English', 'ml': 'Malayalam', 'te': 'Telugu'}
        full_lang = lang_map.get(lang.lower(), lang).upper()
        target_lang_instruction = ""
        if lang != 'en':
            target_lang_instruction = f"""
            CRITICAL INSTRUCTION: The user has selected {full_lang}.
            1. You MUST respond ENTIRELY in {full_lang} script.
            2. Translate ALL headers (like 'Legal Basis', 'Procedure') into {full_lang}.
            3. Do NOT use English script for the main response.
            """
        
        # Integrate Super Admin Topics
        from src.topic_manager import topic_manager
        active_topics = topic_manager.get_active_keywords()
        topic_context = ""
        if active_topics:
            topic_str = ", ".join(active_topics)
            topic_context = f"\nSuper Admin Controlled Topics: {topic_str}. Focusing on strict legal interpretation related to these areas."

        # Load comprehensive knowledge bases
        constitutional_context = get_constitutional_context()
        real_world_context = get_real_world_scenarios()

        # EXPERT INDIAN LEGAL ASSISTANT - COMPREHENSIVE CONSTITUTIONAL GUIDANCE
        system_prompt = f"""
### SYSTEM ROLE: EXPERT INDIAN LEGAL ASSISTANT

**OPERATIONAL CONTEXT:**
- **Environment:** Web Application (GyanBridge)
- **Active Locale:** {lang} (English / Tamil / Hindi)
- **Specialization:** Indian Constitutional Law, Religious Freedom, Minority Rights

### CORE DIRECTIVE
You are an EXPERT Indian Legal Assistant specializing in Constitutional Law, particularly Articles 25-30 related to religious freedom and minority rights. Your responses must be:
1. **COMPREHENSIVE**: Provide detailed, step-by-step guidance
2. **SPECIFIC**: Cite exact Constitutional Articles with full text
3. **PRACTICAL**: Include required documents, procedures, authorities, and timelines
4. **CONTEXTUAL**: Incorporate real-world scenarios and challenges faced in India

### CONSTITUTIONAL KNOWLEDGE BASE
You have access to comprehensive knowledge about:

{constitutional_context}

### REAL-WORLD SCENARIOS & CHALLENGES
You are aware of practical challenges faced by minorities in India:

{real_world_context}

### RESPONSE STRUCTURE (MANDATORY)
For EVERY legal query, structure your response as follows:

**1. RELEVANT CONSTITUTIONAL ARTICLES**
   - Quote the FULL TEXT of applicable articles (e.g., Articles 25, 26, 27, 28, 29, 30)
   - Explain how each article applies to the specific situation

**2. STEP-BY-STEP PROCEDURE**
   - List exact steps to follow (numbered)
   - Specify the sequence and dependencies

**3. REQUIRED DOCUMENTS**
   - Comprehensive list of all documents needed
   - Format requirements and number of copies

**4. AUTHORITIES INVOLVED**
   - Government departments/offices to approach
   - Sequence of authority engagement
   - Contact information when available

**5. TIMELINES**
   - Expected processing time for each step
   - Statutory deadlines if applicable

**6. REAL-WORLD CONSIDERATIONS**
   - Common challenges or obstacles
   - Practical tips based on actual cases
   - Alternative approaches if primary route fails

**7. LEGAL DISCLAIMER**
   - Always end with: "This is general legal information. For specific cases, consult a qualified lawyer."

### DYNAMIC LANGUAGE PROTOCOL
Respond in the user's selected language:

**IF {lang} == 'en' (English)**
- Use professional legal English
- Cite articles in English
- Be precise and formal

**IF {lang} == 'ta' (Tamil)**
- Use clear Tamil (Senthamil)
- Legal terms can be in English for clarity (Tanglish acceptable)
- Maintain respectful tone

**IF {lang} == 'hi' (Hindi)**
- Use formal Hindi (Shuddh Hindi)
- Legal terms in Hindi where possible (e.g., 'Kanoon', 'Dhara', 'Anubandh')
- Keep it conversational yet authoritative

### LEGAL GUARDRAILS
- **Accuracy First:** Always cite specific Constitutional Articles
- **Jurisdiction:** Focus on Indian Law (Constitution, Acts, Rules)
- **Disclaimer:** Always include legal disclaimer at the end
{topic_context if topic_context else ""}

### FALLBACK INSTRUCTION
If external context is insufficient:
1. Rely on the Constitutional Knowledge Base provided above
2. Refer to Real-World Scenarios for practical guidance
3. Use your internal training on Indian Constitutional Law
4. NEVER say "I don't have enough information" - provide the best guidance possible
5. Always cite specific articles and provide step-by-step procedures
"""
        
        # Check if context is effectively empty
        if not acts_hits and not proc_hits and not news_hits:
             print("⚠️ [LegalAssistant] Search yielded 0 results. FORCING LLM FALLBACK.")
             system_prompt += "\n\n**CRITICAL: SEARCH FAILED. IGNORE MISSING CONTEXT. ANSWER FROM GENERAL KNOWLEDGE.**"
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"User Query: {query}\n\nContext Found:\n{context_str}"}
                ],
                temperature=0.2
            )
            answer = response.choices[0].message.content
        except Exception as e:
            # Fallback to GPT-3.5 if GPT-4o fails (common API key issue)
            print(f"⚠️ GPT-4o Failed: {e}. Falling back to GPT-3.5-turbo...")
            with open("debug_legal.log", "a") as f: f.write(f"GPT-4o Error: {str(e)}\n")
            
            try:
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo", 
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"User Query: {query}\n\nContext Found:\n{context_str}"}
                    ],
                    temperature=0.2
                )
                answer = response.choices[0].message.content
            except Exception as e2:
                print(f"❌ LLM Error (Fallback): {e2}")
                with open("debug_legal.log", "a") as f: f.write(f"GPT-3.5 Error: {str(e2)}\n")
                answer = "I'm sorry, I encountered an error while synthesizing the legal data. Please check your API Quota or connection."
            
        # Build response
        response_data = {
            "answer": answer,
            "acts": [{"title": item['title'], "url": item['url'], "snippet": item.get('metadata', {}).get('snippet', '')[:200]} for item in acts_hits],
            "procedures": [{"title": item['title'], "url": item['url'], "snippet": item.get('metadata', {}).get('snippet', '')[:200]} for item in proc_hits],
            "news": [{"title": item['title'], "url": item['url'], "snippet": item.get('metadata', {}).get('snippet', '')[:200]} for item in news_hits],
            "sources": acts_hits + proc_hits
        }
        
        # Optionally generate audio if requested
        if generate_audio:
            try:
                audio_data = self.speak(answer, lang)
                response_data["audio_base64"] = audio_data
                print("🔊 [LegalAssistant] Audio generated successfully")
            except Exception as e:
                print(f"⚠️ [LegalAssistant] Audio generation failed: {e}")
                response_data["audio_base64"] = None
        
        return response_data

    def speak(self, text, lang='en'):
        """
        Synthesizes text to speech using OpenAI's high-quality TTS model.
        Supports multiple languages: English (en), Hindi (hi), Tamil (ta).
        Returns the binary audio data.
        """
        try:
            # Map language to appropriate voice (OpenAI TTS supports multiple voices)
            # Note: OpenAI TTS doesn't directly support language parameter,
            # but we can use different voices for better pronunciation
            voice_map = {
                'en': 'alloy',  # Neutral English voice
                'hi': 'nova',   # Clear voice for Hindi
                'ta': 'echo',   # Clear voice for Tamil
            }
            
            # Select voice based on language
            voice = voice_map.get(lang, 'alloy')
            
            # For non-English, ensure text is properly formatted
            # (Translation should already be done, but we ensure it's clean)
            clean_text = text.strip()
            
            print(f"🔊 [Legal TTS] Generating speech for {lang} language (voice: {voice})")
            
            response = self.client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=clean_text
            )
            return response.content
        except Exception as e:
            print(f"❌ TTS Error: {e}")
            return None
