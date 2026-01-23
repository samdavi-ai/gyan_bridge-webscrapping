from datetime import datetime, timedelta
import collections
import concurrent.futures
from .agents import SearchAgents
from .predictor import Predictor

class EventTrendAnalyzer:
    """
    Mines historical news data to identify event trends for a specific topic.
    """
    def __init__(self, llm_engine=None):
        self.agents = SearchAgents()
        self.llm = llm_engine
        self.predictor = Predictor()

    def analyze_trend(self, topic, horizon_days=365*2):
        """
        LLM-Enhanced Trend Analysis with Deep Web Mining.
        """
        print(f"📉 Trend Analyzer (LLM): Mining deep history for '{topic}'...")
        
        # 1. Fetch Deep History - Broader Search Strategy with Query Expansion
        current_year = datetime.now().year
        years_to_scan = [current_year, current_year - 1, current_year - 2]
        
        # Query Expansion: Search for variations
        expansions = [
            f"{topic} statistics {y}",
            f"{topic} report incidents {y}",
            f"{topic} documented cases {y}",
            f"{topic} cumulative data {y}"
        ]
        
        results = []
        # Use concurrent execution for expansion searches to save time
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            for y in years_to_scan:
                for eq in expansions:
                    q = eq.replace("{y}", str(y))
                    # [OPTIMIZATION] Use higher limit for mining (15 per query branch)
                    # [NEW] Default to 'wt-wt' for broad stats, 'in-en' if India mentioned
                    region = 'in-en' if 'india' in topic.lower() else 'wt-wt'
                    futures.append(executor.submit(self.agents.search_ddg, q, 'web', 15, region=region))
            
            for future in concurrent.futures.as_completed(futures):
                try:
                    results.extend(future.result())
                except:
                    pass
        
        # [NEW] Targeted domain deep scan if relevant
        if "india" in topic.lower() or "christian" in topic.lower():
             specific_queries = [
                 "United Christian Forum report violence statistics",
                 "Evangelical Fellowship of India annual persecution data",
                 "International Christian Concern India report statistics"
             ]
             for sq in specific_queries:
                 results += self.agents.search_ddg(sq, 'web', 10, region='in-en')

        # deduplicate results by URL
        unique_results = {r['url']: r for r in results}.values()
        results = list(unique_results)
        
        print(f"📊 Deep Mining: Gathered {len(results)} candidate sources.")

        # 2. Build Context for LLM
        context_lines = []
        for item in results:
            date_str = item.get('published_at', 'Unknown Date')
            text = f"[{date_str}] Title: {item.get('title')} | Snippet: {item.get('snippet')}"
            context_lines.append(text)
            
        # Increased context limit for LLM to 300 snippets (if available)
        full_context = "\n".join(context_lines[:300]) 
        
        # DEBUG: Print what we're sending to LLM
        print(f"📊 DEBUG: Sending {len(context_lines)} snippets to LLM. First 500 chars:")
        print(full_context[:500])
        
        # 3. LLM Extraction
        if self.llm:
            print("🧠 invoking LLM for Data Extraction...")
            extracted_data = self.llm.extract_time_series(topic, full_context)
            print(f"📊 DEBUG: LLM returned {len(extracted_data) if extracted_data else 0} data points")
            if extracted_data:
                print(f"📊 DEBUG: Sample data: {extracted_data[:2]}")
        else:
            extracted_data = []

        # 4. Convert to Standard Time Series Format
        # The LLM gives us [{'date': '...', 'count': N}]
        # We need to ensure dates are standard and return the list.
        series = []
        if extracted_data:
            for item in extracted_data:
                try:
                    d_str = item.get('date', '')
                    # Normalize date to YYYY-MM
                    if len(d_str) == 4: d_str += "-01" # Year only
                    if len(d_str) == 7: d_str += "-01" # YYYY-MM
                    
                    # Basic validation
                    datetime.strptime(d_str, '%Y-%m-%d') # check format
                    
                    series.append({
                        'date': d_str[:7], # YYYY-MM
                        'count': int(item['count'])
                    })
                except:
                    pass
        if not series:
             # Fallback: Return empty structure so API knows we failed
             print("⚠️ LLM found no time-series data. Returning empty set.")
             return {
                 'historical': [],
                 'forecast': [],
                 'stats': {'trend_factor': 0, 'volatility': 0},
                 'context': full_context,
                 'error': "No numerical data found"
             }

        # 5. Generate Forecast
        # We assume if user wants valid data, we should project it.
        print(f"🔮 Generating forecast for {len(series)} data points (Horizon: {horizon_days} days)...")
        prediction_data = self.predictor.generate_forecast(series, topic_filter=topic, horizon_days=horizon_days)
        
        # Return merged result
        return {
            'historical': prediction_data['historical'],
            'forecast': prediction_data['forecast'],
            'stats': prediction_data['stats'],
            'context': full_context
        }
             