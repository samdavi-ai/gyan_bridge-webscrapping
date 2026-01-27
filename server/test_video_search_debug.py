import sys
import os
sys.path.append(os.getcwd())
from src.video_engine import VideoEngine
import scrapetube

def test_search():
    engine = VideoEngine()
    query = "jesus redeems ministries live"
    lang = "ta"
    
    print(f"🔬 Testing Search: '{query}' (Lang: {lang})")
    
    # Reproduce logic
    search_query = f"{query} Tamil"
    print(f"   Modified Query: '{search_query}'")
    
    try:
        print("   Calling scrapetube...")
        videos = list(scrapetube.get_search(search_query, limit=10))
        print(f"   ✅ Scrapetube found {len(videos)} raw items")
        
        if len(videos) > 0:
            print(f"   Sample Title: {videos[0].get('title', {}).get('runs', [{}])[0].get('text')}")
            
        processed = engine._process_videos(videos, source_tag="Debug")
        print(f"   ✅ Processed: {len(processed)} valid videos")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_search()
