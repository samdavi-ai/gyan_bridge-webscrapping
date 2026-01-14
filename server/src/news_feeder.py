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
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
from src.geo_sorter import GeoSorter

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

        self.FALLBACK_IMAGES = [
            "https://images.unsplash.com/photo-1548625361-bd8bdccc5d30?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1601142634808-38923eb7c560?auto=format&fit=crop&q=80&w=800",
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

    def _fetch_og_image(self, url):
        try:
            final_resp = self.session.get(url, timeout=5, stream=True, allow_redirects=True)
            final_url = final_resp.url
            if 'text/html' in final_resp.headers.get('Content-Type', ''):
                downloaded = trafilatura.fetch_url(final_url)
                if downloaded:
                    metadata = trafilatura.extract_metadata(downloaded)
                    if metadata and metadata.image: return metadata.image
            if final_resp.status_code == 200:
                soup = BeautifulSoup(final_resp.content, 'html.parser')
                og_image = soup.find("meta", property="og:image")
                if og_image and og_image.get("content"): return og_image["content"]
        except: pass 
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
        
        # Geo Sort (Optional enhancement)
        try:
             return self.sorter.sort_results(all_news)
        except:
             return all_news

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

    def search(self, query, limit=20):
        """Live search using Google News RSS."""
        import urllib.parse
        encoded = urllib.parse.quote(query)
        # Use India context to match the rest of the app's focus
        rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=en-IN&gl=IN&ceid=IN:en"
        
        try:
            feed = feedparser.parse(rss_url)
            results = []
            for entry in feed.entries[:limit]:
                 # Reuse simple parsing
                 img = self._extract_image(entry) or self._get_fallback_image(entry.title)
                 
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
                     'url': entry.link,
                     'published': entry.get('published', ''),
                     'source': feed.feed.get('title', 'Google News'),
                     'image': img,
                     'snippet': clean_snippet,
                     'source_type': 'news' 
                 })
            return results
        except Exception as e:
            print(f"News Search Error: {e}")
            return []

    def _fetch_and_store(self):
        print("🔄 [NewsFeeder] Fetching fresh news...")
        self.last_fetch = time.time()
        
        def fetch_feed(url):
            try: return feedparser.parse(url) 
            except: return None

        def process_feed_entry(entry, source_name):
             image_url = self._extract_image(entry)
             url = entry.link
             title = entry.title
             stable_id = hashlib.md5(url.encode('utf-8')).hexdigest()
             timestamp = 0
             if hasattr(entry, 'published_parsed') and entry.published_parsed:
                 timestamp = time.mktime(entry.published_parsed)
             
             if not image_url: image_url = self._get_fallback_image(title)
             
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
            future_to_url = {executor.submit(feedparser.parse, url): url for url in self.feeds}
            for future in as_completed(future_to_url):
                 try:
                     feed = future.result()
                     if not feed.entries: continue
                     source_name = feed.feed.get('title', 'Unknown Source')
                     for entry in feed.entries:
                         raw_items.append((entry, source_name))
                 except: pass

        seen_titles = set()
        christian_keywords = ['church', 'christian', 'christ', 'bishop', 'pastor', 'ministry', 'diocese', 'vatican', 'catholic', 'protestant', 'CSI', 'gospel', 'prayer', 'worship', 'faith', 'bible', 'religious', 'persecution']
        keyword_regex = re.compile('|'.join(map(re.escape, christian_keywords)), re.IGNORECASE)

        valid_news = []
        for entry, source_name in raw_items:
            title_normalized = entry.title.lower().strip()
            if title_normalized in seen_titles: continue
            content_check = title_normalized + ' ' + entry.get('summary', '').lower()
            if not keyword_regex.search(content_check): continue
            
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
        cutoff = time.time() - (3 * 24 * 3600)
        c.execute("DELETE FROM news WHERE timestamp < ? AND is_approved = 1", (cutoff,))
        conn.commit()
        conn.close()
        print("✅ [NewsFeeder] DB Updated.")

