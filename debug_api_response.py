import requests
import json

def test_endpoint(name, url, payload=None):
    print(f"--- Testing {name} ---")
    try:
        if payload:
            response = requests.post(url, json=payload)
        else:
            response = requests.get(url)
            
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results = data
            else:
                results = data.get('results', [])
            
            print(f"Found {len(results)} items.")
            for i, item in enumerate(results[:3]):
                print(f"\nItem {i+1}:")
                print(f"  Title: {item.get('title')}")
                print(f"  Published: '{item.get('published')}' (Type: {type(item.get('published'))})")
                print(f"  Timestamp: {item.get('timestamp')} (Type: {type(item.get('timestamp'))})")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

# Test Video Search
test_endpoint("Video Search", "http://localhost:5001/api/search", {
    "topic": "Christian News",
    "type": "video",
    "limit": 5
})

# Test News Search
test_endpoint("News Feed", "http://localhost:5001/api/news?lang=en")

# Test Web Search (Default)
test_endpoint("Web Search", "http://localhost:5001/api/search", {
    "topic": "Christian News",
    "type": "web",
    "limit": 5
})
