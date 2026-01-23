import sqlite3
import scrapetube
import threading
import time
import json
import os
import difflib
import random
import concurrent.futures
from datetime import datetime

# Database File Path
DB_FILE = os.path.join(os.path.dirname(__file__), '..', 'videos.db')

from src.topic_manager import topic_manager
from src.geo_sorter import GeoSorter

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
    "mkbhd",                 # MKBHD
    "veritasium",            # Veritasium
    "LinusTechTips",         # Linus Tech Tips
    "TED",                   # TED
    "mrwhosetheboss",        # MrWhoseTheboss
    "UnboxTherapy",          # Unbox Therapy
    "MarquesBrownleeClips",  # MKBHD Clips
    "TechLinked",            # Tech Linked (LTT)
    "ColdFusion",            # ColdFusion
    "Dave2D",                # Dave Lee
    "JerryRigEverything",    # Durability tests
    "Computerphile",         # Computer science
    "TwoMinutePapers",       # AI & research
    "Fireship",              # Dev & tech humor
    "AndroidAuthority"       # Android tech
]

# "Science" Module
SCIENCE_CHANNELS = [
    "Kurzgesagt",            # Kurzgesagt
    "scishow",               # SciShow
    "smartereveryday",       # Smarter Every Day
    "nasa",                  # NASA
    "NationalGeographic",    # Nat Geo
    "VergeScience",          # Verge Science
    "PBSspaceTime",          # Space & physics
    "AsapSCIENCE",           # Asap Science
    "minutephysics",         # Minute Physics
    "SciShowSpace",          # Space science
    "PracticalEngineering",  # Engineering concepts
    "Seeker",                # Science + future
    "PhysicsGirl",           # Physics explained
    "DeepLook",              # Microscopic science
    "RealEngineering"        # Engineering stories
]

# "Sports" Module
SPORTS_CHANNELS = [
    "ESPN",                  # ESPN
    "NBA",                   # NBA
    "ICC",                   # ICC Cricket
    "olympics",              # Olympics
    "FIFA",                  # FIFA
    "SkySports",             # Sky Sports
    "FoxSports",             # Fox Sports
    "BTsport",               # BT Sport
    "NFL",                   # NFL
    "UFC",                   # UFC
    "Formula1",              # Formula 1
    "MotoGP",                # MotoGP
    "SonySportsNetwork",     # Indian sports
    "StarSports",            # Star Sports
    "CricketAustralia"       # Cricket Australia
]

