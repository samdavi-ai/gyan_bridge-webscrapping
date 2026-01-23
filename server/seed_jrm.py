import sys
import os
sys.path.append(os.getcwd())

from src.video_engine import VideoEngine
import scrapetube
import time

def seed():
    print("🚀 Seeding Jesus Redeems Content...")
    engine = VideoEngine()
    
    # 1. Fetch from Channel
    print("   Fetching from channel 'jesusredeems'...")
    try:
        videos = scrapetube.get_channel(channel_username='jesusredeems', limit=10)
        processed = engine._process_videos(videos, source_tag="Seeder-Channel")
        if processed:
             engine._save_to_db(processed)
             print(f"   ✅ Saved {len(processed)} from Channel.")
    except Exception as e:
        print(f"   ❌ Channel seed failed: {e}")

    # 2. Fetch from Search (Backup)
    print("   Fetching from Search 'Jesus Redeems Ministries'...")
    try:
        videos = scrapetube.get_search("Jesus Redeems Ministries", limit=10)
        processed = engine._process_videos(videos, source_tag="Seeder-Search")
        if processed:
             engine._save_to_db(processed)
             print(f"   ✅ Saved {len(processed)} from Search.")
    except Exception as e:
        print(f"   ❌ Search seed failed: {e}")

    # 3. Fetch specific Mohan C Lazarus
    print("   Fetching 'Mohan C Lazarus'...")
    try:
        videos = scrapetube.get_search("Mohan C Lazarus Latest", limit=5)
        processed = engine._process_videos(videos, source_tag="Seeder-MCL")
        if processed:
             engine._save_to_db(processed)
             print(f"   ✅ Saved {len(processed)} from MCL.")
    except Exception as e:
        print(f"   ❌ MCL seed failed: {e}")

if __name__ == "__main__":
    seed()
