import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.news_feeder import NewsFeeder
import requests

def test_extraction(url, title):
    print(f"--- Starting test for: {title} ---")
    print(f"Init NewsFeeder...")
    nf = NewsFeeder()
    print(f"NewsFeeder Inited.")
    print(f"Testing URL: {url}")
    
    # 1. Resolve
    resolved = nf._resolve_url(url)
    print(f"Resolved URL: {resolved}")
    
    # 2. Extract OG
    img = nf._fetch_og_image(resolved)
    print(f"Extracted OG Image: {img}")
    
    # 3. Validation test
    if img:
        is_bad = nf._is_bad_image(img)
        print(f"Is Bad Image?: {is_bad}")
    else:
        # 4. Fallback search
        print("No image found, trying fallback search...")
        img = nf._fetch_fallback_image(title)
        print(f"Fallback Search Image: {img}")

if __name__ == "__main__":
    articles = [
        ("https://www.christianitytoday.com/2024/01/zimbabwe-christians-push-back-abortion-legalization/", "Zimbabwe Christians Push Back Against Proposed Abortion Legalization"),
        ("https://timesofindia.indiatimes.com/india/priest-by-day-dj-by-night-meet-the-catholic-padre-changing-christianity-one-rave-at-a-time/articleshow/107123456.cms", "Priest by day, DJ by night: Meet the Catholic padre changing Christianity one rave at a time")
    ]
    for u, t in articles:
        test_extraction(u, t)
        print("-" * 50)
