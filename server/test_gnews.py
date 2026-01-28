import requests
from bs4 import BeautifulSoup
import time

def test_resolve(url):
    print(f"Testing URL: {url}")
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://news.google.com/"
    })
    
    start = time.time()
    try:
        # Google News articles usually need a few seconds (or a specific header) to trigger the meta-refresh or link
        # Let's try GET with allow_redirects=True first
        resp = session.get(url, timeout=10, allow_redirects=True)
        print(f"Fetch took {time.time() - start:.2f}s")
        print(f"Final URL from Requests: {resp.url}")
        
        if "google.com" not in resp.url:
            return resp.url

        # If still on Google, parse for the link
        soup = BeautifulSoup(resp.content, 'html.parser')
        
        # Method 1: Meta refresh
        meta = soup.find('meta', attrs={'http-equiv': 'refresh'})
        if meta:
            content = meta.get('content', '')
            if 'url=' in content.lower():
                resolved = content.lower().split('url=')[-1].strip()
                print(f"Found via Meta Refresh: {resolved}")
                return resolved

        # Method 2: The "You are being redirected" link
        links = soup.find_all('a', href=True)
        for link in links:
            href = link['href']
            if href.startswith('http') and 'google.com' not in href:
                print(f"Found via <a> link: {href}")
                return href
                
        # Method 3: JS window.location (Google uses this heavily now)
        import re
        match = re.search(r'window\.location\.replace\("([^"]+)"\)', resp.text)
        if match:
            resolved = match.group(1)
            print(f"Found via JS Replace: {resolved}")
            return resolved

    except Exception as e:
        print(f"Error: {e}")
    
    with open("test_output.txt", "w", encoding="utf-8") as f:
        f.write(f"STATUS: {resp.status_code}\n")
        f.write(f"URL: {resp.url}\n")
        f.write("--- CONTENT ---\n")
        f.write(resp.text)
    
    return url

if __name__ == "__main__":
    test_url = "https://news.google.com/rss/articles/CBMiiAFBVV95cUxOZldaRVNEY25iWTFaX0tZeDVkWEVhTHVHVXZseVpad1ZUOXVnTTQ2ZXR1d1ZRQm8wbjQxVTBubDFqNGRXcXgwaXFnOTZ6cm9VRmlwRVQydlZFLTdrNnQxa19qbzdwd3hndXVMei13d2h5aUJTZDVVeFpRMnR4ZDRndV9QYS1DSWhZ?oc=5"
    res = test_resolve(test_url)
    print(f"DONE. Check test_output.txt")
