from dotenv import load_dotenv, dotenv_values
import os
import sys

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass  # Fallback if reconfigure fails

# Load .env BEFORE other imports to ensure TF/Env vars are set
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path)

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import re
import requests
import json
from datetime import datetime
# Fix imports since we moved files
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.orchestrator import Orchestrator
# from src.scraper import UniversalScraper  <-- Removed to consolidate logic
from src.news_feeder import NewsFeeder
from src.extractor import ContentExtractor
from src.translator import ContentTranslator
from src.refiner import QueryRefiner
from src.search_utils import sanitize_query


# Double-check: Explicitly set the API key from .env to prevent any caching issues
env_values = dotenv_values(dotenv_path)
if 'OPENAI_API_KEY' in env_values:
    os.environ['OPENAI_API_KEY'] = env_values['OPENAI_API_KEY']
    # [SECURITY] Removed API key from logs to prevent information disclosure
    print("✅ OpenAI API Key loaded from .env file")
else:
    print("⚠️  WARNING: OPENAI_API_KEY not found in .env file!")


app = Flask(__name__, static_folder='../client/dist', static_url_path='/')
CORS(app)

from src.auth_routes import auth_bp
app.register_blueprint(auth_bp, url_prefix='/api/auth')

from src.video_engine import VideoEngine
from src.topic_manager import topic_manager

# Initialize core components (Lightweight)
orchestrator = Orchestrator()
# scraper = UniversalScraper() <-- Removed
extractor = ContentExtractor()
news_feeder = NewsFeeder(None) # RAG injected later
news_feeder.start_background_worker()

video_engine = VideoEngine()
video_engine.start_background_worker()

api_key = os.environ.get('OPENAI_API_KEY', '').strip()
translator = ContentTranslator(api_key=api_key)

# Query refinement helper (LLM-powered)
query_refiner = QueryRefiner()

# Global Placeholders for Heavy ML Components
rag_engine = None
llm_analytics = None
analyzer = None
predictor = None
legal_assistant = None
analytics = None
discovery_engine = None

import threading
def _load_heavy_models():
    global rag_engine, llm_analytics, analyzer, predictor, legal_assistant, analytics
    print("⏳ [API] Background Loading Heavy ML Models...")
    
    from src.analytics import AnalyticsEngine
    from src.analysis import EventTrendAnalyzer
    from src.predictor import Predictor
    from src.rag_engine import RAGEngine
    from src.llm_analytics import LLMAnalytics
    from src.legal_engine import LegalAssistant
    
    from src.searcher import DiscoveryEngine
    
    analytics = AnalyticsEngine()
    predictor = Predictor()
    rag_engine = RAGEngine()
    discovery_engine = DiscoveryEngine()
    llm_analytics = LLMAnalytics(rag_engine, discovery_engine=discovery_engine)
    
    # Inject dependencies
    news_feeder.rag_engine = rag_engine
    analyzer = EventTrendAnalyzer(llm_analytics)
    legal_assistant = LegalAssistant()
    
    print("✅ [API] Heavy ML Models Loaded & Ready.")

# Start loading in background
threading.Thread(target=_load_heavy_models, daemon=True).start()

# [NEW] Trigger immediate content fetch on startup
def _trigger_initial_fetch():
    print("🔄 [Startup] Triggering initial content fetch...")
    try:
        news_feeder.update_news()
        # [FIX] populate_db was undefined, using force_update
        video_engine.force_update()
        print("✅ [Startup] Initial fetch complete.")
    except Exception as e:
        print(f"⚠️ [Startup] Initial fetch failed: {e}")
        import traceback
        traceback.print_exc()

threading.Thread(target=_trigger_initial_fetch, daemon=True).start()


# Define Base Directory for Absolute Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

# [FIX] Ensure Analytics Data Exists on Startup
def _ensure_analytics_file():
    path = os.path.join(DATA_DIR, 'latest_analysis.json')
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    if not os.path.exists(path):
        print("⚠️ [Startup] 'latest_analysis.json' missing. Creating default...")
        default_data = {
            "graph_type": "bar",
            "title": "Welcome to Analytics",
            "insight": "Start searching to see real-time AI insights here.",
            "summary": "Welcome! Start searching to generate intelligence reports.",
            "sentiment_score": 0,
            "key_entities": ["GyanBridge"],
            "sources": [],
            "data": [{"x": "Start", "y": 100}],
            "timestamp": datetime.now().timestamp()
        }
        with open(path, 'w') as f:
            json.dump(default_data, f)

_ensure_analytics_file()

# Serve React App
@app.route('/')
def home():
    return app.send_static_file('index.html')

