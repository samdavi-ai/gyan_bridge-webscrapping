import os
import json
from openai import OpenAI
from src.searcher import DiscoveryEngine
from src.translator import ContentTranslator

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
        """Searches specifically for Indian Acts and Rules."""
        # Search strategy: targeted authoritative domains + strict exclusions
        # [FIX] Explicitly exclude Chinese domains/content which often appear for "CAN", "Act" etc.
        base_exclusions = "-site:google.com -site:youtube.com -site:facebook.com -site:support.* -site:baidu.com -site:zhihu.com -site:*.cn"
        queries = [
            f'"{query}" Indian Act Section site:indiankanoon.org',
            f'"{query}" rule gazette site:legislative.gov.in',
            f'"{query}" act text site:indiacode.nic.in',
            f'"{query}" original text site:nationalarchives.nic.in',
            f'"{query}" official pdf site:s3waas.gov.in',
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
            results.append({
                "title": "Constitution of India (Bilingual with 105th Amendment)",
                "url": "https://s3waas.gov.in/s380537a945c7aaa78ccfcdf1b99b5d8f/uploads/2023/05/2023050186.pdf",
                "metadata": {"snippet": "Bilingual (Hindi/English) version of the Constitution. Source: S3WaaS."}
            })

        for q in queries:
             # [FIX] Use strict India-English region to filter out foreign content
             # [OPTIMIZATION] disable news search for static legal docs to avoid timeouts
             res = self.searcher.search_web(q, max_results=3, region='in-en', include_news=False)
             results.extend(res)
        
        # Deduplicate by URL
        unique = {r['url']: r for r in results}.values()
        return list(unique)[:5] # Keep top 5

    def _search_procedures(self, query):
        """Searches for procedural steps and forms."""
        # Refined queries to avoid "how to login" type results
        base_exclusions = "-site:google.com -site:yahoo.com -site:bing.com -site:support.* help topic -site:baidu.com -site:zhihu.com -site:*.cn"
        queries = [
            f'{query} procedure step by step India official guide {base_exclusions}',
            f'{query} application form government portal India',
            f'{query} required documents checklist India legal compliance'
        ]
        
        results = []
        for q in queries:
             # [OPTIMIZATION] disable news search for static procedures
             res = self.searcher.search_web(q, max_results=3, region='in-en', include_news=False)
             results.extend(res)
             
        unique = {r['url']: r for r in results}.values()
        return list(unique)[:5]

    def ask(self, query, lang='en'):
        """
        Main entry point.
        Returns structured data with categories:
        - acts: List of relevant Acts/Statutes
        - procedures: List of procedural guides
        - news: Related news articles
        - answer: LLM-generated summary
        """
        print(f"⚖️ Legal Assistant: Analyzing '{query}' (Lang: {lang})...")
        
        # [NEW] Translate Query to English for better Search Results
        english_query = query
        if lang != 'en':
            english_query = self.translator.translate_text(query, 'en')
            print(f"   -> Translated Query: '{english_query}'")

        # [STRICT TOPIC CONTROL]
        from src.topic_manager import topic_manager
        active_topics = topic_manager.get_active_keywords()
        if active_topics:
             topic_constraint = " AND (" + " OR ".join([f'"{t}"' for t in active_topics]) + ")"
             # Prevent double strictness if user already typed it
             if not any(t.lower() in english_query.lower() for t in active_topics):
                 english_query += topic_constraint
                 print(f"🔒 [LegalAssistant] Strict Topic applied: {english_query}")

        # 1. Search for Acts and Statutes (Use English Query)
        acts_hits = self._search_acts(english_query)
        
        # 2. Search for Procedures (Use English Query)
        proc_hits = self._search_procedures(english_query)
        
        # 3. Search for Related News (Christian legal news)
        # [FIX] More specific query to avoid generic results like "C-DAC"
        news_query = f"{english_query} (court OR law OR rights OR persecution) India news"
        
        # [FIX] Force Indian region and fetch more to allow filtering
        # [NEW] Default to 'in-en' to avoid foreign legal results
        raw_news = self.searcher.search_web(news_query, max_results=15, region='in-en')
        
        # [FIX] Apply strict keyword filter
        news_hits = self._filter_relevant_news(raw_news)[:5]
        
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

        system_prompt = f"""You are an Expert Indian Legal Assistant. 
        Focus: Indian Constitutional Rights, Christianity, Minorities.
        {topic_context}

        CRITICAL LANGUAGE INSTRUCTION:
        The user has selected: {full_lang}.
        1. You MUST generate your ENTIRE response in {full_lang} script.
        2. Do NOT use English script if the target is {full_lang}.
        3. Translate ALL legal terms, headers, and explanations into {full_lang}.
        
        Structure your answer in {full_lang} using CLEAR NUMBERED LISTS:
        
        **1. Step-by-Step Procedure**
        (Provide a detailed 1, 2, 3... list of actions the user must take)
        
        **2. Legal Basis**
        (Cite specific Acts/Sections)
        
        **3. Documents Required**
        (Bulleted list of documents)
        
        **4. Important Notes**
        (Warnings or additional context)
        
        If context is insufficient, state clearly what is known.
        Always end with a disclaimer in {full_lang}.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o", 
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
            
        return {
            "answer": answer,
            "acts": [{"title": item['title'], "url": item['url'], "snippet": item.get('metadata', {}).get('snippet', '')[:200]} for item in acts_hits],
            "procedures": [{"title": item['title'], "url": item['url'], "snippet": item.get('metadata', {}).get('snippet', '')[:200]} for item in proc_hits],
            "news": [{"title": item['title'], "url": item['url'], "snippet": item.get('metadata', {}).get('snippet', '')[:200]} for item in news_hits],
            "sources": acts_hits + proc_hits
        }

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
