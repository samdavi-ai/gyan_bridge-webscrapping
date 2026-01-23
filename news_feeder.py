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
from src.geo_sorter import GeoSorter
from bs4 import BeautifulSoup
import requests
import trafilatura
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.parse
import base64

DB_FILE = os.path.join(os.path.dirname(__file__), '..', 'news.db')

class NewsFeeder:
    """
    Fetches live news from Christian RSS feeds, caches in SQLite, and supports Moderation.
    """
    def __init__(self, rag_engine=None):
        self.rag_engine = rag_engine
        self.sorter = GeoSorter()
        self._init_db()
        self.feeds = [
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
        self.last_fetch = 0
        self.fetch_interval = 300 # 5 minutes
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'})

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
        
        # Start background fetch immediately
        threading.Thread(target=self._fetch_and_store, daemon=True).start()

    def _init_db(self):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
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

    def _get_fallback_image(self, title):
        if not title: return self.FALLBACK_IMAGES[0]
        hash_val = int(hashlib.md5(title.encode('utf-8')).hexdigest(), 16)
        return self.FALLBACK_IMAGES[hash_val % len(self.FALLBACK_IMAGES)]

    def _extract_image(self, entry):
        if 'media_content' in entry: return entry.media_content[0]['url']
        if 'media_thumbnail' in entry: return entry.media_thumbnail[0]['url']
        if 'enclosures' in entry:
            for enc in entry.enclosures:
                if enc.type.startswith('image/'): return enc.href
        if 'summary' in entry:
            match = re.search(r'<img[^>]+src="([^">]+)"', entry.summary)
            if match: return match.group(1)
        return None

    def _resolve_url(self, url):
        """
        Resolve Google News redirect URLs to the actual publisher's URL.
        This allows us to scrape the REAL metadata (OG Image) from the source.
        """
        if "news.google.com" not in url and "google.com/rss" not in url:
            return url
            
        # 1. Follow HTTP Redirects with Browser Headers
        # Google blocks generic python user agents on redirects often.
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Referer": "https://news.google.com/"
            }
            # allow_redirects=True is default, but explicit is good.
            # Timeout increased slightly for redirects
            resp = self.session.get(url, headers=headers, timeout=10, allow_redirects=True)
            
            # Check history to allow for debugging (not printed here but useful logic)
            if resp.history:
                final_url = resp.url
                if "google.com" not in final_url and "googleusercontent.com" not in final_url:
                    return final_url
            
            # Fallback A: Check obvious non-google destination
            if "google.com" not in resp.url and "googleusercontent.com" not in resp.url:
                return resp.url

            # Fallback B: Decode simple Base64 if found in the new URL?
            # Sometimes the redirect goes to consent.google.com...
            
            # Fallback C: JS Redirect Search (Enhanced)
            # Look for ANY http url that is not google
            soup = BeautifulSoup(resp.content, 'html.parser')
            # The "Opening..." page usually has a customized link
            for link in soup.find_all('a', href=True):
                href = link['href']
                if href.startswith('http') and 'google.com' not in href and 'googleusercontent.com' not in href:
                    return href
                    
            # Fallback D: Window Location
            match = re.search(r'window\.location\.replace\("([^"]+)"\)', resp.text)
            if match: return match.group(1)

        except Exception as e:
            # print(f"Resolution Error: {e}")
            pass
            
        return url


    def _fetch_og_image(self, url):
        """Aggressively fetch og:image from the target URL."""
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        try:
            # 1. Trafilatura (Best for article extraction)
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                metadata = trafilatura.extract_metadata(downloaded)
                if metadata and metadata.image: 
                    return metadata.image

            # 2. Manual Request (Fallback)
            resp = self.session.get(url, headers=headers, timeout=5, stream=True)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.content, 'html.parser')
                og = soup.find("meta", property="og:image")
                if og and og.get("content"): return og["content"]
                
                # Twitter Card
                tw = soup.find("meta", name="twitter:image")
                if tw and tw.get("content"): return tw["content"]
                
        except Exception as e:
            # print(f"Image fetch failed for {url}: {e}")
            pass
        return None

    def get_news(self, limit=1000):
        # Read from DB
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM news WHERE is_approved = 1 ORDER BY timestamp DESC LIMIT ?", (limit,))
        rows = c.fetchall()
        
        # If empty, synchronous fallback
        if not rows:
            print("⚠️ [NewsFeeder] Cache empty! Fetching initial news...")
            conn.close()
            try:
                self._fetch_and_store()
                conn = sqlite3.connect(DB_FILE)
                conn.row_factory = sqlite3.Row
                c = conn.cursor()
                c.execute("SELECT * FROM news WHERE is_approved = 1 ORDER BY timestamp DESC LIMIT ?", (limit,))
                rows = c.fetchall()
            except Exception: pass
            
        conn.close()
        
        # Helper check to background update if stale
        if time.time() - self.last_fetch > self.fetch_interval:
            threading.Thread(target=self._fetch_and_store, daemon=True).start()

        # Convert to dicts
        all_news = [dict(row) for row in rows]
        
        # --- PRIORITY BOOST: Jesus Redeems Ministries ---
        priority_keywords = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus']
        
        def get_priority_score(item):
            # Higher score = top of list
            # 1. Check Keywords
            text = (item.get('title', '') + ' ' + item.get('source', '') + ' ' + item.get('snippet', '')).lower()
            for k in priority_keywords:
                if k in text: 
                    return 2  # High Priority
            return 1 # Normal
            
        # Sort: Primary = Priority (Desc), Secondary = Timestamp (Desc)
        all_news.sort(key=lambda x: (get_priority_score(x), x.get('timestamp', 0)), reverse=True)
        # ------------------------------------------------
        
        # ------------------------------------------------
        
        # GEO-SORTING (Tamil Nadu > India > Global)
        # Apply strict geo-sorting on the prioritized list
        sorted_news = self.sorter.sort_results(all_news)
        
        return sorted_news

    def get_all_news(self):
        """Admin: Fetch ALL news (Approved & Blocked)."""
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM news ORDER BY timestamp DESC")
        rows = c.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def toggle_approval(self, news_id, status):
        """Admin: Set approval status."""
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE news SET is_approved = ? WHERE id = ?", (1 if status else 0, news_id))
        conn.commit()
        conn.close()
        return True

    def search(self, query, limit=20, lang='en'):
        """Live search using Google News RSS."""
        import urllib.parse
        from src.topic_manager import topic_manager
        
        # 1. Enforce Strict Topic Context
        active_topics = topic_manager.get_active_keywords()
        context_keywords = [t for t in active_topics if t not in ["Christianity", "Global News"]]
        
        # If strict topics active, append to query
        if context_keywords:
             topic_suffix = " ".join(context_keywords)
             query = f"{query} {topic_suffix}"
             
        encoded = urllib.parse.quote(query)
        # Configure Localization
        hl = "en-IN"
        gl = "IN"
        ceid = "IN:en"
        
        if lang == 'hi':
            hl = "hi"
            gl = "IN"
            ceid = "IN:hi"
        elif lang == 'ta':
            hl = "ta"
            gl = "IN"
            ceid = "IN:ta"
            
        rss_url = f"https://news.google.com/rss/search?q={encoded}&hl={hl}&gl={gl}&ceid={ceid}"
        
        try:
            feed = feedparser.parse(rss_url)
            results = []
            for entry in feed.entries[:limit]:
                 # Reuse simple parsing
                 img = self._extract_image(entry)
                 
                 # [FIX] Resolve Google URL to get real image
                 real_url = self._resolve_url(entry.link)
                 
                 if not img: img = self._fetch_og_image(real_url)
                 if not img: img = self._get_fallback_image(entry.title)
                 
                 # Clean snippet
                 clean_snippet = ""
                 raw_summary = entry.get('summary', '')
                 if raw_summary:
                     try:
                         clean_text = BeautifulSoup(raw_summary, "html.parser").get_text(separator=" ", strip=True)
                         clean_snippet = clean_text[:180] + '...' if len(clean_text) > 180 else clean_text
                     except: clean_snippet = raw_summary[:180]

                 results.append({
                     'id': entry.get('id', entry.link),
                     'title': entry.title,
                     'url': real_url,
                     'published': entry.get('published', ''),
                     'source': feed.feed.get('title', 'Google News'),
                     'image': img,
                     'snippet': clean_snippet,
                     'source_type': 'news' 
                 })
            # Sort results
            return self.sorter.sort_results(results)
        except Exception as e:
            print(f"News Search Error: {e}")
            return []

    def get_news_by_language(self, lang, limit=50, topic_query=None):
        """
        Master Feed: Returns Global + Tamil + Hindi content mixed.
        Ignores 'lang' param for filtering, uses it only if strictly needed for something else.
        Sorted by: Tamil Nadu > India > Global.
        """
        
        # Define the Master Query Set (All languages)
        searches = [
            {'lang': 'en', 'q': topic_query if topic_query else "Christian News Global"},
            {'lang': 'ta', 'q': "Jesus Redeems Ministries OR Mohan C Lazarus OR கிறிஸ்தவ செய்திகள்"},
            {'lang': 'hi', 'q': "Jesus Redeems Ministries OR ईसाई धर्म भारत समाचार"}
        ]
        
        # If specific topic provided, try to translate/apply it to all
        if topic_query:
             # Simple approach: Append topic to local queries
             # (In future, use real translation. For now, trust the English topic or simple mapping)
             searches[1]['q'] = f"{topic_query} OR கிறிஸ்தவ செய்திகள்"
             searches[2]['q'] = f"{topic_query} OR ईसाई धर्म भारत समाचार"

        all_results = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_search = {
                executor.submit(self.search, s['q'], limit=20, lang=s['lang']): s 
                for s in searches
            }
            for future in as_completed(future_to_search):
                try:
                    all_results.extend(future.result())
                except: pass

        # deduplicate
        unique_results = []
        seen_urls = set()
        for r in all_results:
            if r['url'] not in seen_urls:
                seen_urls.add(r['url'])
                unique_results.append(r)
        
        # Priority Boost (JRM)
        priority_keywords = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus']
        
        def get_priority_score(item):
            text = (item.get('title', '') + ' ' + item.get('source', '') + ' ' + item.get('snippet', '')).lower()
            for k in priority_keywords:
                if k in text: return 2
            return 1
            
        unique_results.sort(key=lambda x: (get_priority_score(x), x.get('published', '')), reverse=True)
        
        # Final Geo-Sort
        return self.sorter.sort_results(unique_results)
        
        # --- PRIORITY BOOST: Jesus Redeems Ministries (Post-Search Sort) ---
        priority_keywords = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus']
        
        def get_priority_score(item):
            text = (item.get('title', '') + ' ' + item.get('source', '') + ' ' + item.get('snippet', '')).lower()
            for k in priority_keywords:
                if k in text: return 2
            return 1
            
        # Resort results
        results.sort(key=lambda x: (get_priority_score(x), x.get('published', '')), reverse=True)
        
        return self.sorter.sort_results(results)

    def _fetch_and_store(self):
        print(f"🔄 [NewsFeeder] Determine Active Topics & Feeds...")
        from src.topic_manager import topic_manager
        active_topics = topic_manager.get_active_keywords()
        self.last_fetch = time.time()
        
        # --- Modular RSS Feeds Definition (Local Scope for Safety) ---
        TOPIC_FEEDS = {
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
            ]
        }
        
        # Build Target List
        all_target_feeds = [] # List of (url, topic_category)
        
        # 1. Topic Specifics
        if active_topics:
            for topic in active_topics:
                if topic in TOPIC_FEEDS:
                    for url in TOPIC_FEEDS[topic]:
                        all_target_feeds.append((url, topic))
                elif topic == "Christianity":
                    # Use the class-level default list (self.feeds)
                    for url in self.feeds:
                         all_target_feeds.append((url, "Christianity"))
        
        # 2. Fallback (Default to Christianity if nothing or explicit)
        if not all_target_feeds:
             print("⚠️ No specific topics active. Defaulting to Main Feed.")
             for url in self.feeds:
                 all_target_feeds.append((url, "Christianity"))
        

        # [FIX] ALWAYS fetch Priority Feeds (Jesus Redeems)
        # Identify JRM feeds from self.feeds (Strings containing 'jesus' or 'redeems')
        # Or hardcode the specific indices labels from __init__
        jrm_feeds = [
            'https://jesusredeems.com/feed',
            'https://news.google.com/rss/search?q=Jesus+Redeems+Ministries&hl=en-IN&gl=IN&ceid=IN:en',
            'https://news.google.com/rss/search?q=site:jesusredeems.com&hl=en-IN&gl=IN&ceid=IN:en'
        ]
        
        for url in jrm_feeds:
            # Avoid duplicates if already added via Christianity topic
            if not any(f[0] == url for f in all_target_feeds):
                all_target_feeds.append((url, "Christianity"))

        print(f"🔄 [NewsFeeder] Fetching from {len(all_target_feeds)} feeds...")

        def process_feed_entry(entry, source_name):
             image_url = self._extract_image(entry)
             url = entry.link
             title = entry.title
             stable_id = hashlib.md5(url.encode('utf-8')).hexdigest()
             timestamp = 0
             if hasattr(entry, 'published_parsed') and entry.published_parsed:
                 timestamp = time.mktime(entry.published_parsed)
             
             # Enhanced Image Fetching
             # [FIX] Resolve URL to get real metadata
             real_url = self._resolve_url(url)
             
             if not image_url: image_url = self._fetch_og_image(real_url)
             if not image_url: image_url = self._get_fallback_image(title)
             
             # Use Real URL for storage
             url = real_url
             
             clean_snippet = ""
             raw_summary = entry.get('summary', '')
             if raw_summary:
                 try:
                     clean_text = BeautifulSoup(raw_summary, "html.parser").get_text(separator=" ", strip=True)
                     clean_snippet = clean_text[:180] + '...' if len(clean_text) > 180 else clean_text
                 except: clean_snippet = raw_summary[:180] + '...'

             return {
                'id': stable_id, 
                'title': title,
                'url': url,
                'published': entry.get('published', ''),
                'source': source_name,
                'image': image_url,
                'guid': entry.get('guid', url),
                'timestamp': timestamp,
                'snippet': clean_snippet
             }

        raw_items = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            # Map future to (url, category)
            future_to_meta = {executor.submit(feedparser.parse, url): category for url, category in all_target_feeds}
            for future in as_completed(future_to_meta):
                 category = future_to_meta[future]
                 try:
                     feed = future.result()
                     if not feed.entries: continue
                     source_name = feed.feed.get('title', 'Unknown Source')
                     for entry in feed.entries:
                         raw_items.append((entry, source_name, category))
                 except: pass

        seen_titles = set()
        
        # Filters
        christian_keywords = ['church', 'christian', 'christ', 'jesus', 'mohan', 'bishop', 'pastor', 'ministry', 'diocese', 'vatican', 'catholic', 'protestant', 'CSI', 'gospel', 'prayer', 'worship', 'faith', 'bible', 'religious', 'persecution']
        christian_regex = re.compile('|'.join(map(re.escape, christian_keywords)), re.IGNORECASE)

        valid_news = []
        for entry, source_name, category in raw_items:
            title_normalized = entry.title.lower().strip()
            if title_normalized in seen_titles: continue
            
            # Content Filtering Logic
            if category == "Christianity":
                content_check = title_normalized + ' ' + entry.get('summary', '').lower()
                if not christian_regex.search(content_check): continue
            
            # For "Technology", "Science", "Sports", we TRUST the feed contents (no regex filter needed usually)
            # Or we could apply topic-specific regexes if needed. For now, trust the source.
            
            seen_titles.add(title_normalized)
            valid_news.append(process_feed_entry(entry, source_name))

        # Enrich Images (Top 20 needing images)
        items_needing_images = [item for item in valid_news if self._get_fallback_image(item['title']) == item['image']] # Logic check: fallback == current means no real image found
        # Actually simplified: if URL is from fallback list
        
        # Save to DB (UPSERT)
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        for item in valid_news:
            # Check exist
            c.execute("SELECT id FROM news WHERE id=?", (item['id'],))
            exists = c.fetchone()
            if exists:
                # Update but preserve approval
                c.execute('''UPDATE news SET title=?, url=?, published=?, source=?, image=?, timestamp=?, snippet=? WHERE id=?''',
                          (item['title'], item['url'], item['published'], item['source'], item['image'], item['timestamp'], item['snippet'], item['id']))
            else:
                c.execute('''INSERT INTO news (id, title, url, published, source, image, guid, timestamp, snippet, is_approved) VALUES (?,?,?,?,?,?,?,?,?,1)''',
                          (item['id'], item['title'], item['url'], item['published'], item['source'], item['image'], item['guid'], item['timestamp'], item['snippet']))
        
        # Cleanup
        # Increase window to 7 days and EXEMPT JRM content from aggressive deletion 
        # to ensure it stays in "Trending" even if updates are slow.
        cutoff = time.time() - (7 * 24 * 3600)
        c.execute("DELETE FROM news WHERE timestamp < ? AND is_approved = 1 AND title NOT LIKE '%Jesus%' AND title NOT LIKE '%Mohan%'", (cutoff,))
        conn.commit()
        conn.close()
        print("✅ [NewsFeeder] DB Updated.")

