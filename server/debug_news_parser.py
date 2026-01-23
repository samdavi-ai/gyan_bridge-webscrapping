import asyncio
import aiohttp
import feedparser
import random
from bs4 import BeautifulSoup

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
]

URL = 'https://news.google.com/rss/search?q=Christianity+India&hl=en-IN&gl=IN&ceid=IN:en'

async def debug_feed():
    print(f"DEBUG: Fetching {URL}...")
    try:
        async with aiohttp.ClientSession(headers={'User-Agent': random.choice(USER_AGENTS)}) as session:
            async with session.get(URL, timeout=10) as response:
                print(f"DEBUG: Status Code: {response.status}")
                if response.status != 200:
                    print("DEBUG: Failed to fetch.")
                    return
                
                xml_data = await response.text()
                print(f"DEBUG: XML Data Length: {len(xml_data)}")
                
                feed = feedparser.parse(xml_data)
                print(f"DEBUG: Feed Entries Found: {len(feed.entries)}")
                
                if not feed.entries:
                    print("DEBUG: No entries parsed. Dumping first 500 chars of XML:")
                    print(xml_data[:500])
                    return

                for i, entry in enumerate(feed.entries[:3]):
                    print(f"\n--- Entry {i} ---")
                    print(f"Title: {entry.get('title', 'N/A')}")
                    print(f"Link: {entry.get('link', 'N/A')}")
                    
                    if not hasattr(entry, 'link'):
                        print("DEBUG: SKIPPING - No link attribute")
                    else:
                        print("DEBUG: Valid Entry (would be processed)")

    except Exception as e:
        print(f"DEBUG: Exception: {e}")

if __name__ == "__main__":
    asyncio.run(debug_feed())
