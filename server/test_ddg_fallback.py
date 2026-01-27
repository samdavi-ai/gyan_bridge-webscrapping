from src.ddg_client import DDGClient
import sys

def test_ddg():
    print("🧪 Testing DuckDuckGo Fallback Client...")
    
    client = DDGClient()
    
    # 1. Test Video Search
    print("\n🎥 Testing Video Search (Query: 'jesus redeems live')...")
    videos = client.search_videos("jesus redeems live", limit=3)
    if videos:
        print(f"✅ Found {len(videos)} videos.")
        print(f"   Sample: {videos[0]['title']} ({videos[0]['url']})")
    else:
        print("❌ No videos found via DDG.")
        
    # 2. Test News Search
    print("\n📰 Testing News Search (Query: 'christian persecution report')...")
    news = client.search_news("christian persecution report", limit=3)
    if news:
        print(f"✅ Found {len(news)} news items.")
        print(f"   Sample: {news[0]['title']} - {news[0]['source']}")
    else:
        print("❌ No news found via DDG.")

if __name__ == "__main__":
    try:
        test_ddg()
        print("\n✅ Verification Complete.")
    except Exception as e:
        print(f"\n❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()
