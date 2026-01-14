from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import re
from datetime import datetime
from dotenv import load_dotenv
# Fix imports since we moved files
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.orchestrator import Orchestrator
from src.scraper import UniversalScraper
from src.news_feeder import NewsFeeder
from src.extractor import ContentExtractor
from src.analytics import AnalyticsEngine
from src.analysis import EventTrendAnalyzer
from src.predictor import Predictor
from src.rag_engine import RAGEngine
from src.llm_analytics import LLMAnalytics
from src.legal_engine import LegalAssistant

from dotenv import load_dotenv, dotenv_values

# CRITICAL FIX: Force override system environment variables
# Load from the directory where api.py is located (server/.env)
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path, override=True)

# Double-check: Explicitly set the API key from .env to prevent any caching issues
env_values = dotenv_values(dotenv_path)
if 'OPENAI_API_KEY' in env_values:
    os.environ['OPENAI_API_KEY'] = env_values['OPENAI_API_KEY']
    print(f"✅ OpenAI API Key loaded: {env_values['OPENAI_API_KEY'][:15]}...{env_values['OPENAI_API_KEY'][-10:]}")
else:
    print("⚠️  WARNING: OPENAI_API_KEY not found in .env file!")


app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

from src.video_engine import VideoEngine

# Initialize RAG & LLM
rag_engine = RAGEngine()
llm_analytics = LLMAnalytics(rag_engine)

# Initialize core components
orchestrator = Orchestrator()
scraper = UniversalScraper()
# NewsFeeder now powers the RAG with live data
news_feeder = NewsFeeder(rag_engine)

# Initialize Video Engine (New Architecture)
video_engine = VideoEngine()

# [FIX] Prevent Double Background Worker with Flask Reloader
# Only start the worker in the child process (WERKZEUG_RUN_MAIN='true') 
# or if reloader is disabled (not typical in debug=True default).
# [MOVED] Worker start moved to __main__ block to ensure execution in non-debug mode
# if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
#     print("🚀 Starting VideoEngine Background Worker...")
#     video_engine.start_background_worker()

# Inject LLM into Analyzer
analyzer = EventTrendAnalyzer(llm_analytics)

@app.route('/')
def home():
    return render_template('index.html')



@app.route('/api/search', methods=['POST'])
def search_endpoint():
    data = request.json
    topic = data.get('topic')
    intents = data.get('intents', ['general'])
    limit = int(data.get('limit', 100))
    time_filter = data.get('time_filter')
    use_quota = data.get('use_quota', True)
    search_type = data.get('type', 'web') # 'web', 'news', 'video'
    
    if not topic:
        return jsonify({"error": "Topic is required"}), 400

    # 1. Video Search
    if search_type == 'video':
        try:
            results = video_engine.search(topic, limit=limit)
            return jsonify({"results": results, "count": len(results), "errors": []})
        except Exception as e:
            return jsonify({"results": [], "errors": [str(e)], "count": 0}), 500

    # 2. News Search
    elif search_type == 'news':
        try:
             results = news_feeder.search(topic, limit=limit)
             return jsonify({"results": results, "count": len(results), "errors": []})
        except Exception as e:
             return jsonify({"results": [], "errors": [str(e)], "count": 0}), 500

    # 3. General Web Search (Orchestrator)
    # Keys setup
    serpapi_key = os.getenv("SERPAPI_KEY") if use_quota else None
    keys = {'serpapi': serpapi_key}

    print(f"📡 API: Searching '{topic}' (Type: {search_type})...")
    
    try:
        results, errors = orchestrator.run(
            topic, 
            active_intents=intents, 
            limit=limit, 
            time_filter=time_filter, 
            keys=keys
        )
    except Exception as e:
        print(f"🔥 BLOCKING ERROR: {e}")
        return jsonify({"results": [], "errors": [f"Critical Orchestrator Failure: {str(e)}"], "count": 0}), 500
    
    # Process results to ensure frontend friendliness (add image placeholders if needed)
    processed = []
    for r in results:
        # If no image explicitly found, we might add a favicon fallback logic in frontend or here
        processed.append({
            'title': r.get('title') or 'Untitled Result',
            'url': r.get('url') or r.get('href') or r.get('link') or '#',
            'snippet': r.get('snippet') or '',
            'source': r.get('source_type', 'web'),
            'engine': r.get('engine', 'unknown'),
            'image': r.get('image'), 
            'published_at': r.get('published_at'),
            'geo_tier': r.get('_geo_tier', 'Global'),
            'debug_score': r.get('_hybrid_score', 0)
        })

    if not processed and not errors:
        errors.append("No results found. Try broadening your search or enabling more sources.")

    return jsonify({
        "results": processed,
        "errors": errors,
        "count": len(processed)
    })