# Catch-all for React Router
@app.errorhandler(404)
def not_found(e):
    return app.send_static_file('index.html')



@app.route('/health')
def health():
    return jsonify({"status": "running", "uptime": "ok"})

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response
def health_check():
    return jsonify({"status": "ok", "service": "GyanBridge API"}), 200

@app.route('/api/trending', methods=['GET'])
def trending_endpoint():
    """Fetch 4-5 trending topics/news titles for the dashboard."""
    try:
        # Get latest news from DB
        all_news = news_feeder.get_news(limit=20)
        
        # Shuffle to provide variety as requested by "Try something new"
        import random
        random.shuffle(all_news)
        
        # Select 4-5 unique titles
        results = []
        seen_titles = set()
        for item in all_news:
            title = item['title'].split(' - ')[0].split(' | ')[0] # Clean source branding
            if title not in seen_titles and len(title.split()) > 3: # Ensure it looks like a topic
                results.append({"title": title})
                seen_titles.add(title)
            if len(results) >= 4:
                break
        
        # Fallback if news feed is light
        if len(results) < 4:
            fallbacks = [
                "Minority rights in Indian Constitution",
                "History of Article 30 and its impact",
                "Christian educational institutions in Tamil Nadu",
                "Global perspective on religious freedom",
                "Digital transformation in modern churches"
            ]
            for f in fallbacks:
                if f not in seen_titles:
                    results.append({"title": f})
                    seen_titles.add(f)
                if len(results) >= 4:
                    break

        return jsonify({"results": results[:4]})
    except Exception as e:
        return jsonify({"error": str(e), "results": []}), 500

