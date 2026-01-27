import feedparser
import time
import random
import re
import requests
import hashlib
import trafilatura
import sqlite3
import os
import threading
from datetime import datetime
from bs4 import BeautifulSoup
from ddgs import DDGS # [NEW] Hybrid Engine for Images
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.parse
from src.geo_sorter import GeoSorter
from src.topic_manager import topic_manager
from src.ddg_client import DDGClient # [FALLBACK]

# Database Configuration
DB_FILE = os.path.join(os.path.dirname(__file__), '..', 'news.db')

class NewsFeeder:
    """
    Fetches live news from Christian RSS feeds, caches in SQLite, and supports Moderation.
    Integrated with ThreadPoolExecutor for high-performance scraping.
    """
    def _format_relative_time(self, timestamp):
        diff = time.time() - timestamp
        if diff < 60: return "Just now"
        if diff < 3600: return f"{int(diff/60)} mins ago"
        if diff < 86400: return f"{int(diff/3600)} hours ago"
        if diff < 604800: return f"{int(diff/86400)} days ago"
        return time.strftime("%d %b %Y", time.localtime(timestamp))

    def __init__(self, rag_engine=None):
        self.rag_engine = rag_engine
        self.sorter = GeoSorter()
        self._init_db()
        self.cleanup_stale_news() # [FIX] Clean on startup
        
        # Modular RSS Feeds Definition
        self.TOPIC_FEEDS = {
            "Technology": [
                'https://techcrunch.com/feed/',
                'https://www.theverge.com/rss/index.xml',
                'https://www.wired.com/feed/rss',
                'https://feeds.arstechnica.com/arstechnica/index',
                'https://news.google.com/rss/search?q=Artificial+Intelligence+Technology&hl=en-IN&gl=IN&ceid=IN:en'
            ],
            "Science": [
                'https://www.sciencedaily.com/rss/all.xml',
                'https://science.nasa.gov/feed',
                'https://www.livescience.com/feeds/all',
                'https://news.google.com/rss/search?q=Scientific+Discoveries&hl=en-IN&gl=IN&ceid=IN:en'
            ],
            "Sports": [
                'https://www.espn.com/espn/rss/news',
                'https://sports.yahoo.com/rss/',
                'https://feeds.bbci.co.uk/sport/rss.xml',
                'https://news.google.com/rss/search?q=Sports+News+India&hl=en-IN&gl=IN&ceid=IN:en'
            ],
            "Global News": [
                'http://feeds.bbci.co.uk/news/rss.xml',
                'https://www.aljazeera.com/xml/rss/all.xml',
                'https://rss.cnn.com/rss/edition.rss',
                'https://www.dw.com/api/rss/en'
            ],
            "Christianity": [
                'https://www.christianitytoday.com/feed',
                'https://www.persecution.org/feed/',       # International Christian Concern (Events)
                'https://morningstarnews.org/feed/',       # Morning Star News (Persecution Events)
                'https://www.catholicnewsagency.com/rss/news.xml', # CNA (Global Catholic Events)
                'https://www1.cbn.com/app/feed/news/rss.php',
                'https://www.christianpost.com/rss/all',
                'https://www.godreports.com/feed',
                'https://premierchristian.news/feed',
                'https://www.missionnetworknews.org/feed', # Global Missions
                'https://www.worthynews.com/feed',         # Global Christian News
                'https://religionnews.com/feed/',          # Religion News Service
                'https://www.vaticannews.va/en.rss.xml',   # Vatican News (Global)
                'https://matterindia.com/feed/',           # Local/India Christian News
                'https://www.indiancatholicmatters.org/feed/', # Indian Catholic Matters (National)
                'https://news.google.com/rss/search?q=Church+of+South+India+Tamil+Nadu&hl=en-IN&gl=IN&ceid=IN:en', # CSI Context
                'https://news.google.com/rss/search?q=Tamil+Nadu+Christian+News&hl=en-IN&gl=IN&ceid=IN:en',       # TN Regional
                'https://news.google.com/rss/search?q=Christian+Persecution+India&hl=en-IN&gl=IN&ceid=IN:en',      # India Persecution
                'https://news.google.com/rss/search?q=Dalit+Christians+India&hl=en-IN&gl=IN&ceid=IN:en',           # Dalit Issues
                'https://news.google.com/rss/search?q=Catholic+Church+Kerala+Tamil+Nadu&hl=en-IN&gl=IN&ceid=IN:en',# South India
                'https://news.google.com/rss/search?q=Pentecostal+Mission+India&hl=en-IN&gl=IN&ceid=IN:en',        # IPM/Pentecostal
                'https://rss.csmonitor.com/feeds/csm',     # Christian Science Monitor (Ethical/Global)
                'https://osvnews.com/feed',                # OSV News (Catholic)
                'https://news.google.com/rss/search?q=Christianity+source:BBC_News&hl=en-GB&gl=GB&ceid=GB:en',      # BBC News (Christianity Topic)
                'https://cruxnow.com/feed',                # Crux Now
                'https://www.ucanews.com/rss/feed',        # UCAN News
                'http://www.asianews.it/rss/en.xml',       # AsiaNews
                'https://www.baptistpress.com/feed/',      # Baptist Press
                'https://www.desiringgod.org/feed',        # Desiring God
                'https://www.thegospelcoalition.org/feed/',# The Gospel Coalition
                'https://lausanne.org/feed',               # Lausanne Movement
                'https://worldea.org/feed',                # World Evangelical Alliance
                'https://www.oikoumene.org/en/rss',        # World Council of Churches
                'https://www.crossway.org/articles/feed/', # Crossway
                'https://www.ligonier.org/feeds/rss/articles/', # Ligonier Resources
                'https://www.opendoors.org/rss',           # Open Doors
                'https://christiantoday.co.in/feed',       # Christian Today India
                'https://www.ucanews.com/rss/india',       # UCAN India
                'https://news.google.com/rss/search?q=site:thehindu.com+Christianity&hl=en-IN&gl=IN&ceid=IN:en', # The Hindu (Religion)
                'https://news.google.com/rss/search?q=site:timesofindia.indiatimes.com+Christianity&hl=en-IN&gl=IN&ceid=IN:en', # TOI (Religion)
                'https://news.google.com/rss/search?q=site:indianexpress.com+Christianity&hl=en-IN&gl=IN&ceid=IN:en', # Indian Express (Religion)
                'https://news.google.com/rss/search?q=Evangelical+Fellowship+of+India&hl=en-IN&gl=IN&ceid=IN:en', # EFI Events
                'https://news.google.com/rss/search?q=Catholic+Bishops+Conference+India&hl=en-IN&gl=IN&ceid=IN:en', # CBCI News
                'https://news.google.com/rss/search?q=Church+of+North+India+CNI&hl=en-IN&gl=IN&ceid=IN:en',         # CNI News
                # Jesus Redeems Ministries - Dedicated Feeds
                'https://jesusredeems.com/feed',  # Official Jesus Redeems Feed
                'https://news.google.com/rss/search?q=Jesus+Redeems+Ministries&hl=en-IN&gl=IN&ceid=IN:en',  # Jesus Redeems News
                'https://news.google.com/rss/search?q=site:jesusredeems.com&hl=en-IN&gl=IN&ceid=IN:en',  # Jesus Redeems Site Content
            ]
        }
        
        # [ENHANCED] Merge RSS Feeds from Resource Definitions
        try:
             from src.resource_definitions import RSS_FEEDS
             self.PRIORITY_FEEDS = [
                'https://jesusredeems.com/feed',
                'https://news.google.com/rss/search?q=Jesus+Redeems+Ministries&hl=en-IN&gl=IN&ceid=IN:en',
                'https://news.google.com/rss/search?q=site:jesusredeems.com&hl=en-IN&gl=IN&ceid=IN:en'
             ] + RSS_FEEDS
        except Exception as e:
             print(f"⚠️ Could not load remote definitions: {e}")
             self.PRIORITY_FEEDS = [
                'https://jesusredeems.com/feed',
                'https://news.google.com/rss/search?q=Jesus+Redeems+Ministries&hl=en-IN&gl=IN&ceid=IN:en',
                'https://news.google.com/rss/search?q=site:jesusredeems.com&hl=en-IN&gl=IN&ceid=IN:en'
             ]

        self.last_fetch = 0
        self.fetch_interval = 60 # 1 minute
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'})
        
        # [STRICT] Block known placeholder/logo images
        self.BLOCKED_IMAGES = [
            "https://ssl.gstatic.com/gnews/logo/google_news_192.png",
            "https://www.gstatic.com/images/branding/product/1x/gnews_512dp.png",
            "https://lh3.googleusercontent.com/-FzM2e4gQ7pQ/AAAAAAAAAAI/AAAAAAAAAAA/ACHi3re7r_B7oH8k9lg/s96-c/photo.jpg",
            "https://lh3.googleusercontent.com/J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrp54bTT=w300",
            # Add other known junk
        ]
        
        # Curated Fallback Images (News, Church, Abstract, Globe) to avoid random "Cocktails" or "Parties"
        self.FALLBACK_IMAGES = [
            "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800", # Abstract Dark Gradient
            "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800", # News/Paper
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800", # Globe/Network
            "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&q=80&w=800", # Bible/Book
            "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=800", # Church Architecture
            "https://images.unsplash.com/photo-1601142634808-38923eb7c560?auto=format&fit=crop&q=80&w=800", # Candle
            "https://images.unsplash.com/photo-1518544806352-a2221ebd0e19?auto=format&fit=crop&q=80&w=800", # Abstract Blue
            "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?auto=format&fit=crop&q=80&w=800"  # Broadcast/News
        ]


    def _get_connection(self):
        """Get DB connection with robust retry logic for locking."""
        retries = 10
        for i in range(retries):
            try:
                # Increased timeout to 60s and check_same_thread=False for safety
                conn = sqlite3.connect(DB_FILE, timeout=60.0, check_same_thread=False)
                conn.execute('PRAGMA journal_mode=WAL;')
                return conn
            except sqlite3.OperationalError as e:
                if "locked" in str(e):
                    if i < retries - 1:
                        time.sleep(random.uniform(0.5, 2.0)) # Random jitter
                        continue
                raise
        raise sqlite3.OperationalError(f"Database locked after {retries} retries")

    def _init_db(self):
        """Initialize SQLite Database."""
        try:
            conn = self._get_connection()
            c = conn.cursor()
            # [CRITICAL] Enable Write-Ahead Logging to fix "database is locked" errors
            c.execute('PRAGMA journal_mode=WAL;')
            c.execute('''
                CREATE TABLE IF NOT EXISTS news (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    url TEXT,
                    published TEXT,
                    source TEXT,
                    image TEXT,
                    guid TEXT,
                    timestamp REAL,
                    snippet TEXT,
                    is_approved INTEGER DEFAULT 1
                )
            ''')
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"❌ [NewsFeeder] DB Init Error: {e}")

    def start_background_worker(self):
        """Starts the background fetch thread."""
        threading.Thread(target=self._background_loop, daemon=True).start()
        print("🚀 [NewsFeeder] Background Worker Started.")

    def update_news(self):
        """Force manual update (Public API)."""
        self._fetch_and_store()
        
    def cleanup_stale_news(self):
        """Delete old news to keep feed fresh (3 days retention), PRESERVING JRM."""
        try:
            conn = self._get_connection()
            c = conn.cursor()
            # Keep JRM forever-ish, delete others older than 3 days
            cutoff = time.time() - (3 * 24 * 3600)
            c.execute("DELETE FROM news WHERE timestamp < ? AND title NOT LIKE '%Jesus Redeems%' AND title NOT LIKE '%Mohan%'", (cutoff,))
            conn.commit()
            conn.close()
            print("🧹 [NewsFeeder] Stale news cleaned.")
        except Exception as e:
            print(f"⚠️ [NewsFeeder] Cleanup failed: {e}")

    def _background_loop(self):
        """Infinite loop for background fetching."""
        while True:
            try:
                self._fetch_and_store()
            except Exception as e:
                print(f"❌ [NewsFeeder] Fetch Error: {e}")
            time.sleep(self.fetch_interval)

    def _get_fallback_image(self, title):
        """
        Deprecated for external responses: we now prefer returning `None`
        so the frontend can use its own single placeholder.
        Kept for backward-compatibility if ever needed internally.
        """
    def _extract_image(self, entry):
        img_url = None
        if 'media_content' in entry: img_url = entry.media_content[0]['url']
        elif 'media_thumbnail' in entry: img_url = entry.media_thumbnail[0]['url']
        elif 'enclosures' in entry:
            for enc in entry.enclosures:
                if enc.type.startswith('image/'): 
                    img_url = enc.href
                    break
        elif 'summary' in entry:
            match = re.search(r'<img[^>]+src="([^">]+)"', entry.summary)
            if match: img_url = match.group(1)
        
        # [STRICT] Validate Image against Block List and Patterns
        if img_url:
            # Block Google News generic logos and placeholders
            if any(b in img_url for b in self.BLOCKED_IMAGES):
                return None
            if "google_news" in img_url or "gnews" in img_url:
                 # Only block if it looks like a logo asset
                 if "logo" in img_url or "icon" in img_url or "branding" in img_url:
                     return None
            if "gstatic.com" in img_url: return None # Block all gstatic images (usually icons)
        
        return img_url

    def _fetch_fallback_image(self, query):
        """
        [HYBRID ENGINE] Perform a real-time image search using DuckDuckGo.
        Used ONLY when no valid image is found in RSS or Metadata.
        Guarantees no placeholders are used.
        """
        try:
            with DDGS() as ddgs:
                # Search for safe, medium-sized images
                results = ddgs.images(
                    query, 
                    region='wt-wt', 
                    safesearch='on', 
                    size='Medium', 
                    type_image='Photo', 
                    max_results=3
                )
                for r in results:
                    img_url = r.get('image')
                    # Double check it's not a blocked domain
                    if img_url and not any(b in img_url for b in self.BLOCKED_IMAGES):
                         return img_url
        except Exception as e:
            # Silence DNS/Connection errors to avoid log spam
            error_str = str(e)
            if "11001" in error_str or "gaierror" in error_str or "Connect" in error_str:
                pass 
            else:
                print(f"⚠️ [Image Fallback] Failed for '{query}': {e}")
        return None

    def _fetch_og_image(self, url):
        """Aggressively fetch og:image using Trafilatura and BeautifulSoup."""
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        try:
            # 1. Trafilatura
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                metadata = trafilatura.extract_metadata(downloaded)
                if metadata and metadata.image: return metadata.image

            # 2. BeautifulSoup Fallback
            resp = self.session.get(url, headers=headers, timeout=10, stream=True)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.content, 'html.parser')
                og = soup.find("meta", property="og:image")
                if og and og.get("content"): return og["content"]
        except: pass
        return None

    def get_news(self, limit=50):
        """Fetch news from DB with JRM prioritization and Geo-Sorting."""
        try:
            conn = self._get_connection()
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM news WHERE is_approved = 1 ORDER BY timestamp DESC LIMIT ?", (limit * 2,))
            rows = c.fetchall()
            conn.close()
        except Exception as e:
            print(f"⚠️ [NewsFeeder] get_news error: {e}")
            rows = []
        finally:
            try: conn.close()
            except: pass
        
        all_news = [dict(row) for row in rows]

        # Enhance with clean relative time and remove placeholders
        for item in all_news:
            if item.get('timestamp'):
                item['published'] = self._format_relative_time(float(item['timestamp']))
            
            # Strip out any legacy fallback images so frontend can use its own placeholder
            if item.get('image') in self.FALLBACK_IMAGES:
                item['image'] = None
        
        # Priority Boost: JRM / Mohan C Lazarus
        priority_keywords = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus']
        def get_priority_score(item):
            text = (item.get('title', '') + ' ' + item.get('source', '') + ' ' + item.get('snippet', '')).lower()
            for k in priority_keywords:
                if k in text: return 100
            return 1
            
        all_news.sort(key=lambda x: (get_priority_score(x), x.get('timestamp', 0)), reverse=True)
        return self.sorter.sort_results(all_news)[:limit]

    def _resolve_url(self, url):
        """
        Resolve Google News redirect URLs to the actual publisher's URL.
        This allows us to scrape the REAL metadata (OG Image) from the source.
        """
        if "news.google.com" not in url and "google.com/rss" not in url:
            return url
            
        # 1. Follow HTTP Redirects with Browser Headers
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Referer": "https://news.google.com/"
            }
            resp = self.session.get(url, headers=headers, timeout=10, allow_redirects=True)
            
            if resp.history:
                final_url = resp.url
                if "google.com" not in final_url and "googleusercontent.com" not in final_url:
                    return final_url
            
            if "google.com" not in resp.url and "googleusercontent.com" not in resp.url:
                return resp.url

            soup = BeautifulSoup(resp.content, 'html.parser')
            for link in soup.find_all('a', href=True):
                href = link['href']
                if href.startswith('http') and 'google.com' not in href and 'googleusercontent.com' not in href:
                    return href
            
            match = re.search(r'window\.location\.replace\("([^"]+)"\)', resp.text)
            if match: return match.group(1)

        except Exception as e:
            pass
            
        return url

    def get_news_by_language(self, lang, limit=50, topic_query=None):
        """Unified Master Feed search mixed across languages."""
        searches = [
            {'lang': 'en', 'q': topic_query if topic_query else "Christian News"},
            {'lang': 'ta', 'q': f"{topic_query} OR கிறிஸ்தவம்" if topic_query else "கிறிஸ்தவ செய்திகள்"},
            {'lang': 'hi', 'q': f"{topic_query} OR ईसाई" if topic_query else "ईसाई समाचार"}
        ]
        
        all_results = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_search = {executor.submit(self.search, s['q'], limit=15, lang=s['lang']): s for s in searches}
            for future in as_completed(future_to_search):
                try: all_results.extend(future.result())
                except: pass

        # Deduplicate and Sort
        unique_results = []
        seen_urls = set()
        for r in all_results:
            if r['url'] not in seen_urls:
                seen_urls.add(r['url'])
                unique_results.append(r)
        
        # [STRICT SUPER ADMIN FILTER] & [JRM BOOST]
        # 1. Enforce super admin topics if active
        # [STRICT SUPER ADMIN FILTER] & [JRM BOOST]
        # 1. Enforce super admin topics if active
        active_topics = topic_manager.get_active_keywords()
        if active_topics:
            filtered_results = []
            priority_names = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus', 'jrm']
            
            for r in unique_results:
                text_content = (r.get('title', '') + ' ' + r.get('snippet', '')).lower()
                
                # Condition 1: Matches Active Topic
                matches_topic = any(t.lower() in text_content for t in active_topics)
                
                # Condition 2: Is Priority Content (JRM) - ALWAYS KEEP
                is_priority = any(p in text_content for p in priority_names)
                
                if matches_topic or is_priority:
                    filtered_results.append(r)
            unique_results = filtered_results

        # 2. Priority Boost: JRM / Mohan C Lazarus (Top Priority Request)
        priority_keywords = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus', 'jrm']
        def get_priority_score(item):
            text = (item.get('title', '') + ' ' + item.get('source', '') + ' ' + item.get('snippet', '')).lower()
            for k in priority_keywords:
                if k in text: return 10000 # Massive boost to ensure top rank
            return 1
            
        unique_results.sort(key=lambda x: (get_priority_score(x), x.get('timestamp', 0)), reverse=True)
        return self.sorter.sort_results(unique_results)[:limit]


    def search(self, query, limit=20, lang='en'):
        """Live search via Google News RSS."""
        hl, gl, ceid = ("en-IN", "IN", "IN:en")  # [FIX] Restore defaults
        if lang == 'hi': hl, gl, ceid = ("hi", "IN", "IN:hi")
        elif lang == 'ta': hl, gl, ceid = ("ta", "IN", "IN:ta")
        
        # [STRICT TOPIC CONTROL]
        active_topics = topic_manager.get_active_keywords()
        if active_topics:
             topic_constraint = " AND (" + " OR ".join([f'"{t}"' for t in active_topics]) + ")"
             # Decode query just to check presence (it comes in plain text essentially but let's be safe)
             if not any(t.lower() in query.lower() for t in active_topics):
                 query += topic_constraint
                 print(f"🔒 [NewsFeeder] Strict Topic applied: {query}")

        import urllib.parse
        encoded = urllib.parse.quote(query)
            


        rss_url = f"https://news.google.com/rss/search?q={encoded}&hl={hl}&gl={gl}&ceid={ceid}"
        try:
            feed = feedparser.parse(rss_url)
            results = []
            for entry in feed.entries[:limit]:
                 # Resolve Redirect
                 real_url = self._resolve_url(entry.link)
                 
                 # Prefer real images from RSS, then og:image, no generic placeholders
                 img = self._extract_image(entry)
                 if not img:
                     img = self._fetch_og_image(real_url)
                 
                 # [NEW] Real-time Fallback if still no image
                 if not img:
                      clean_title = re.sub(r'[^\w\s]', '', entry.title)
                      img = self._fetch_fallback_image(clean_title)

                 snippet = ""
                 if 'summary' in entry:
                     snippet = BeautifulSoup(entry.summary, "html.parser").get_text(separator=" ", strip=True)[:180]

                 results.append({
                     'id': hashlib.md5(real_url.encode()).hexdigest(),
                     'title': entry.title,
                     'url': real_url,
                     'published': entry.get('published', entry.get('updated', '')), # [FIX] Updated fallback
                     'source': feed.feed.get('title', 'Google News'),
                     'image': img,
                     'snippet': snippet,
                     'source_type': 'news' 
                 })
            # Deduplicate and geo-sort as usual
            cleaned = self.sorter.sort_results(results)

            # [NEW] Persist Search Results to DB (Live Scraping -> Library)
            if cleaned:
                try:
                    conn = sqlite3.connect(DB_FILE, timeout=30.0, check_same_thread=False)
                    c = conn.cursor()
                    count = 0
                    for item in cleaned:
                        try:
                            c.execute('''
                                INSERT OR IGNORE INTO news (id, title, url, published, source, image, snippet, timestamp, is_approved)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                            ''', (
                                item['id'], 
                                item['title'], 
                                item['url'], 
                                item.get('published', ''), 
                                item.get('source', 'Search'), 
                                item.get('image'), 
                                item.get('snippet', ''), 
                                time.time(),
                                1 # Auto-approve search results
                            ))
                            if c.rowcount > 0: count += 1
                        except: pass
                    conn.commit()
                    conn.close()
                    if count > 0: print(f"✅ [NewsFeeder] Saved {count} new items from search query '{query}'")
                except Exception as e:
                    print(f"⚠️ [NewsFeeder] Failed to persist search results: {e}")

            # Filter blocked images
            for item in cleaned:
                if item.get('image') in self.BLOCKED_IMAGES:
                    item['image'] = None
            return cleaned
            return cleaned
        except Exception as e:
            # [FALLBACK] If Google News RSS fails or returns nothing
            print(f"⚠️ [NewsFeeder] Primary search failed: {e}. Triggering DDG Fallback.")
            try:
                ddg = DDGClient()
                fallback_results = ddg.search_news(query, limit=limit)
                if fallback_results:
                    print(f"🦆 [NewsFeeder] Fallback found {len(fallback_results)} news items.")
                    return fallback_results
            except Exception as fe:
                print(f"❌ [NewsFeeder] Fallback also failed: {fe}")
            return []

    def _fetch_and_store(self):
        """Internal fetch cycle logic."""
        active_topics = topic_manager.get_active_keywords()
        self.last_fetch = time.time()
        
        all_target_feeds = []
        if active_topics:
            for topic in active_topics:
                if topic in self.TOPIC_FEEDS:
                    for url in self.TOPIC_FEEDS[topic]:
                        all_target_feeds.append((url, topic))
        
        if not all_target_feeds:
             for url in self.TOPIC_FEEDS["Christianity"]:
                 all_target_feeds.append((url, "Christianity"))
        
        # Always add priority feeds
        for url in self.PRIORITY_FEEDS:
            if not any(f[0] == url for f in all_target_feeds):
                all_target_feeds.append((url, "Christianity"))

        print(f"🔄 [NewsFeeder] Fetching {len(all_target_feeds)} feeds...")

        raw_items = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_meta = {executor.submit(feedparser.parse, url): category for url, category in all_target_feeds}
            for future in as_completed(future_to_meta):
                 category = future_to_meta[future]
                 try:
                     feed = future.result()
                     source_name = feed.feed.get('title', 'RSS')
                     for entry in feed.entries[:10]:
                         raw_items.append((entry, source_name, category))
                 except: pass

        # Filter and Save
        # Prepare data first (process then write pattern)
        prepared_data = []
        
        christian_keywords = ['church', 'christian', 'christ', 'jesus', 'mohan', 'bishop', 'pastor', 'ministry', 'diocese', 'vatican', 'catholic', 'protestant', 'CSI', 'gospel', 'prayer', 'worship', 'faith', 'bible', 'religious', 'persecution', 'redeems', 'lazarus', 'jrm']
        
        for entry, source, category in raw_items:
            url = entry.link
            title = entry.title
            if category == "Christianity":
                if not any(k in (title + ' ' + entry.get('summary', '')).lower() for k in christian_keywords):
                    continue

            # Resolve URL if it's a redirect (common in Google News)
            real_url = self._resolve_url(url)
            
            sid = hashlib.md5(real_url.encode()).hexdigest()
            # Prefer real images; try RSS tags, then og:image, otherwise None
            img = self._extract_image(entry)
            if not img:
                img = self._fetch_og_image(real_url)
            
            # [NEW] Real-time Fallback if still no image
            if not img:
                 # Clean title for better search results
                 clean_title = re.sub(r'[^\w\s]', '', title)
                 img = self._fetch_fallback_image(clean_title)
            
            ts = time.mktime(entry.published_parsed) if hasattr(entry, 'published_parsed') and entry.published_parsed else time.time()
            snippet = BeautifulSoup(entry.get('summary', ''), "html.parser").get_text(separator=" ", strip=True)[:200]

            prepared_data.append((sid, title, real_url, entry.get('published', ''), source, img, entry.get('guid', url), ts, snippet))
        
        # Batch Insert (Fast, minimized lock time)
        if prepared_data:
            conn = None
            try:
                conn = self._get_connection()
                c = conn.cursor()
                # Use REPLACE to update existing items if content changed (or at least refresh timestamp if needed, but here we trust ID)
                c.executemany("INSERT OR REPLACE INTO news (id, title, url, published, source, image, guid, timestamp, snippet, is_approved) VALUES (?,?,?,?,?,?,?,?,?,1)",
                          prepared_data)
                conn.commit()
                print(f"✅ [NewsFeeder] Saved {len(prepared_data)} items.")
            except Exception as e:
                print(f"❌ [NewsFeeder] DB Save Error: {e}")
            finally:
                if conn: conn.close()
        else:
             print("⚠️ [NewsFeeder] No items prepared for insertion (All filtered out?).")

    def get_all_news(self):
        conn = None
        try:
            conn = self._get_connection()
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM news ORDER BY timestamp DESC")
            rows = c.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"❌ [NewsFeeder] Read Error: {e}")
            return []
        finally:
            if conn: conn.close()

    def toggle_approval(self, nid, status):
         conn = None
         try:
             conn = self._get_connection()
             c = conn.cursor()
             c.execute("UPDATE news SET is_approved = ? WHERE id = ?", (1 if status else 0, nid))
             conn.commit()
         except Exception as e:
             print(f"❌ [NewsFeeder] Update Error: {e}")
         finally:
             if conn: conn.close()
