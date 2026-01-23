import requests
import json
import os

BASE_URL = "http://localhost:5001"

def test_search(topic, search_type="web", limit=50):
    print(f"\n--- Testing Search: '{topic}' (Type: {search_type}) ---")
    payload = {
        "topic": topic,
        "type": search_type,
        "limit": limit
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/search", json=payload)
        response.raise_for_status()
        data = response.json()
        
        count = data.get("count", 0)
        results = data.get("results", [])
        errors = data.get("errors", [])
        
        print(f"Results Count: {count}")
        if errors:
            print(f"Errors: {json.dumps(errors, indent=2)}")
        
        if count > 0:
            print("Top 3 Results:")
            for i, r in enumerate(results[:3]):
                print(f"  {i+1}. {r.get('title')} ({r.get('url')})")
        else:
            print("❌ No results found!")
            
        return count > 0
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    # Test 1: General Internet Topic (Should return results now that filter is off)
    test_search("latest technology news")
    
    # Test 2: Specific Topic
    test_search("renewable energy in india")
    
    # Test 3: Video Search - Verify Neutrality
    # "church attacks" should show news/reports, not just "Jesus Redeems" unless relevant
    test_search("church attacks in india", search_type="video", limit=20)
    
    # Test 4: General Topic Video
    test_search("python programming tutorials", search_type="video", limit=10)