@app.route('/api/scrape', methods=['POST'])
def scrape_endpoint():
    data = request.json
    item = data.get('item')
    if not item: 
         return jsonify({"error": "Item required"}), 400
         
    print(f"🕷️ API: Scraping {item.get('url')}...")
    try:
        scraped = scraper.scrape_item(item)
        
        # RAG Ingestion
        if scraped.get('content'):
            # Scrape thread usually returns dict, let's ensure we ingest valid text
            rag_engine.ingest(
                scraped['content'], 
                metadata={
                    "source": item.get('url'), 
                    "title": item.get('title', 'Unknown'),
                    "type": item.get('source_type', 'web')
                }
            )
            print("  💾 RAG: Ingested scraped content.")
            
        return jsonify(scraped)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/news', methods=['GET'])
def news_endpoint():
    """Fetch live Christian news"""
    try:
        articles = news_feeder.get_news(limit=1000)
        return jsonify(articles)
    except Exception as e:
        print(f"News Error: {e}")
        return jsonify([]), 500

@app.route('/api/videos', methods=['GET'])
def videos_endpoint():
    """Fetch trending Christian videos (From Local DB)"""
    try:
        # Use new VideoEngine with SQLite backend
        videos = video_engine.get_trending(limit=50)
        return jsonify(videos)
    except Exception as e:
        print(f"Video Error: {e}")
        return jsonify([]), 500

@app.route('/api/extract', methods=['POST'])
def extract_endpoint():
    """Reader Mode: Extract text AND track view"""
    data = request.json
    url = data.get('url')
    topic = data.get('topic', '') # Optional: Triggering topic
    
    if not url: return jsonify({"error": "URL required"}), 400
    
    try:
        # 1. Track View (Real Metric)
        views = analytics.track_view(url, topic)
        
        # 2. Extract Content
        content = extractor.extract(url)
        content['views'] = views # Return updated view count to frontend
        
        return jsonify(content)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# Initialize Analytics and Predictor
analytics = AnalyticsEngine()
predictor = Predictor()
legal_assistant = LegalAssistant()
extractor = ContentExtractor()


@app.route('/api/admin/stats', methods=['GET'])
def admin_stats_endpoint():
    """Admin Dashboard Data + Predictions"""
    stats = analytics.get_weekly_stats()
    
    # Prediction Parameters
    topic = request.args.get('topic')
    horizon = int(request.args.get('horizon', 7))
    
    # 1. Select Data Source
    if topic and topic != 'all':
        # External Mining (LLM Enhanced)
        # Use the global 'analyzer' instance we created
        raw_series = analyzer.analyze_trend(topic)
        topic_label = topic
    else:
        # Internal App Usage
        raw_series = stats.pop('raw_series', [])
        topic_label = 'App Views'
        
    # 2. Generate Forecast
    # Predictor expects [{'date': 'YYYY-MM-DD', 'count': N}]
    try:
        prediction_data = predictor.generate_forecast(raw_series, topic_filter=topic_label, horizon_days=horizon)
        stats['prediction'] = prediction_data
    except Exception as e:
        import traceback
        with open("error.log", "w") as f:
            traceback.print_exc(file=f)
        print(f"Prediction Error: {e}")
        stats['prediction'] = {'error': str(e)}

    return jsonify(stats)

@app.route('/api/admin/login', methods=['POST'])
def admin_login_endpoint():
    """Admin Authentication"""
    data = request.json
    password = data.get('password')
    # Simple hardcoded check
    if password == 'admin':
        return jsonify({"success": True, "token": "valid_session"})
    return jsonify({"error": "Invalid Password"}), 401

