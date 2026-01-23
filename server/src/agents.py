from ddgs import DDGS
import requests
from bs4 import BeautifulSoup
import concurrent.futures
from urllib.parse import urlparse
import ipaddress
import re

def _is_safe_url(url):
    """
    Validate URL to prevent SSRF attacks.
    Blocks private/internal IPs and localhost.
    """
    if not url or not isinstance(url, str):
        return False
    
    try:
        parsed = urlparse(url)
        
        # Only allow http and https schemes
        if parsed.scheme not in ['http', 'https']:
            return False
        
        # Block localhost and local IPs
        hostname = parsed.hostname
        if not hostname:
            return False
        
        # Block localhost variants
        if hostname.lower() in ['localhost', '127.0.0.1', '0.0.0.0', '::1']:
            return False
        
        # Block private IP ranges
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
        except ValueError:
            # Not an IP, might be a hostname - allow it
            pass
        
        # Block common internal hostnames
        internal_patterns = [
            r'^10\.', r'^172\.(1[6-9]|2[0-9]|3[0-1])\.', r'^192\.168\.',
            r'\.local$', r'\.internal$', r'\.corp$', r'\.localdomain$'
        ]
        for pattern in internal_patterns:
            if re.search(pattern, hostname, re.IGNORECASE):
                return False
        
        return True
    except Exception:
        return False

class SearchAgents:
    """
    Enhanced Agents with 'Rich Preview' capabilities.
    Fetches Open Graph (OG) metadata to provide real images and relevant descriptions.
    """
    
    @staticmethod
    def get_meta_info(url):
        """Fetch Open Graph metadata from URL with proper error handling."""
        try:
            # [SECURITY] Validate URL to prevent SSRF attacks
            if not _is_safe_url(url):
                return None, None, None
            
            # Fast timeout, we only want the head/meta
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            resp = requests.get(url, headers=headers, timeout=3)
            
            if resp.status_code != 200:
                return None, None, None
            
            soup = BeautifulSoup(resp.content, 'html.parser')
            
            # Image
            og_image = soup.find("meta", property="og:image")
            image = og_image.get("content") if og_image else None
            
            # Description
            og_desc = soup.find("meta", property="og:description")
            desc = og_desc.get("content") if og_desc else None
            
            # Published Time
            og_time = soup.find("meta", property="article:published_time") or \
                      soup.find("meta", property="og:updated_time") or \
                      soup.find("meta", attrs={"name": "pubdate"})
            pub_time = og_time.get("content") if og_time else None
            
            return image, desc, pub_time
            
        except requests.exceptions.Timeout:
            return None, None, None
        except requests.exceptions.ConnectionError:
            return None, None, None
        except Exception as e:
            # Log unexpected errors for debugging
            if 'SSL' not in str(e) and 'certificate' not in str(e).lower():
                print(f"⚠️ Meta fetch error for {url[:50]}: {str(e)[:100]}")
            return None, None, None

    @staticmethod
    def enrich_results(results):
        """
        Parallel fetch of meta info for top results to speed up UI.
        """
        refined_results = []
        
        # Increased to top 30 for better coverage (speed still maintained via parallelism)
        top_results = results[:30]
        remaining = results[30:]

        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            future_to_item = {executor.submit(SearchAgents.get_meta_info, item['url']): item for item in top_results}
            
            for future in concurrent.futures.as_completed(future_to_item):
                item = future_to_item[future]
                try:
                    img, desc, pub_time = future.result(timeout=5)  # Add timeout
                    if img: item['image'] = img
                    if desc and len(desc) > 10: item['snippet'] = desc
                    if pub_time: item['published_at'] = pub_time
                except concurrent.futures.TimeoutError:
                    pass
                except Exception as e:
                    if 'circuit' not in str(e).lower():
                        print(f"⚠️ Enrichment error: {str(e)[:80]}")
                refined_results.append(item)
        
        return refined_results + remaining

    @staticmethod
    def search_ddg(query, intent, limit, time_filter=None, region='wt-wt'):
        """
        Broad Web Search using DuckDuckGo with validation and error handling.
        Increased limits for comprehensive internet-wide coverage.
        """
        from src.search_utils import sanitize_query, validate_url
        
        items = []
        
        # Input validation
        if not query or not isinstance(query, str):
            print(f"⚠️ DDG: Invalid query")
            return items
        
        query = sanitize_query(query)
        if not query:
            return items
        
        try:
            with DDGS() as ddgs:
                res = ddgs.text(
                    query, 
                    region=region, 
                    max_results=limit,
                    timelimit=time_filter
                )
                
                if res:
                    for r in res:
                        url = r.get('href', '')
                        title = r.get('title', '')
                        
                        # Validate result quality
                        if not validate_url(url) or not title:
                            continue
                        
                        items.append({
                            'title': title,
                            'url': url,
                            'source_type': intent,
                            'snippet': r.get('body', ''),
                            'engine': 'DuckDuckGo',
                            'image': None 
                        })
                        
        except Exception as e:
            error_msg = str(e)[:100]
            print(f"⚠️ DDG Error ({query[:30]}...): {error_msg}")
        
        if not items:
            print(f"ℹ️ DDG: No results for '{query[:50]}...'")

        return items

    @staticmethod
    def search_google(query, intent, limit, time_filter, api_key):
        """Search Google via SerpAPI with validation and error handling."""
        from src.search_utils import sanitize_query, validate_url
        
        items = []
        
        # Validation
        if not api_key or not query:
            print(f"⚠️ Google: Missing API key or query")
            return items
        
        query = sanitize_query(query)
        
        params = {
            "engine": "google",
            "q": query,
            "num": min(limit, 100),  # SerpAPI max
            "api_key": api_key
        }
        
        if time_filter:
            params["tbs"] = f"qdr:{time_filter}" if time_filter != '6m' else "qdr:y"

        try:
            resp = requests.get(
                "https://serpapi.com/search.json", 
                params=params, 
                timeout=30
            )
            resp.raise_for_status()
            data = resp.json()
            
            # Check for API errors
            if "error" in data:
                print(f"⚠️ SerpAPI Error: {data.get('error')}")
                return items
            
            for r in data.get("organic_results", []):
                url = r.get('link', '')
                title = r.get('title', '')
                
                if not validate_url(url) or not title:
                    continue
                
                items.append({
                    'title': title,
                    'url': url,
                    'source_type': intent,
                    'snippet': r.get('snippet', ''),
                    'image': r.get('thumbnail'),
                    'published_at': r.get('date'),
                    'engine': 'Google'
                })
                
        except requests.exceptions.Timeout:
            print(f"⚠️ Google: Request timeout for '{query[:30]}...'")
        except requests.exceptions.HTTPError as e:
            print(f"⚠️ Google HTTP Error: {e.response.status_code}")
        except Exception as e:
            print(f"⚠️ Google Error ({query[:30]}...): {str(e)[:100]}")
            
        return items
