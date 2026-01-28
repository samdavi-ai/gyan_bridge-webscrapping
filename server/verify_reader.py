import sys
import os
import time
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.extractor import ContentExtractor

def test_reader_mode():
    ce = ContentExtractor()
    test_urls = [
        # The specific failing URL from user's screenshot
        ("https://news.google.com/rss/articles/CBMiiAFBVV95cUxOZldaRVNEY25iWTFaX0tZeDVkWEVhTHVHVXZseVpad1ZUOXVnTTQ2ZXR1d1ZRQm8wbjQxVTBubDFqNGRXcXgwaXFnOTZ6cm9VRmlwRVQydlZFLTdrNnQxa19qbzdwd3hndXVMei13d2h5aUJTZDVVeFpRMnR4ZDRndV9QYS1DSWhZ?oc=5", "Zimbabwe Christians Push Back Against Proposed Abortion Legalization"),
        # Normal TOI redirect
        ("https://timesofindia.indiatimes.com/india/priest-by-day-dj-by-night-meet-the-catholic-padre-changing-christianity-one-rave-at-a-time/articleshow/107123456.cms", "Priest by day, DJ by night")
    ]
    
    for url, title in test_urls:
        print(f"\n--- Testing: {title} ---")
        start = time.time()
        result = ce.extract(url)
        end = time.time()
        
        print(f"Time Taken: {end-start:.2f}s")
        print(f"Title in result: {result.get('title')}")
        print(f"Final URL: {result.get('url')}")
        text_len = len(str(result.get('text', '')))
        print(f"Text Length: {text_len} chars")
        
        if text_len > 300:
            print("✅ SUCCESS")
        elif result.get('is_recovered'):
            print("✅ SUCCESS (Recovered via Search)")
        else:
            print("❌ FAILURE")

if __name__ == "__main__":
    test_reader_mode()