@app.route('/api/search', methods=['POST'])
def search_endpoint():
    data = request.json
    
    # Input validation
    if not data:
        return jsonify({"error": "Invalid request body"}), 400
    
    topic = data.get('topic', '').strip()
    if not topic:
        return jsonify({"error": "Topic is required"}), 400
    
    # Sanitize and validate topic length
    topic = sanitize_query(topic, max_length=500)
    if not topic:
        return jsonify({"error": "Invalid topic after sanitization"}), 400
    
    # Extract and validate other parameters
    try:
        intents = data.get('intents', ['general'])
        limit = int(data.get('limit', 100))
        time_filter = data.get('time_filter')
        use_quota = data.get('use_quota', True)
        search_type = data.get('type', 'web')  # 'web', 'news', 'video'
        lang = data.get('lang', 'en')
        
        # Validate limits
        if limit < 1 or limit > 200:
            limit = 100
        
        # Validate search type
        if search_type not in ['web', 'news', 'video', 'legal']:
            search_type = 'web'
            
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid parameter: {str(e)}"}), 400
    
    # ==========================================
    # CRITICAL: NO TOPIC FILTERING FOR USER SEARCHES
    # ==========================================
    # Topic filtering via Super Admin controls should ONLY apply to 
    # curated feeds (/api/news, /api/videos), NOT to explicit user searches.
    # User searches MUST search the entire internet without restrictions.
    # ==========================================

    # Optional: LLM-powered refinement for certain types
    # Optional: LLM-powered refinement (DISABLED by User Request for Direct Search)
    refined_topic = topic
    # if search_type in ['news', 'video']:
    #     try:
    #         refined_topic = query_refiner.refine(topic)
    #     except Exception as e:
    #         refined_topic = topic

    # 1. Video Search
    if search_type == 'video':
        try:
            # If non-English, perform live localized search
            if lang != 'en':
                results = video_engine.search(refined_topic, limit=limit, lang=lang)
            else:
                # Use raw topic for maximum coverage
                results = video_engine.search(refined_topic, limit=limit)
            return jsonify({"results": results, "count": len(results), "errors": []})
        except Exception as e:
            return jsonify({"results": [], "errors": [str(e)], "count": 0}), 500

    # 2. News Search
    elif search_type == 'news':
        try:
             # Use refined topic for better coverage
             search_query = refined_topic
             if lang != 'en':
                 results = news_feeder.search(search_query, limit=limit, lang=lang)
             else:
                 results = news_feeder.search(search_query, limit=limit)

             # Trigger Background Analysis on this Topic
             threading.Thread(target=_run_background_analysis, args=(topic, results)).start()

             return jsonify({"results": results, "count": len(results), "errors": []})
        except Exception as e:
             return jsonify({"results": [], "errors": [str(e)], "count": 0}), 500

    # 3. Legal Search (Specialized Agent)
    elif search_type == 'legal':
        if not legal_assistant:
            return jsonify({"error": "Legal Assistant is still loading. Please try again in a moment."}), 503
        
        print(f"⚖️ API: Directing '{topic}' to Legal Assistant (Lang: {lang})")
        result = legal_assistant.ask(topic, lang=lang)
        
        # [JURIS VOICE MODE] Generate audio response
        if result.get('answer'):
            try:
                clean_answer = result['answer']
                for token in ['[UI:SHOW_CITATION_CARD]', '[UI:OPEN_CONTACT_FORM]', '[UI:ENABLE_MIC]']:
                    clean_answer = clean_answer.replace(token, '')
                
                audio_bytes = legal_assistant.speak(clean_answer.strip(), lang=lang)
                if audio_bytes:
                    import base64
                    result['audio_base64'] = base64.b64encode(audio_bytes).decode('utf-8')
            except Exception as ex:
                print(f"⚠️ Audio Gen Error: {ex}")

        return jsonify(result)

    # 3. General Web Search (Orchestrator + Comprehensive Fallback)
    # Keys setup
    serpapi_key = os.getenv("SERPAPI_KEY") if use_quota else None
    keys = {'serpapi': serpapi_key}

    print(f"📡 API: Searching '{topic}' (Type: {search_type})...")
    
    results = []
    errors = []
    
    try:
        # Primary: Orchestrator (Parallel multi-intent search)
        results, errors = orchestrator.run(
            topic, 
            active_intents=intents, 
            limit=limit, 
            time_filter=time_filter, 
            keys=keys
        )
    except Exception as e:
        print(f"⚠️ Orchestrator Error: {e}")
        errors.append(f"Orchestrator failed: {str(e)}")

    # [NEW] Trigger Background Analysis for Web Search too (User Request)
    if results:
        threading.Thread(target=_run_background_analysis, args=(topic, results)).start()

    # [NEW] Robust Fallback Strategy
    # If orchestrator found very few results or failed, trigger DiscoveryEngine for a deep scan
    if len(results) < 10 and discovery_engine:
        print(f"🔄 API: Low results ({len(results)}). Triggering DiscoveryEngine fallback...")
        try:
            # For general internet search, we don't want to force trusted religious sources
            fallback_results = discovery_engine.discover(topic, max_results=limit, include_trusted=False)
            
            # Normalize DiscoveryEngine results to match Orchestrator schema
            normalized_fallback = []
            for r in fallback_results:
                normalized_fallback.append({
                    'title': r.get('title'),
                    'url': r.get('url'),
                    'snippet': r.get('metadata', {}).get('snippet') or r.get('metadata', {}).get('description', ''),
                    'source_type': r.get('source_type', 'web'),
                    'engine': 'DiscoveryEngine',
                    'image': r.get('image')
                })
            
            # Combine and deduplicate
            from src.search_utils import deduplicate_results
            results.extend(normalized_fallback)
            results = deduplicate_results(results, key='url')
            print(f"✅ Fallback Complete. Total results now: {len(results)}")
        except Exception as fe:
            print(f"⚠️ Fallback Error: {fe}")
            errors.append(f"Fallback search failed: {str(fe)}")
    
    # Process results to ensure frontend friendliness
    processed = []
    for r in results:
        processed.append({
            'title': r.get('title') or 'Untitled Result',
            'url': r.get('url') or r.get('href') or r.get('link') or '#',
            'snippet': r.get('snippet') or '',
            'source': r.get('source_type', 'web'),
            'engine': r.get('engine', 'unknown'),
            'image': r.get('image'), 
            'published': r.get('published_at') or r.get('published'),
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
        # scraped = scraper.scrape_item(item) <-- Deprecated
        # Use lightweight Extractor instead
        content = extractor.extract(item.get('url'))
        scraped = {'content': content, 'error': None if content else "Failed to extract"}
        
        # RAG Ingestion
        if scraped.get('content') and rag_engine:
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

# --- Analytics Background System ---
def _run_background_analysis(query, results):
    """Run LLM analysis in background and save to file"""
    try:
        if not llm_analytics:
            # If models aren't loaded yet, wait a bit or direct load
            print("⏳ [Analytics] Waiting for models to load...")
            import time
            time.sleep(2)
            if not llm_analytics:
                print("❌ [Analytics] Models still not loaded. Aborting.")
                return

        
        # Extract snippets for context
        snippets = []
        for r in results[:15]: # Increased context
            txt = r.get('snippet') or r.get('description', '')
            if txt: snippets.append(f"Source: {r.get('title')}\n{txt}")
            
        direct_context = "\n\n".join(snippets)
        print(f"🧠 [Analytics] Starting analysis for '{query}'...")
        
        report = llm_analytics.analyze_and_graph(query, direct_context=direct_context)
        
        # Save to file
        if report and 'error' not in report:
            with open(os.path.join(DATA_DIR, 'latest_analysis.json'), 'w') as f:
                json.dump(report, f)
            print(f"✅ [Analytics] Report generated for '{query}'.")
        else:
             print(f"⚠️ [Analytics] Generation returned error or empty: {report}")

    except Exception as e:
        print(f"❌ [Analytics] Analysis failed: {e}")
        import traceback
        traceback.print_exc()

@app.route('/api/analytics/report', methods=['GET'])
def analytics_report():
    """Get the latest analysis report"""
    try:
        report_path = os.path.join(DATA_DIR, 'latest_analysis.json')
        if os.path.exists(report_path):
            with open(report_path, 'r') as f:
                return jsonify(json.load(f))
    except:
        pass
    return jsonify({"error": "No analysis available. Search for a topic first."})


@app.route('/api/news', methods=['GET'])
def news_endpoint():
    """Fetch live Christian news (Localized or Cached)"""
    try:
        lang = request.args.get('lang', 'en')
        # Explicit search query from UI (dashboard/news search bar)
        query = request.args.get('q', '').strip()

        # If user provided a search query, we treat this as an explicit search
        # and DO NOT restrict by Super Admin topics (similar to /api/search behaviour).
        if query:
            search_q = sanitize_query(query)
            if not search_q:
                return jsonify([])  # Invalid/empty after sanitization

            try:
                # LLM-powered refinement before hitting Google News
                if query_refiner and query_refiner.llm:
                    refined_q = query_refiner.refine(search_q)
                else:
                    refined_q = search_q
                    print("⚠️ QueryRefiner not available, using raw query")
            except Exception as e:
                print(f"⚠️ News query refinement failed, using raw query. Error: {e}")
                refined_q = search_q

            print(f"🔍 [News Search] Query: '{query}' -> Refined: '{refined_q}'")
            # Perform comprehensive search and scraping
            articles = news_feeder.search(refined_q, limit=20, lang=lang)
            print(f"✅ [News Search] Found {len(articles)} articles from Google News RSS")
            
            # [ENHANCED] Also scrape content snippets for better relevance
            # This ensures we have full content available for reader mode
            if articles and rag_engine:
                print(f"📚 [News Search] Ingesting {len(articles)} articles into RAG for better search...")
                for article in articles[:10]:  # Limit to top 10 for performance
                    try:
                        # Extract snippet for RAG ingestion
                        snippet = article.get('snippet', '') or article.get('summary', '')
                        if snippet:
                            rag_engine.ingest(
                                f"{article.get('title', '')}\n{snippet}",
                                metadata={
                                    "source": article.get('url', ''),
                                    "title": article.get('title', 'Unknown'),
                                    "type": "news_search",
                                    "query": refined_q
                                }
                            )
                    except Exception as e:
                        print(f"⚠️ RAG ingestion failed for article: {e}")
                        pass

            # Translate if needed
            if lang != 'en' and articles:
                try:
                    for a in articles:
                        if 'summary' in a:
                            a['snippet'] = a['summary']
                    articles = translator.translate_batch(articles, lang)
                except Exception as e:
                    print(f"Translation error (news search): {e}")

            # Normalize snippet/summary fields
            for a in articles:
                if 'snippet' in a:
                    a['summary'] = a['snippet']

            return jsonify(articles)

        # [STRICT TOPIC FILTERING] Only show content from active topics selected by Super Admin
        topic_query = topic_manager.get_active_topic_query()
        active_topics = topic_manager.get_active_keywords()
        
        articles = []
        
        # STRICT MODE: If topics are selected, ONLY show content from those topics
        if active_topics:
            if topic_query:
                # Search specific active topics only
                try:
                    articles = news_feeder.get_news_by_language(lang, topic_query=topic_query)
                    print(f"✅ [News Feed] Strict topic filtering: Found {len(articles)} articles for topics: {active_topics}")
                except Exception as e:
                    print(f"⚠️ [News Feed] Topic search failed: {e}")
                    articles = []
            
            # If no results from search, try DB but filter by active topics
            if not articles:
                try:
                    all_db_news = news_feeder.get_news(limit=100)  # Get more to filter
                    # Filter by active topics
                    filtered_articles = []
                    
                    # Define loose keywords for specific topics
                    topic_keywords = {
                        "Christianity": ['church', 'jesus', 'christ', 'faith', 'bible', 'prayer', 'gospel', 'pastor', 'bishop', 'vatican', 'catholic', 'protestant', 'ministry'],
                        "Global News": ['news', 'world', 'international', 'report']
                    }

                    for article in all_db_news:
                        title_lower = article.get('title', '').lower()
                        snippet_lower = article.get('snippet', '').lower()
                        source_lower = article.get('source', '').lower()
                        combined_text = f"{title_lower} {snippet_lower} {source_lower}"
                        
                        # Check if article matches any active topic OR its related keywords
                        matched = False
                        for topic in active_topics:
                            if topic.lower() in combined_text:
                                matched = True
                                break
                            # Check related keywords
                            if topic in topic_keywords:
                                if any(k in combined_text for k in topic_keywords[topic]):
                                    matched = True
                                    break
                                    
                        if matched:
                            filtered_articles.append(article)
                    
                    # If we filtered everything out, effectively showing nothing...
                    # Fallback: if 'Christianity' is active, and we have items, just show them (DB is mostly christian anyway)
                    if not filtered_articles and "Christianity" in active_topics and all_db_news:
                         print("⚠️ [News Feed] Strict filter empty. Defaulting to all DB news (Assuming Christian context).")
                         filtered_articles = all_db_news

                    articles = filtered_articles[:20]  # Limit to 20
                    print(f"✅ [News Feed] DB filtered by topics: {len(articles)} articles match {active_topics}")
                except Exception as e:
                    print(f"⚠️ [News Feed] DB filtering failed: {e}")
                    articles = []
        else:
            # NO TOPICS SELECTED: Show all content (fallback mode)
            print("⚠️ [News Feed] No topics active - showing all content")
            try:
                articles = news_feeder.get_news(limit=10)
            except Exception as e:
                print(f"⚠️ [News Feed] Fallback failed: {e}")
                articles = []
             
        # Ensure list of dicts (fix for sqlite3.Row)
        articles = [dict(a) for a in articles]
        # print(f"API News Count: {len(articles)}")

        # Translate if needed
        # Re-enabling with reduced limit (10 items) to ensure responsiveness
        if lang != 'en' and articles:
            try:
                # print(f"Translating {len(articles)} items to {lang}...")
                for a in articles:
                    if 'summary' in a: a['snippet'] = a['summary']
                
                articles = translator.translate_batch(articles, lang)
            except Exception as e:
                print(f"Translation error: {e}")
                # Return English version if translation fails
                pass
        
        for a in articles:
            if 'snippet' in a: a['summary'] = a['snippet']

        return jsonify(articles)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"News Error: {e}")
        return jsonify({"error": str(e), "results": []}), 500

@app.route('/api/videos', methods=['GET'])
def videos_endpoint():
    """Fetch trending Christian videos (Unified Master Feed)"""
    try:
        lang = request.args.get('lang', 'en')
        # Explicit search query from UI (dashboard/videos search bar)
        query = request.args.get('q', '').strip()

        if query:
            search_q = sanitize_query(query)
            if not search_q:
                return jsonify([])  # Invalid/empty after sanitization

            print(f"🔍 [Video Search] Query: '{query}'")
            # Disable AI Refinement for Videos as per user request to ensure accurate results
            refined_q = search_q

            print(f"🔍 [Video Search] Query: '{query}' -> Refined: '{refined_q}'")
            # Use live YouTube search for user queries
            # [FIX] Disable strict filtering for explicit user intent to maximize results
            # Reduced limit to 20 to prevent scraping timeouts/blocks
            videos = video_engine.search(refined_q, limit=20, lang=lang, apply_strict=False)
            print(f"✅ [Video Search] Found {len(videos)} videos from YouTube")
            
            # [ENHANCED] Ingest video metadata into RAG for better search
            if videos and rag_engine:
                print(f"📚 [Video Search] Ingesting {len(videos)} videos into RAG...")
                for video in videos[:10]:  # Limit to top 10 for performance
                    try:
                        description = video.get('description', '') or video.get('snippet', '')
                        if description:
                            rag_engine.ingest(
                                f"{video.get('title', '')}\n{description}",
                                metadata={
                                    "source": video.get('url', ''),
                                    "title": video.get('title', 'Unknown'),
                                    "type": "video_search",
                                    "query": refined_q,
                                    "channel": video.get('channel', '')
                                }
                            )
                    except Exception as e:
                        print(f"⚠️ RAG ingestion failed for video: {e}")
                        pass
            
            return jsonify(videos)

        # [STRICT TOPIC FILTERING] Only show content from active topics selected by Super Admin
        topic_query = topic_manager.get_active_topic_query()
        active_topics = topic_manager.get_active_keywords()
        
        videos = []
        
        # STRICT MODE: If topics are selected, ONLY show content from those topics
        if active_topics:
            if topic_query:
                # Search specific active topics only
                try:
                    videos = video_engine.get_videos_by_language(lang, topic_query=topic_query)
                    print(f"✅ [Video Feed] Strict topic filtering: Found {len(videos)} videos for topics: {active_topics}")
                except Exception as e:
                    print(f"⚠️ [Video Feed] Topic search failed: {e}")
                    videos = []
            
            # If no results from search, try DB but filter by active topics
            # If no results from search, try DB but filter by active topics
            if not videos:
                try:
                    all_db_videos = video_engine.get_trending(limit=100)  # Get more to filter
                    
                    # Filter by active topics BUT allow Priority Content (JRM)
                    filtered_videos = []
                    priority_keywords = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus', 'comforter tv', 'nalumavadi', 'jrm']
                    
                    # Define loose keywords for specific topics (Shared logic)
                    topic_keywords = {
                        "Christianity": ['church', 'jesus', 'christ', 'faith', 'bible', 'prayer', 'gospel', 'pastor', 'bishop', 'vatican', 'catholic', 'protestant', 'ministry', 'worship'],
                        "Global News": ['news', 'world', 'international', 'report']
                    }

                    for video in all_db_videos:
                        title_lower = video.get('title', '').lower()
                        description_lower = video.get('description', '').lower()
                        channel_lower = video.get('channel', '').lower()
                        combined_text = f"{title_lower} {description_lower} {channel_lower}"
                        
                        # Always include Priority Content
                        if any(pk in combined_text for pk in priority_keywords):
                            filtered_videos.append(video)
                            continue

                        # Check if video matches any active topic OR its related keywords
                        matched = False
                        for topic in active_topics:
                            if topic.lower() in combined_text:
                                matched = True
                                break
                            # Check related keywords
                            if topic in topic_keywords:
                                if any(k in combined_text for k in topic_keywords[topic]):
                                    matched = True
                                    break
                                    
                        if matched:
                            filtered_videos.append(video)
                    
                    # Fallback: if filtered result is empty but 'Christianity' is active, 
                    # check if the DB has any christian content that might have been missed or if we should show JRM only
                    if not filtered_videos and "Christianity" in active_topics:
                         print("⚠️ [Video Feed] Strict filter empty. Including all Priority Content as fallback.")
                         # Resort to at least showing priority content if it was filtered out (though it shouldn't be due to the check above)
                         # But let's check basic christian terms broadly
                         for video in all_db_videos:
                             if any(k in (video.get('title', '') + video.get('description', '')).lower() for k in topic_keywords['Christianity']):
                                 filtered_videos.append(video)
                         
                         # De-dup
                         seen_ids = set()
                         unique_filtered = []
                         for v in filtered_videos:
                             if v['id'] not in seen_ids:
                                 unique_filtered.append(v)
                                 seen_ids.add(v['id'])
                         filtered_videos = unique_filtered
                    
                    # Sort: Priority content first
                    def sort_key(v):
                        text = (v.get('title', '') + v.get('channel', '')).lower()
                        return 0 if any(k in text for k in priority_keywords) else 1
                    
                    filtered_videos.sort(key=sort_key)
                    videos = filtered_videos[:20]  # Limit to 20
                    print(f"✅ [Video Feed] DB filtered: {len(videos)} videos (Priority + Topics)")
                except Exception as e:
                    print(f"⚠️ [Video Feed] DB filtering failed: {e}")
                    videos = []
        else:
            # NO TOPICS SELECTED: Show all content (fallback mode)
            print("⚠️ [Video Feed] No topics active - showing all content")
            try:
                videos = video_engine.get_trending(limit=10)
            except Exception as e:
                print(f"⚠️ [Video Feed] Fallback failed: {e}")
                videos = []
        
        # Ensure list of dicts
        videos = [dict(v) for v in videos]
        
        # Translate if needed
        if lang != 'en' and videos:
            try:
                for v in videos:
                     if 'description' in v: v['snippet'] = v['description']
                     
                videos = translator.translate_batch(videos, lang)
                
                for v in videos:
                     if 'snippet' in v: v['description'] = v['snippet']
            except Exception as e:
                print(f"Video Translation error: {e}")
                pass
                 
        return jsonify(videos)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Video Error: {e}")
        return jsonify({"error": str(e), "results": []}), 500

@app.route('/api/tts', methods=['POST'])
def tts_endpoint():
    """Text-to-Speech Endpoint using OpenAI"""
    data = request.json
    text = data.get('text', '')
    if not text: return jsonify({"error": "No text provided"}), 400
    
    # Use Legal Assistant's client for consistency
    audio_data = legal_assistant.speak(text)
    
    if audio_data:
        from flask import Response
        return Response(audio_data, mimetype="audio/mpeg")
    else:
        return jsonify({"error": "TTS generation failed"}), 500

@app.route('/api/extract', methods=['POST'])
def extract_endpoint():
    """Reader Mode: Extract text AND track view"""
    data = request.json
    url = data.get('url')
    topic = data.get('topic', '') # Optional: Triggering topic
    
    if not url: return jsonify({"error": "URL required"}), 400
    
    try:
        # Resolve real URL for extraction (Fixes blank Google News pages)
        print(f"🔍 DEBUG: Extraction Request for: {url} (Type: {type(url)})")
        resolved_url = news_feeder._resolve_url(url)
        print(f"🔍 DEBUG: Resolved URL: {resolved_url} (Type: {type(resolved_url)})")
        
        # Ensure it's not a coroutine
        if hasattr(resolved_url, '__await__'):
             print("⚠️ CRITICAL ERROR: resolved_url is a COROUTINE!")
             import asyncio
             resolved_url = asyncio.run(resolved_url)

        # 1. Track View (Real Metric)
        views = 0
        if analytics:
            try:
                print(f"🔍 DEBUG: Tracking view for {url}")
                views = analytics.track_view(url, topic)
                print(f"✅ DEBUG: Views now {views}")
            except Exception as ae:
                print(f"⚠️ Analytics Error: {ae}")
        
        # 2. Extract Content
        print("📖 DEBUG: Starting Extraction via extractor.extract...")
        content_res = extractor.extract(str(resolved_url))
        print(f"🔍 DEBUG: extractor.extract results type: {type(content_res)}")
        
        # Check if content_res is a coroutine
        if hasattr(content_res, '__await__'):
             print("⚠️ CRITICAL ERROR: extractor.extract returned a COROUTINE!")
             import asyncio
             content = asyncio.run(content_res)
        else:
             content = dict(content_res) if content_res else {'error': 'Failed to extract content'}

        print(f"✅ Extraction Result: {'Success' if content and not 'error' in content else 'Failed'}")
        
        # 3. Translate if requested
        lang = data.get('lang', 'en')
        if lang != 'en' and content and not content.get('error'):
            try:
                print(f"🔍 DEBUG: Translating to {lang}...")
                # Translate Title
                if content.get('title'):
                    t_title = translator.translate_text(content.get('title', ''), lang)
                    if hasattr(t_title, '__await__'):
                         import asyncio
                         t_title = asyncio.run(t_title)
                    content['title'] = t_title
                    
                # Translate Body  
                if content.get('text'):
                    t_text = translator.translate_text(content.get('text', ''), lang)
                    if hasattr(t_text, '__await__'):
                         import asyncio
                         t_text = asyncio.run(t_text)
                    content['text'] = t_text
                print("✅ DEBUG: Translation complete")
            except Exception as e:
                print(f"Translation failed in extract: {e}")
                import traceback
                traceback.print_exc()
                
        content['views'] = views # Return updated view count to frontend
        
        return jsonify(content)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# (Removed broken global instantiations - loaded in background)


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
    username = data.get('username')
    password = data.get('password')
    
    # [SECURITY] Load from environment variables, fallback to defaults for backward compatibility
    # TODO: Implement proper password hashing (bcrypt) and JWT tokens with expiration
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'gyanbridge123')
    
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        # TODO: Replace with proper JWT token with expiration
        return jsonify({"success": True, "token": "valid_session"})
    return jsonify({"error": "Invalid username or password"}), 401


