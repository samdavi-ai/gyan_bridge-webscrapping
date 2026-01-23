import requests
import json
import time

BASE_URL = "http://localhost:5001"

def test_search_endpoint(query, s_type):
    print(f"\n--- Testing /api/search Type: {s_type} Query: {query} ---")
    try:
        url = f"{BASE_URL}/api/search"
        payload = {"topic": query, "type": s_type, "limit": 5}
        start = time.time()
        resp = requests.post(url, json=payload, timeout=30)
        print(f"Status: {resp.status_code}")
        print(f"Time: {time.time() - start:.2f}s")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Results Count: {data.get('count', 0)}")
            results = data.get('results', [])
            if results:
                print("Top Result:", results[0].get('title'))
            else:
                print("No results found.")
                print("Errors:", data.get('errors'))
        else:
            print("Error Response:", resp.text)
    except Exception as e:
        print(f"EXCEPTION: {e}")

def test_get_endpoint(endpoint, query):
    print(f"\n--- Testing {endpoint} Query: {query} ---")
    try:
        url = f"{BASE_URL}{endpoint}?q={query}&lang=en"
        start = time.time()
        resp = requests.get(url, timeout=30)
        print(f"Status: {resp.status_code}")
        print(f"Time: {time.time() - start:.2f}s")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Results Count: {len(data)}")
            if data:
                print("Top Result:", data[0].get('title'))
            else:
                print("No results found.")
        else:
            print("Error Response:", resp.text)
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    print(f"Checking Server Health at {BASE_URL}...")
    try:
        r = requests.get(f"{BASE_URL}/health")
        print("Health:", r.json())
    except Exception as e:
        print(f"Server Down? {e}")
        exit()

    # 1. Test Dashboard Search (Web) - This triggers Analytics
    test_search_endpoint("Jesus Redeems", "web")

    # 2. Test Dashboard Search (News)
    test_search_endpoint("Jesus Redeems", "news")

    # 3. Test Dashboard Search (Video)
    test_search_endpoint("Jesus Redeems", "video")

    # 4. Test News Tab Search (GET /api/news)
    test_get_endpoint("/api/news", "Jesus Redeems")

    # 5. Test Video Tab Search (GET /api/videos)
    test_get_endpoint("/api/videos", "Jesus Redeems")
