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
        LLM-Enhanced Trend Analysis:
        1. Mines data.
        2. Uses LLM to extract precise X,Y coordinates (Date, Count).
        3. Returns time series.
        """
        print(f"📉 Trend Analyzer (LLM): Mining history for '{topic}'...")
        
        # 1. Fetch Deep History - Broader Search Strategy
        # We need a LOT of text for the LLM to process
        # Strategy: Broad National Search + Specific Keyword Search
        current_year = datetime.now().year
        # Search for reports from current and past 2 years to get trend data (e.g. 2024, 2025 if now is 2026)
        years_to_scan = [current_year, current_year - 1, current_year - 2]
        
        results = []
        for y in years_to_scan:
            # Broad search for each year
            query_broad = f"{topic} statistics incidents report {y}" 
            # Use 'web' instead of 'news' to find persistent reports/PDFs which might not be indexed as recent news
            results += self.agents.search_ddg(query_broad, 'web', limit=10)
        
        # If the topic is "India", ensure we explicitly search for "India wide" or "National" if results are thin or tailored
        if "india" in topic.lower():
             # Targeted searches for known data aggregators in this domain
             for y in years_to_scan:
                 results += self.agents.search_ddg(f"United Christian Forum violence against christians {y} report", 'web', limit=5)
                 results += self.agents.search_ddg(f"Evangelical Fellowship of India persecution report {y}", 'web', limit=5)
                 
             results += self.agents.search_ddg(f"{topic} national statistics data", 'web', limit=20)

        if len(results) < 10:
             results += self.agents.search_ddg(f"{topic} news", 'news', limit=30, time_filter='m')

        # 2. Build Context for LLM
        # Concatenate all snippets
        context_lines = []
        for item in results:
            date_str = item.get('published_at', 'Unknown Date')
            text = f"[{date_str}] Title: {item.get('title')} | Snippet: {item.get('snippet')}"
            context_lines.append(text)
            
        full_context = "\n".join(context_lines[:200]) # Increased context limit slightly
        
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