# "Global News" Module
NEWS_CHANNELS = [
    "BBCNews",               # BBC
    "AlJazeeraEnglish",      # Al Jazeera
    "DWNews",                # DW News
    "CNN",                   # CNN
    "Reuters",               # Reuters
    "AP",                    # Associated Press
    "SkyNews",               # Sky News
    "France24English",       # France 24
    "WION",                  # WION India
    "ABCNews",               # ABC News
    "NBCNews",               # NBC News
    "CBSNews",               # CBS News
    "Euronews",              # Euro News
    "UN",                    # United Nations
    "TheEconomist"           # The Economist
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
        self.cleanup_irrelevant_videos() # [Fix] Clean on startup

    def _init_db(self):
        """Initialize the SQLite database. Creates if not exists."""
        conn = sqlite3.connect(DB_FILE, timeout=30.0, check_same_thread=False)
        c = conn.cursor()
        # [CRITICAL] Enable WAL mode
        c.execute('PRAGMA journal_mode=WAL;')
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

    def force_update(self):
        """Manual update trigger."""
        print("🔄 [VideoEngine] Force update triggered...")
        self.cleanup_irrelevant_videos()
        self._fetch_cycle()

    def cleanup_irrelevant_videos(self):
        """Strictly remove videos that don't match active topics (except JRM)."""
        active_topics = topic_manager.get_active_keywords()
        if not active_topics: return # If no strict control, leave as is (or default cleanup)
        
        print(f"🧹 [VideoEngine] Cleaning videos not matching: {active_topics}")
        try:
            conn = sqlite3.connect(DB_FILE, timeout=30.0, check_same_thread=False)
            c = conn.cursor()
            
            # Simple retrieval to filter in python (easier than complex SQL LIKEs)
            c.execute("SELECT id, title, channel FROM videos") 
            
            rows = c.fetchall()
            ids_to_delete = []
            
            priority_keywords = ['jesus redeems', 'mohan c lazarus', 'jrm']
            # Re-use topic keywords logic or just strict topic match?
            # User wants strict control.
            
            for r in rows:
                vid, title, channel = r[0], r[1], r[2] 
                text = (title + ' ' + channel).lower()
                
                # SAVE JRM
                if any(k in text for k in priority_keywords):
                    continue
                    
                # Check match
                matched = False
                for t in active_topics:
                    if t.lower() in text:
                        matched = True
                        break
                
                # Also check common christian terms if Christianity is active
                if not matched and "Christianity" in active_topics:
                     christian_terms = ['church', 'jesus', 'christ', 'gospel', 'worship', 'pastor', 'bible']
                     if any(ct in text for ct in christian_terms):
                         matched = True
                
                if not matched:
                    ids_to_delete.append(vid)
            
            if ids_to_delete:
                print(f"🧹 [VideoEngine] Deleting {len(ids_to_delete)} irrelevant videos...")
                # Chunk deletions
                for i in range(0, len(ids_to_delete), 50):
                    batch = ids_to_delete[i:i+50]
                    placeholders = ','.join('?' * len(batch))
                    c.execute(f"DELETE FROM videos WHERE id IN ({placeholders})", batch)
                conn.commit()
            
            conn.close()
        except Exception as e:
            print(f"⚠️ [VideoEngine] Cleanup error: {e}")

    def _update_loop(self):
        """Main loop: Updates videos every 45 minutes."""
        # Initial wait to let server start up
        time.sleep(2) 
        
        # Check if DB is empty, if so, trigger immediate fetch
        if not self.get_all_videos():
             print("🔄 [VideoEngine] DB Empty. Triggering initial fetch...")
             self._fetch_cycle()
        else:
             print("✅ [VideoEngine] DB Populated. Waiting for next schedule.")
        
        while not self.stop_event.is_set():
            time.sleep(45 * 60) # 45 minutes
            print("🔄 [VideoEngine] Starting scheduled update cycle...")
            self.cleanup_irrelevant_videos() # Ensure clean slate before/after
            self._fetch_cycle()

    def _fetch_cycle(self):
        """Orchestrates the fetching from Channels and Topics with Multilingual support."""
        new_items = []
        
        # 1. Determine Active Channels based on Super Admin Topics
        active_topics = topic_manager.get_active_keywords()
        target_channels = set()
        
        if active_topics:
            for topic in active_topics:
                if topic in TOPIC_CHANNEL_MAP:
                    target_channels.update(TOPIC_CHANNEL_MAP[topic])
        
        # Fallback to Christianity if nothing or explicit
        if not target_channels and not active_topics:
             print("⚠️ [VideoEngine] No topics active. Defaulting to Christianity.")
             target_channels.update(CHRISTIAN_CHANNELS)
            
        # [FIX] ALWAYS fetch Priority Channels (Jesus Redeems)
        priority_channels = ["jesusredeems"] 
        target_channels.update(priority_channels)

        print(f"🔄 [VideoEngine] Fetching from {len(target_channels)} channels (Topics: {active_topics})...")

        # 1. Fetch from Channels
        for channel in target_channels:
            try:
                # [ENHANCED] Try channel fetch, fallback to search if channel blocked/failing
                try:
                    videos = scrapetube.get_channel(channel_username=channel, limit=3)
                    processed = self._process_videos(videos, source_tag="Channel")
                    if not processed: raise Exception("No videos in channel stream")
                    new_items.extend(processed)
                except Exception:
                    # Fallback to search for the channel name
                    search_query = channel if channel != "jesusredeems" else "Jesus Redeems Ministries"
                    videos = scrapetube.get_search(search_query, limit=3)
                    processed = self._process_videos(videos, source_tag="ChannelFallback")
                    new_items.extend(processed)
            except Exception: pass
            time.sleep(1.0) # Be polite

        # 2. Fetch from Topics (Multilingual: En, Ta, Hi)
        base_topics = active_topics or ["Christianity"]
        for topic in base_topics:
             try:
                 # English
                 new_items.extend(self._process_videos(scrapetube.get_search(f"{topic} latest", limit=5), f"Topic-En:{topic}"))
                 # Tamil
                 new_items.extend(self._process_videos(scrapetube.get_search(f"{topic} Tamil", limit=3), f"Topic-Ta:{topic}"))
                 # Hindi
                 new_items.extend(self._process_videos(scrapetube.get_search(f"{topic} Hindi", limit=3), f"Topic-Hi:{topic}"))
             except Exception: pass

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
                    
                    # Extract best thumbnail using actual YouTube data
                    thumbnails = video['thumbnail']['thumbnails']
                    if thumbnails:
                        # Use the highest quality thumbnail available
                        # YouTube provides: default (120x90), medium (320x180), high (480x360), standard (640x480), maxres (1280x720)
                        thumbnail_url = thumbnails[-1]['url']  # Last one is usually highest quality
                        
                        # Try to upgrade to hqdefault (more reliable than maxresdefault)
                        if 'hqdefault' in thumbnail_url or 'mqdefault' in thumbnail_url or 'sddefault' in thumbnail_url:
                            thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                    else:
                        thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                    
                    # Extract Channel Name
                    channel_name = video.get('ownerText', {}).get('runs', [{}])[0].get('text', 'Unknown')
                    
                    # Basic Metadata
                    view_count = video.get('viewCountText', {}).get('simpleText', '0 views')
                    published = video.get('publishedTimeText', {}).get('simpleText', 'Recently')
                    duration = video.get('lengthText', {}).get('simpleText', '00:00')

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
                        'duration': duration,
                        'timestamp': time.time(),
                        'source_type': 'youtube'
                    })
                except KeyError:
                    continue
        except Exception as e:
            # print(f"⚠️ [VideoEngine] Error processing {source_tag} stream: {e}")
            pass
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
        conn = sqlite3.connect(DB_FILE, timeout=60.0, check_same_thread=False)
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
            limit = count - 200
            c.execute("DELETE FROM videos WHERE id IN (SELECT id FROM videos ORDER BY timestamp ASC LIMIT ?)", (limit,))
            conn.commit()

        conn.close()
        if saved_count > 0:
            print(f"✅ [VideoEngine] Saved {saved_count} new videos to DB.")

    def get_trending(self, limit=50):
        """Fetch videos for the Feed (Approved Only)."""
        conn = sqlite3.connect(DB_FILE, timeout=60.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        try:
            c.execute("SELECT * FROM videos WHERE is_approved = 1 ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = c.fetchall()
        except Exception:
            rows = []
        conn.close()
        
        if not rows:
             pass 
             
        # Convert to dicts
        all_videos = [dict(row) for row in rows]
        
        # --- PRIORITY BOOST: Jesus Redeems Ministries ---
        priority_keywords = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus']
        
        def get_priority_score(item):
            # Higher score = top of list
            text = (item.get('title', '') + ' ' + item.get('channel', '')).lower()
            for k in priority_keywords:
                if k in text: 
                    return 100  # High Priority
            return 1 # Normal
            
        # Sort: Primary = Priority (Desc), Secondary = Timestamp (Desc)
        all_videos.sort(key=lambda x: (get_priority_score(x), x.get('timestamp', 0)), reverse=True)
        # ------------------------------------------------
        
        # Apply Geo-Sorting
        sorter = GeoSorter()
        return sorter.sort_results(all_videos)

    def get_all_videos(self):
        """Admin: Fetch all videos."""
        conn = sqlite3.connect(DB_FILE, timeout=60.0, check_same_thread=False)
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
        conn = sqlite3.connect(DB_FILE, timeout=60.0, check_same_thread=False)
        c = conn.cursor()
        c.execute("UPDATE videos SET is_approved = ? WHERE id = ?", (1 if status else 0, video_id))
        conn.commit()
        conn.close()
        return True

    def search(self, query, limit=50, lang='en', apply_strict=True):
        """
        Live Search for Videos with Relevance Ranking.
        """
        results = []
        try:
            print(f"🎥 [VideoEngine] YouTube search request: '{query}' (Lang: {lang})")
            
            # [STRICT TOPIC CONTROL]
            # Only apply if specifically requested (default) AND unrelated to priority content
            if apply_strict:
                active_topics = topic_manager.get_active_keywords()
                if active_topics:
                    topic_constraint = " (" + " OR ".join([f'"{t}"' for t in active_topics]) + ")"
                    if not any(t.lower() in query.lower() for t in active_topics):
                         query += topic_constraint
                         print(f"🔒 [VideoEngine] Strict Topic applied: {query}")

            # Build search query - keep it simple and accurate
            match lang:
                case 'hi':
                    search_query = f"{query} Hindi" if query.isascii() else query
                case 'ta':
                    search_query = f"{query} Tamil" if query.isascii() else query
                case _:
                    search_query = query
            
            print(f"🔍 [VideoEngine] Final YouTube query: '{search_query}'")
            
            # Use scrapetube for YouTube search with timeout protection
            try:
                videos = scrapetube.get_search(search_query, limit=min(limit * 2, 100))  # Fetch more for better filtering
            except Exception as e:
                print(f"⚠️ [VideoEngine] scrapetube.get_search failed: {e}")
                # Return empty list instead of crashing
                return []
            
            # Normalize to match our internal format
            normalized_results = self._process_videos(videos, source_tag="Search")
            
            # Add 'source_type' for frontend and calculate relevance
            for nr in normalized_results:
                nr['source_type'] = 'youtube'
                nr['image'] = nr.get('thumbnail')
                
                # Relevance Scoring (Neutral internet-standard ranking)
                relevance_score = 0
                query_lower = query.lower()
                title_lower = nr.get('title', '').lower()
                channel_lower = nr.get('channel', '').lower()
                
                # 1. Exact phrase match in title (Highest relevance)
                if query_lower in title_lower:
                    relevance_score += 50
                    
                # 2. Individual word match in title
                for word in query_lower.split():
                    if len(word) > 2 and word in title_lower:
                        relevance_score += 10
                        
                # 3. Channel name match
                if query_lower in channel_lower:
                    relevance_score += 20
                
                nr['_relevance'] = relevance_score
                results.append(nr)
                
            # Sort by relevance
            results.sort(key=lambda x: x.get('_relevance', 0), reverse=True)
            
            # Remove relevance score before returning (internal use only)
            for r in results:
                r.pop('_relevance', None)
                
            print(f"✅ [VideoEngine] Found {len(results)} results for '{query}'")
            return results[:limit]  # Return only requested limit
                
        except Exception as e:
            print(f"❌ [VideoEngine] Search failed: {e}")
            return []

    def get_videos_by_language(self, lang, limit=50, topic_query=None):
        """Unified Master Video Search: En + Ta + Hi mixed."""
        
        searches = [
            {'lang': 'en', 'q': topic_query if topic_query else "Christian Gospel"},
            {'lang': 'ta', 'q': f"{topic_query} Tamil" if topic_query else "தமிழ் கிறிஸ்தவ பாடல்கள்"},
            {'lang': 'hi', 'q': f"{topic_query} Hindi" if topic_query else "यीशु मसीह के गीत और संदेश"}
        ]
        
        all_results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_to_search = {
                executor.submit(self.search, s['q'], limit=20, lang=s['lang']): s 
                for s in searches
            }
            for future in concurrent.futures.as_completed(future_to_search):
                try:
                    all_results.extend(future.result())
                except: pass
                
        # Deduplicate
        unique_results = []
        seen_ids = set()
        for r in all_results:
            if r['id'] not in seen_ids:
                seen_ids.add(r['id'])
                unique_results.append(r)
        
        # [IMPROVED] Inject JRM videos from DB to ensure they are present
        # Because general "Christianity" search might miss specific JRM content
        jrm_videos = self.get_trending(limit=5) # This gets JRM-sorted videos
        for v in jrm_videos:
            if v['id'] not in seen_ids:
                # Add JRM video if not already in search results
                unique_results.append(v)
                seen_ids.add(v['id'])

        # Priority Sort
        priority_keywords = ['jesus redeems', 'mohan c lazarus', 'mohan c. lazarus', 'jrm']
        def get_priority_score(item):
            text = (item.get('title', '') + ' ' + item.get('channel', '')).lower()
            for k in priority_keywords:
                 # Massive boost to ensure they are noticeably first
                 if k in text: return 1000 
            return 1
            
        unique_results.sort(key=lambda x: (get_priority_score(x), x.get('timestamp', 0)), reverse=True)

        # Apply Geo-Sorting
        sorter = GeoSorter()
        return sorter.sort_results(unique_results)