# --- Super Admin Endpoints ---

@app.route('/api/superadmin/login', methods=['POST'])
def superadmin_login():
    """Super Admin Authentication"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # [SECURITY] Load from environment variables, fallback to defaults for backward compatibility
    # TODO: Implement proper password hashing (bcrypt) and JWT tokens with expiration
    SUPERADMIN_USERNAME = os.getenv('SUPERADMIN_USERNAME', 'superadmin')
    SUPERADMIN_PASSWORD = os.getenv('SUPERADMIN_PASSWORD', 'genesis123')
    
    if username == SUPERADMIN_USERNAME and password == SUPERADMIN_PASSWORD:
        # TODO: Replace with proper JWT token with expiration
        return jsonify({"success": True, "token": "super_session"})
    return jsonify({"error": "Invalid Super Admin credentials"}), 401

@app.route('/api/superadmin/topics', methods=['GET', 'POST'])
def superadmin_topics():
    """Get or Update Active Topics"""
    if request.method == 'GET':
        return jsonify(topic_manager.get_topics())
    
    data = request.json
    success = topic_manager.update_topic(data.get('topic'), data.get('status'))
    return jsonify({"success": success})

@app.route('/api/topics/toggle', methods=['POST'])
def toggle_topic():
    """Toggle a specific topic on/off (Called by SuperAdminDashboard)"""
    data = request.json
    topic = data.get('topic')
    status = data.get('status')
    
    if not topic:
        return jsonify({"success": False, "error": "Topic name required"}), 400
    
    success = topic_manager.update_topic(topic, status)
    return jsonify({"success": success})

@app.route('/api/topics/active', methods=['GET'])
def active_topics_endpoint():
    """Get list of active topic names for UI Headers"""
    return jsonify({"topics": topic_manager.get_active_keywords()})



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
    lang = data.get('lang', 'en')
    
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
        result = llm_analytics.analyze_and_graph(query, direct_context=context_str, lang=lang)
        
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
    lang = data.get('lang', 'en')
    generate_audio = data.get('generate_audio', False)  # New: Opt-in TTS
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    try:
        result = legal_assistant.ask(query, lang=lang, generate_audio=generate_audio)
        return jsonify(result)
    except Exception as e:
        print(f"Legal API Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/legal/voice_interact', methods=['POST'])
def legal_voice_interact():
    """
    Direct Voice Interaction:
    1. Receive Audio Blob
    2. STT (Whisper)
    3. LLM (Legal Assistant)
    4. TTS (OpenAI)
    5. Return JSON {text, audio_base64}
    """
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
        
    audio_file = request.files['audio']
    lang = request.form.get('lang', 'en')
    
    import tempfile
    import base64
    from openai import OpenAI
    
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            audio_file.save(temp_audio.name)
            temp_path = temp_audio.name
            
        print("🎤 Voice: Transcribing...")
        with open(temp_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                model="whisper-1", 
                file=f,
                language=lang if lang in ['hi', 'ta'] else 'en'
            )
        user_query = transcription.text
        print(f"🗣️ User Said: {user_query}")
        
        os.unlink(temp_path)
        
        if not user_query.strip():
            return jsonify({'error': 'No speech detected'}), 400

        print("⚖️ Legal: Consulting Expert...")
        llm_response = legal_assistant.ask(user_query, lang=lang)
        answer_text = llm_response.get('answer', "I could not find an answer.")
        
        print(f"🔊 Voice: Synthesizing Response in {lang}...")
        # Use LegalAssistant's speak method which supports language-aware TTS
        audio_data = legal_assistant.speak(answer_text, lang=lang)
        
        if audio_data:
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        else:
            # Fallback to direct OpenAI call if LegalAssistant.speak fails
            voice_map = {'en': 'alloy', 'hi': 'nova', 'ta': 'echo'}
            voice = voice_map.get(lang, 'alloy')
            speech_response = client.audio.speech.create(
                model="tts-1", 
                voice=voice,
                input=answer_text
            )
            audio_base64 = base64.b64encode(speech_response.content).decode('utf-8')
        
        return jsonify({
            'query': user_query,
            'answer': answer_text,
            'acts': llm_response.get('acts', []),
            'audio': f"data:audio/mp3;base64,{audio_base64}"
        })

    except Exception as e:
        print(f"🔥 Voice Interaction Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/suggestions', methods=['GET'])
def suggestions_endpoint():
    """Proxy for Search Suggestions"""
    query = request.args.get('q', '')
    s_type = request.args.get('type', 'web')
    
    if not query: return jsonify([])
    
    try:
        # YouTube Suggestions for video
        if s_type == 'video':
            url = f"http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={query}"
        # Google News/Web Suggestions
        else:
            url = f"http://suggestqueries.google.com/complete/search?client=firefox&q={query}"
            
        resp = requests.get(url, timeout=2)
        if resp.status_code == 200:
            # Format: ["query", ["suggestion1", "suggestion2", ...]]
            data = resp.json()
            if len(data) >= 2:
                return jsonify(data[1])
                
        return jsonify([])
    except Exception as e:
        print(f"Suggestion Error: {e}")
        return jsonify([])

if __name__ == '__main__':
    # Ensure templates are auto-reloaded
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    
    port = int(os.environ.get('PORT', 5001))
    
    # Start Video Worker (Since we are running directly with debug=False)
    print("🚀 Starting VideoEngine Background Worker...")
    video_engine.start_background_worker()

    print("🚀 Starting NewsFeeder Background Worker...")
    news_feeder.start_background_worker()
    
    app.run(host='0.0.0.0', port=port, debug=False)
