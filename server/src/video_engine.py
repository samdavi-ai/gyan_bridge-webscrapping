import sqlite3
import scrapetube
import threading
import time
import json
import os
import difflib
import random
from datetime import datetime

# Database File Path
DB_FILE = os.path.join(os.path.dirname(__file__), '..', 'videos.db')

from src.topic_manager import topic_manager

# Curated Channel Modules
# "Christianity" Module (Default)
CHRISTIAN_CHANNELS = [
    "jesusredeems",      # Jesus Redeems Ministries (High Priority)
    "vaticannews",       # Vatican News
    "thebibleproject",   # The Bible Project
    "desiringGod",       # Desiring God
    "gospelcoalition",   # The Gospel Coalition
    "AscensionPresents", # Ascension Presents
    "700club",           # The 700 Club
    "CBNNews",           # CBN News
    "CatholicNewsAgency",# CNA
    "AOIMin",            # Alpha Omega Ministries
    "WretchedNetwork",   # Wretched
    "CrosswayBooks",     # Crossway
    "Ligonierministries" # Ligonier
]

# "Technology" Module
TECH_CHANNELS = [
    "mkbhd",             # MKBHD
    "veritasium",        # Veritasium
    "LinusTechTips",     # Linus Tech Tips
    "TED",               # TED
    "mrwhosetheboss"     # MrWhoseTheBoss
]

# "Science" Module
SCIENCE_CHANNELS = [
    "Kurzgesagt",        # Kurzgesagt
    "scishow",           # SciShow
    "smartereveryday",   # Smarter Every Day
    "nasa",              # NASA
    "NationalGeographic" # Nat Geo
]

# "Sports" Module
SPORTS_CHANNELS = [
    "ESPN",              # ESPN
    "NBA",               # NBA
    "ICC",               # ICC Cricket
    "olympics",          # Olympics
    "FIFA"               # FIFA
]

# "Global News" Module
NEWS_CHANNELS = [
    "BBCNews",           # BBC
    "AlJazeeraEnglish",  # Al Jazeera
    "DWNews",            # DW News
    "CNN"                # CNN
]

# Map Topic Keys (from Super Admin) to Channel Lists
TOPIC_CHANNEL_MAP = {
    "Christianity": CHRISTIAN_CHANNELS,
    "Technology": TECH_CHANNELS,
    "Science": SCIENCE_CHANNELS,
    "Sports": SPORTS_CHANNELS,
    "Global News": NEWS_CHANNELS
}


# Topics for discovery (Backup/Variety)
TARGET_TOPICS = [
    "Christian World News 2024",
    "Christian Persecution Report",
    "Latest Worship Songs 2024",
    "Christian Testimony 2024",
    "Jesus Redeems Ministries",
    "Jesus Redeems Testimony"
]

