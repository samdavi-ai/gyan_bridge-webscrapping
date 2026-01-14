import os
import json
from openai import OpenAI
from src.searcher import DiscoveryEngine

class LegalAssistant:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
             print("⚠️ No OPENAI_API_KEY found. Legal Assistant may fail.")
        self.client = OpenAI(api_key=self.api_key)
        self.searcher = DiscoveryEngine()
        
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

    def ask(self, query):
        """
        Main entry point.
        Returns structured data with categories:
        - acts: List of relevant Acts/Statutes
        - procedures: List of procedural guides
        - news: Related news articles
        - answer: LLM-generated summary
        """
        print(f"⚖️ Legal Assistant: Analyzing '{query}'...")
        
        # 1. Search for Acts and Statutes
        acts_hits = self._search_acts(query)
        
        # 2. Search for Procedures
        proc_hits = self._search_procedures(query)
        
        # 3. Search for Related News (Christian legal news)
        # [FIX] More specific query to avoid generic results like "C-DAC"
        news_query = f"{query} (court OR law OR rights OR persecution) India news"
        
        # [FIX] Force Indian region and fetch more to allow filtering
        raw_news = self.searcher.search_web(news_query, max_results=10, region='in-en')
        
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
        system_prompt = """You are an expert Indian Legal Assistant specializing in Constitutional Rights with a focus on Christian Minority contexts.
        Your goal is to provide a clear, actionable guide based strictly on the provided context.
        
        Structure your answer in Markdown:
        1. **Legal Basis**: Cite the specific Acts, Sections, or Articles found in the context (High Priority).
        2. **Procedure**: Step-by-step practical guide.
        3. **Documents Required**: Bulleted list.
        4. **Important Notes**: Key considerations and warnings.
        
        If the context is insufficient, state clearly what is known and what is missing. Do not invent laws.
        Always end with: "⚠️ This is for informational purposes only and not professional legal advice."
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
            print(f"❌ LLM Error: {e}")
            answer = "I'm sorry, I encountered an error while synthesizing the legal data. Please try again later."
            
        return {
            "answer": answer,
            "acts": [{"title": item['title'], "url": item['url'], "snippet": item.get('metadata', {}).get('snippet', '')[:200]} for item in acts_hits],
            "procedures": [{"title": item['title'], "url": item['url'], "snippet": item.get('metadata', {}).get('snippet', '')[:200]} for item in proc_hits],
            "news": [{"title": item['title'], "url": item['url'], "snippet": item.get('metadata', {}).get('snippet', '')[:200]} for item in news_hits],
            "sources": acts_hits + proc_hits
        }
