from ddgs import DDGS
import requests
from bs4 import BeautifulSoup
import concurrent.futures

class SearchAgents:
    """
    Enhanced Agents with 'Rich Preview' capabilities.
    Fetches Open Graph (OG) metadata to provide real images and relevant descriptions.
    """
    
    @staticmethod
    def get_meta_info(url):
        try:
            # Fast timeout, we only want the head/meta
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            resp = requests.get(url, headers=headers, timeout=3)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.content, 'html.parser')
                
                # Image
                og_image = soup.find("meta", property="og:image")
                image = og_image["content"] if og_image else None
                
                # Description
                og_desc = soup.find("meta", property="og:description")
                desc = og_desc["content"] if og_desc else None
                
                # Published Time
                og_time = soup.find("meta", property="article:published_time") or \
                          soup.find("meta", property="og:updated_time") or \
                          soup.find("meta", attrs={"name": "pubdate"})
                pub_time = og_time["content"] if og_time else None
                
                return image, desc, pub_time
        except:
            return None, None, None
        return None, None, None

    @staticmethod
    def enrich_results(results):
        """
        Parallel fetch of meta info for top results to speed up UI.
        """
        refined_results = []
        
        # Limit enrichment to top 15 to ensure speed (user wants quality over quantity here)
        top_results = results[:15]
        remaining = results[15:]

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_item = {executor.submit(SearchAgents.get_meta_info, item['url']): item for item in top_results}
            
            for future in concurrent.futures.as_completed(future_to_item):
                item = future_to_item[future]
                try:
                    img, desc, pub_time = future.result()
                    if img: item['image'] = img
                    if desc: item['snippet'] = desc # Replace snippet with robust meta desc
                    if pub_time: item['published_at'] = pub_time
                except:
                    pass
                refined_results.append(item)
        
        return refined_results + remaining

    @staticmethod
    def search_ddg(query, intent, limit, time_filter):
        items = []

        
        try:
            with DDGS() as ddgs:
                # Backend search gives basic info - default backend='auto' is best now
                res = ddgs.text(query, region='us-en', max_results=limit)
                if res:
                    for r in res:
                        items.append({
                            'title': r.get('title'),
                            'url': r.get('href'),
                            'source_type': intent,
                            'snippet': r.get('body'),
                            'engine': 'Antigravity AI',
                            'image': None 
                        })
        except Exception as e:
            print(f"⚠️ DDG Error: {e}")
        
        # If all backends failed or returned 0 items
        if not items:
            print(f"⚠️ DDG returned 0 results for query: '{query[:50]}...'")

        return items

    @staticmethod
    def search_google(query, intent, limit, time_filter, api_key):
        items = []
        params = {
            "engine": "google",
            "q": query,
            "num": limit,

            "api_key": api_key
        }
        if time_filter:
            params["tbs"] = f"qdr:{time_filter}" if time_filter != '6m' else "qdr:y"

        try:
            resp = requests.get("https://serpapi.com/search.json", params=params, timeout=30)
            data = resp.json()
            for r in data.get("organic_results", []):
                items.append({
                    'title': r.get('title'),
                    'url': r.get('link'),
                    'source_type': intent,
                    'snippet': r.get('snippet'),
                    'image': r.get('thumbnail'), # Google gives thumbs directly
                    'published_at': r.get('date'), # SerpApi often gives "2 hours ago"
                    'engine': 'Google Deep'
                })
        except Exception as e:
            print(f"Google Error ({query}): {e}")
        return items