@app.route('/api/admin/content', methods=['GET'])
def admin_content_endpoint():
    """Admin: Get all content for moderation"""
    try:
        # Videos
        all_videos = video_engine.get_all_videos()
        # News
        all_news = news_feeder.get_all_news()
        
        return jsonify({
            "videos": all_videos,
            "news": all_news
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/content/toggle', methods=['POST'])
def admin_toggle_endpoint():
    """Admin: Approve/Reject Content"""
    data = request.json
    item_id = data.get('id')
    item_type = data.get('type')
    status = data.get('status') # boolean
    
    if not item_id: return jsonify({"error": "ID required"}), 400
    
    try:
        if item_type == 'video':
            video_engine.toggle_approval(item_id, status)
            return jsonify({"success": True})
        elif item_type == 'news':
            news_feeder.toggle_approval(item_id, status)
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Unknown type"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/forecast', methods=['GET'])
def admin_forecast_endpoint():
    """Returns data-driven forecast based on web mining"""
    horizon = request.args.get('horizon', '1 Year')
    topic = request.args.get('topic', 'church attacks in india')  # Default topic
    
    try:
        # Calculate horizon in days
        horizon_years = int(re.search(r'\d+', horizon).group()) if re.search(r'\d+', horizon) else 1
        horizon_days = horizon_years * 365
        
        # Use Event Trend Analyzer to mine real data from the web (with specific horizon)
        mining_result = analyzer.analyze_trend(topic, horizon_days=horizon_days)
        
        if not mining_result or not mining_result.get('historical'):
            # Fallback: Return simple structure
            return jsonify({
                "growth": "N/A",
                "impact_score": "N/A",
                "confidence": "0%",
                "volatility": "Unknown",
                "trend": "Insufficient Data",
                "reason": "Mining Failed - No numerical data found in search results."
            })
        
        # Extract prediction data
        historical = mining_result['historical']
        forecast = mining_result['forecast']
        stats = mining_result['stats']
        
        # Calculate growth from latest historical to forecast
        if historical and forecast:
            latest_actual = historical[-1]['count']
            
            # Find the forecast year closest to requested horizon
            horizon_years = int(re.search(r'\d+', horizon).group()) if re.search(r'\d+', horizon) else 1
            current_year = datetime.now().year
            target_year = current_year + horizon_years
            
            # Find closest forecast
            closest_forecast = None
            for f in forecast:
                if int(f['date']) == target_year:
                    closest_forecast = f
                    break
            
            if not closest_forecast and forecast:
                closest_forecast = forecast[-1]  # Use last forecast
            
            if closest_forecast:
                forecast_value = closest_forecast['prediction']
                growth_pct = ((forecast_value - latest_actual) / latest_actual * 100) if latest_actual > 0 else 0
                
                # Format response to match frontend expectations
                # Type safety: historical might not be a list
                historical_count = len(historical) if isinstance(historical, list) else 0
                return jsonify({
                    "growth": f"{growth_pct:+.0f}%",
                    "impact_score": f"{stats.get('trend_factor', 1.0) * 5:.1f}",  # Scale to 0-10
                    "confidence": f"{int(stats.get('r_squared', 0.5) * 100)}%",
                    "volatility": "High" if stats.get('volatility', 0) > 50 else "Medium" if stats.get('volatility', 0) > 20 else "Low",
                    "trend": "Rising" if stats.get('trend_factor', 1.0) > 1.0 else "Stable" if stats.get('trend_factor', 1.0) > 0.95 else "Declining",
                    "reason": f"Based on {historical_count} real data points. Trend factor: {stats.get('trend_factor', 1.0):.2f}x",
                    "baseline": latest_actual,  # Add baseline for frontend
                    "projected": int(forecast_value)  # Add projected value
                })
        
        # Fallback
        return jsonify({
            "growth": "N/A",
            "impact_score": "N/A",
            "confidence": "0%",
            "volatility": "Unknown",
            "trend": "Unknown",
            "reason": "Forecast data incomplete. Unable to generate prediction."
        })
        
    except Exception as e:
        import traceback
        with open("error.log", "w") as f:
            traceback.print_exc(file=f)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/analytics/query', methods=['POST'])
def admin_analytics_query():
    """Enhanced Analytics Query - Prioritizes Real-World Data Mining"""
    data = request.json
    query = data.get('query')
    topic_context = data.get('topic_context')
    
    if not query:
        return jsonify({"error": "Query is required"}), 400
        
    print(f"🧠 Analysis: Processing query: '{query}'...")
    
    try:
        # STRATEGY SELECTOR
        # If user asks for numbers, stats, or specific counts, we MUST use the EventTrendAnalyzer (Web Miner)
        # RAG is often too old or qualitative.
        triggers = ['how many', 'number of', 'count', 'stat', 'attacks', 'incidents', 'trend', 'graph', 'chart']
        needs_hard_data = any(t in query.lower() for t in triggers)
        
        if needs_hard_data:
             print(f"📉 Query implies need for HARD DATA. Prioritizing Web Mining over RAG...")
             # 1. Mine Data & Generate Forecast (All in one)
             # This now returns a dict {'historical': [], 'forecast': [], 'stats': {}}
             # 1. Mine Data & Generate Forecast (All in one)
             # Default to 5 years for Analytics Graphs to look good
             mining_result = analyzer.analyze_trend(query, horizon_days=365*5)
             
             if mining_result and mining_result.get('historical'):
                 # Format for Frontend RAGChart
                 # We need to combine historical and forecast for the chart
                 historical = mining_result['historical']
                 forecast = mining_result['forecast']
                 
                 # Type Safety: Ensure they're lists
                 if not isinstance(historical, list):
                     historical = []
                 if not isinstance(forecast, list):
                     forecast = []
                 
                 # Prepare Chart Data
                 combined_data = []
                 
                 # Add Historical
                 for h in historical:
                     if isinstance(h, dict) and 'date' in h and 'count' in h:
                         combined_data.append({"x": h['date'], "y": h['count'], "type": "historical"})
                     
                 # Add Forecast
                 for f in forecast:
                      # Avoid double plotting the anchor point if it's the same
                      if isinstance(f, dict) and 'date' in f and 'prediction' in f:
                          combined_data.append({"x": f['date'], "y": f['prediction'], "type": "forecast"})
                 
                 response = {
                     "graph_type": "line",
                     "title": f"Analytics & Forecast: {query.title()}",
                     "xaxis_label": "Timeline",
                     "yaxis_label": "Incidents",
                     "data": combined_data,
                     "insight": f"Analysis based on {len(historical)} real-world data points found on the web. " +
                                f"Trend is projected to be {mining_result['stats'].get('trend_factor', 1.0):.1f}x baseline. " + 
                                f"Volatility is {mining_result['stats'].get('volatility', 0):.1f}."
                 }
                 return jsonify(response)
                 
             # FALLBACK: If we have Context but no Numbers, use LLM for Qualitative Analysis
             # FALLBACK: If we have Context but no Numbers, OR if context is missing, force Qualitative Analysis
             else:
                  print("⚠️ Web Mining yielded no numbers. Using Fallback Strategy...")
                  context = mining_result.get('context', "") if mining_result else ""
                  
                  if not context or len(context) < 100:
                       context = f"Insufficient web data found for '{query}'. Please USE INTERNAL KNOWLEDGE to estimate trends based on general history."
                       
                  # Pass the context (or the override) directly to LLM
                  result = llm_analytics.analyze_and_graph(query, topic_context, direct_context=context)
                  return jsonify(result)
        
        # STEP 2: Fallback to RAG if Web Mining failed or wasn't needed
        # Check RAG for existing data
        context_docs = rag_engine.search(query, k=10)
        
        # If RAG has data, use LLM to analyze it
        if context_docs:
            result = llm_analytics.analyze_and_graph(query, topic_context)
            return jsonify(result)
        else:
            return jsonify({"error": "No data found in RAG or Web Search."}), 404
        
    except Exception as e:
        import traceback
        with open("error.log", "w") as f:
            traceback.print_exc(file=f)
        traceback.print_exc()
        print(f"Analysis Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/analytics/query', methods=['POST'])
def analytics_query():
    data = request.json
    query = data.get('query')
    
    if not query:
        return jsonify({"error": "Query is required"}), 400

    print(f"📊 APIs: Generating Hybrid Analytics for '{query}'...")
    
    try:
        # STEP 1: Perform Live Search
        # We limit to 10 results for speed, just to get context
        print("   -> Fetching live web context...")
        live_results, _ = orchestrator.run(query, limit=10, active_intents=['general', 'news'])
        
        # Extract text content from live results
        live_texts = []
        for r in live_results:
            text = f"{r.get('title', '')}: {r.get('snippet', '')}"
            if len(text) > 20: # Filter empty/short junk
                live_texts.append(text)
                
        # STEP 2: Hybrid RAG (Live + DB)
        print("   -> Vectorizing & Merging contexts...")
        # Use our new hybrid search
        hybrid_context_docs = rag_engine.search_hybrid(query, live_texts, k=5)
        
        # Extract just the content for the LLM
        context_str = "\n\n".join([f"[{doc['source'].upper()}] {doc['content']}" for doc in hybrid_context_docs])
        
        # STEP 3: Generate Analysis
        print("   -> generating graph...")
        # Pass the rich hybrid context explicitly
        result = llm_analytics.analyze_and_graph(query, direct_context=context_str)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"🔥 Analytics Error: {e}")
        import traceback
        traceback.print_exc()
        # Return a soft fallback if generation fails
        return jsonify({
            "error": str(e),
            "graph_type": "bar",
            "title": f"Projected Trends: {query}",
            "data": [{"x": "Error", "y": 0}], 
            "insight": f"Analysis failed due to: {str(e)}"
        })

@app.route('/api/legal/ask', methods=['POST'])
def ask_legal():
    data = request.json
    query = data.get('query')
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    try:
        result = legal_assistant.ask(query)
        return jsonify(result)
    except Exception as e:
        print(f"Legal API Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Ensure templates are auto-reloaded
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    
    port = int(os.environ.get('PORT', 5001))
    
    # Start Video Worker (Since we are running directly with debug=False)
    print("🚀 Starting VideoEngine Background Worker...")
    video_engine.start_background_worker()
    
    app.run(host='0.0.0.0', port=port, debug=False)