class VideoEngine:
    def __init__(self):
        self._init_db()
        self.stop_event = threading.Event()

    def _init_db(self):
        """Initialize the SQLite database. Creates if not exists."""
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY,
                title TEXT,
                url TEXT,
                thumbnail TEXT,
                channel TEXT,
                views TEXT,
                published TEXT,
                timestamp REAL,
                is_approved INTEGER DEFAULT 1
            )
        ''')
        conn.commit()
        conn.close()

    def reset_database(self):
        """Wipes and recreates the database for a fresh start."""
        print("⚠️ [VideoEngine] RESETTING DATABASE...")
        if os.path.exists(DB_FILE):
             try:
                 os.remove(DB_FILE)
             except Exception as e:
                 print(f"❌ [VideoEngine] Failed to delete DB: {e}")
        
        self._init_db()
        print("✅ [VideoEngine] Database reset complete.")

    def start_background_worker(self):
        """Starts the background thread."""
        threading.Thread(target=self._update_loop, daemon=True).start()

    def _update_loop(self):
        """Main loop: Updates videos every 45 minutes."""
        # Initial wait to let server start up
        time.sleep(2) 
        
        # Check if DB is empty, if so, trigger immediate fetch
        if not self.get_all_videos():
             print("🔄 [VideoEngine] DB Empty. Triggering initial fetch...")
             self._fetch_cycle()
        
        while not self.stop_event.is_set():
            time.sleep(45 * 60) # 45 minutes
            print("🔄 [VideoEngine] Starting scheduled update cycle...")
            self._fetch_cycle()

    def _fetch_cycle(self):
        """Orchestrates the fetching from Channels and Topics."""
        new_items = []
        
        # 1. Determine Active Channels based on Super Admin Topics
        active_topics = topic_manager.get_active_keywords()
        target_channels = set()
        
        if active_topics:
            for topic in active_topics:
                if topic in TOPIC_CHANNEL_MAP:
                    target_channels.update(TOPIC_CHANNEL_MAP[topic])
        
        # Fallback ONLY if absolutely no topics selected (safety net)
        # But strictly, if user disables everything, they get nothing.
        # Let's add Christianity by default if list is empty to prevent empty DB?
        # User said "Super Admin chooses". So if they chose nothing, they get nothing.
        # But let's assume they want Christianity if nothing else is configured?
        # Let's trust the map.
        
        if not target_channels and not active_topics:
             print("⚠️ [VideoEngine] No topics active. Defaulting to Christianity.")
             target_channels.update(CHRISTIAN_CHANNELS)
            
        print(f"🔄 [VideoEngine] Fetching from {len(target_channels)} channels (Topics: {active_topics})...")

        # 1. Fetch from Channels
        for channel in target_channels:
            try:
                # Fetch last 3 videos from each channel
                videos = scrapetube.get_channel(channel_username=channel, limit=3)
                processed = self._process_videos(videos, source_tag="Channel")
                new_items.extend(processed)
            except Exception as e:
                # print(f"⚠️ [VideoEngine] Failed to fetch channel '{channel}': {e}")
                pass

        # 2. Fetch from Topics (Dynamic)
        # Scan active topics and search loosely for them
        for topic in active_topics or ["Christianity"]:
             try:
                 query = f"{topic} latest"
                 videos = scrapetube.get_search(query, limit=5)
                 processed = self._process_videos(videos, source_tag="Topic")
                 new_items.extend(processed)
             except Exception as e:
                 pass

        # 3. Deduplicate and Save
        if new_items:
            self._save_to_db(new_items)
            print(f"✅ [VideoEngine] Cycle complete. Processed {len(new_items)} candidates.")
        else:
            print("⚠️ [VideoEngine] No videos found this cycle.")

    def _process_videos(self, video_generator, source_tag=""):
        """Normalizes video data from scrapetube generators."""
        results = []
        try:
            for video in video_generator:
                try:
                    video_id = video['videoId']
                    title = video['title']['runs'][0]['text']
                    
                    # Extract best thumbnail - prefer maxresdefault
                    thumbnails = video['thumbnail']['thumbnails']
                    if thumbnails:
                        # Try to get highest quality
                        thumbnail_url = thumbnails[-1]['url']
                        # Clean URL and use maxresdefault for better quality
                        if 'hqdefault' in thumbnail_url or 'mqdefault' in thumbnail_url:
                            thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
                    else:
                        thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
                    
                    # Extract Channel Name
                    channel_name = video.get('ownerText', {}).get('runs', [{}])[0].get('text', 'Unknown')
                    
                    # Basic Metadata
                    view_count = video.get('viewCountText', {}).get('simpleText', '0 views')
                    published = video.get('publishedTimeText', {}).get('simpleText', 'Recently')

                    results.append({
                        'id': video_id,
                        'title': title,
                        'url': f"https://www.youtube.com/watch?v={video_id}",
                        'thumbnail': thumbnail_url,
                        'image': thumbnail_url,  # Frontend expects 'image' key
                        'channel': channel_name,
                        'source': channel_name,  # Alias for consistency
                        'views': view_count,
                        'published': published,
                        'timestamp': time.time(),
                        'source_type': 'youtube'
                    })
                except KeyError:
                    continue
        except Exception as e:
            print(f"⚠️ [VideoEngine] Error processing {source_tag} stream: {e}")
        return results

    def _is_fuzzy_duplicate(self, title, existing_titles, threshold=0.85):
        """Checks if title is too similar to any existing title."""
        # Normalize: lowercase, remove punctuation for comparison
        norm_title = "".join(e for e in title.lower() if e.isalnum())
        
        if not norm_title: return False

        for existing in existing_titles:
            norm_existing = "".join(e for e in existing.lower() if e.isalnum())
            if not norm_existing: continue
            
            # Direct match check
            if norm_title == norm_existing:
                return True
                
            # Fuzzy match check
            ratio = difflib.SequenceMatcher(None, norm_title, norm_existing).ratio()
            if ratio > threshold:
                return True
        return False

    def _save_to_db(self, videos):
        """Saves videos with strict deduplication."""
        conn = sqlite3.connect(DB_FILE)
        # Handle 'is_approved' column check/migration just in case
        try:
             conn.execute("SELECT is_approved FROM videos LIMIT 1")
        except:
             try: conn.execute("ALTER TABLE videos ADD COLUMN is_approved INTEGER DEFAULT 1")
             except: pass
        
        # Get existing titles for fuzzy dedup
        existing_rows = conn.execute("SELECT title FROM videos").fetchall()
        existing_titles = [r[0] for r in existing_rows]
        
        c = conn.cursor()
        saved_count = 0
        
        for v in videos:
            # 1. Check ID existence (Absolute Duplicate)
            c.execute("SELECT id FROM videos WHERE id=?", (v['id'],))
            if c.fetchone():
                continue # Skip ID duplicates
            
            # 2. Check Fuzzy Title (Near Duplicate)
            if self._is_fuzzy_duplicate(v['title'], existing_titles):
                # print(f"  [Dedup] Skipping similar: {v['title']}")
                continue

            # 3. Insert
            c.execute('''
                INSERT INTO videos (id, title, url, thumbnail, channel, views, published, timestamp, is_approved)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ''', (v['id'], v['title'], v['url'], v['thumbnail'], v['channel'], v['views'], v['published'], v['timestamp']))
            
            existing_titles.append(v['title']) # Update local list for subsequent checks in this batch
            saved_count += 1
            
        conn.commit()
        
        # Cleanup: Keep max 200 videos, delete oldest
        c.execute("SELECT COUNT(*) FROM videos")
        count = c.fetchone()[0]
        if count > 200:
            # Retrieve IDs of oldest videos ensuring we keep APPROVED ones if possible? 
            # Strategy: Delete oldest videos regardless of approval? 
            # Better: Delete oldest, but maybe keep 'featured'? For now, simple FIFO.
            limit = count - 200
            c.execute("DELETE FROM videos WHERE id IN (SELECT id FROM videos ORDER BY timestamp ASC LIMIT ?)", (limit,))
            conn.commit()

        conn.close()
        if saved_count > 0:
            print(f"✅ [VideoEngine] Saved {saved_count} new videos to DB.")

    def get_trending(self, limit=50):
        """Fetch videos for the Feed (Approved Only)."""
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        try:
            c.execute("SELECT * FROM videos WHERE is_approved = 1 ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = c.fetchall()
        except Exception:
            rows = []
        conn.close()
        
        if not rows:
             # Fallback if DB is completely empty (e.g. first run)
             # self._fetch_cycle() # Dangerous to call here if it takes long?
             pass 
             
        return [dict(row) for row in rows]

    def get_all_videos(self):
        """Admin: Fetch all videos."""
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        try:
            c.execute("SELECT * FROM videos ORDER BY timestamp DESC")
            rows = c.fetchall()
        except: rows = []
        conn.close()
        return [dict(row) for row in rows]

    def toggle_approval(self, video_id, status):
        """Admin: Toggle approval."""
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE videos SET is_approved = ? WHERE id = ?", (1 if status else 0, video_id))
        conn.commit()
        conn.close()
        return True

    def search(self, query, limit=20, lang='en'):
        """
        Live Search for Videos.
        """
        results = []
        try:
            # 1. Enforce Strict Topic Context
            active_topics = topic_manager.get_active_keywords()
            context_keywords = [t for t in active_topics if t not in ["Christianity", "Global News"]]
            
            # If we have strict topics (Science, Tech, Sports), append them to the query
            # This ensures "Stars" -> "Stars Science" and "Song" -> "Song Science"
            if context_keywords:
                 topic_suffix = " ".join(context_keywords)
                 query = f"{query} {topic_suffix}"

            # 2. Add Language Context
            if lang == 'hi':
                 search_query = f"{query} hindi" 
            elif lang == 'ta':
                 search_query = f"{query} tamil"
            else:
                 search_query = query 


            
            print(f"🔎 [VideoEngine] Searching YouTube for: {search_query} (Lang: {lang})")
            videos = scrapetube.get_search(search_query, limit=limit)
            
            # Normalize to match our internal format
            normalized_results = self._process_videos(videos, source_tag="Search")
            
            # Add 'source_type' for frontend
            for nr in normalized_results:
                nr['source_type'] = 'video'
                # Ensure 'image' key exists if frontend expects it (News uses 'image', Video uses 'thumbnail')
                nr['image'] = nr['thumbnail']
                results.append(nr)
                
        except Exception as e:
            print(f"❌ [VideoEngine] Search failed: {e}")
            
        # Priority Boosting: Jesus Redeems / Mohan C Lazarus
        priority_keywords = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus']
        
        def get_priority_score(video):
             score = 0
             text = (video.get('title', '') + ' ' + video.get('channel', '')).lower()
             for k in priority_keywords:
                 if k in text: score += 10
             return score

        results.sort(key=get_priority_score, reverse=True)
        return results

    def get_videos_by_language(self, lang, limit=50, topic_query=None):
        """Fetch localized videos via Search. If topic_query is active, use it."""
        if topic_query:
             # Topic Translation Map
             transl_map = {
                 'en': {"Sports": "Sports", "Christianity": "Christianity", "Science": "Science", "Technology": "Technology", "Business": "Business"},
                 'hi': {"Sports": "खेल", "Christianity": "ईसाई धर्म", "Science": "विज्ञान", "Technology": "प्रौद्योगिकी", "Business": "व्यापार"},
                 'ta': {"Sports": "விளையாட்டு", "Christianity": "கிறிஸ்தவம்", "Science": "அறிவியல்", "Technology": "தொழில்நுட்பம்", "Business": "வர்த்தகம்"},
                 'ml': {"Sports": "കായികം", "Christianity": "ക്രിസ്തുമതം", "Science": "ശാസ്ത്രം"},
                 'te': {"Sports": "క్రీడలు", "Christianity": "క్రైస్తవ మతం", "Science": "సైన్స్"}
             }
             
             final_query = topic_query
             if lang in transl_map:
                 for en_key, local_val in transl_map[lang].items():
                     final_query = final_query.replace(f'"{en_key}"', f'"{local_val}"')
                     final_query = final_query.replace(en_key, local_val)
             
             return self.search(final_query, limit=limit, lang=lang)

        if lang == 'hi':
            query = "यीशु मसीह के गीत और संदेश" # Jesus Songs & Messages
        elif lang == 'ta':
            query = "தமிழ் கிறிஸ்தவ பாடல்கள்" # Tamil Christian Songs
        else:
            query = "Christian Gospel"
            
        return self.search(query, limit=limit, lang=lang)

# Singleton Interface (optional, if needed by api.py import style)
# engine = VideoEngine() 
