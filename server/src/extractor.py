from newspaper import Article
import time
import trafilatura
import requests
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

class ContentExtractor:
    """
    Extracts the main content of an article for 'Reader Mode'.
    Uses newspaper3k as primary, trafilatura as fallback.
    """
    def _resolve_final_url(self, url):
        """
        Follows redirects (especially from Google News) to find the actual article URL.
        """
        if not url: return ""
        if "news.google.com" not in url and "google.com/rss" not in url and "google.com/url" not in url:
            return url
            
        try:
            print(f"🔗 [Extractor] Resolving redirect for: {url}")
            
            # [FIX] Use context manager to close session and release connection to pool
            with requests.Session() as session:
                # USE A SPOOFED MOBILE USER AGENT - Google often redirects mobile bots faster
                session.headers.update({
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                    "Referer": "https://news.google.com/",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Connection": "close" # Ensure we don't hold this connection
                })
                
                # Try a quick HEAD request first (very fast)
                try:
                    resp = session.head(url, timeout=5, allow_redirects=True)
                    if "google.com" not in resp.url and "googleusercontent.com" not in resp.url:
                        print(f"✅ [Extractor] HEAD Resolved to: {resp.url}")
                        return resp.url
                except: pass

                # 1. First attempt: Simple GET with redirects
                resp = session.get(url, timeout=8, allow_redirects=True)
                
                # If we land on a non-google page, we're done
                if "google.com" not in resp.url and "googleusercontent.com" not in resp.url:
                    print(f"✅ [Extractor] GET Resolved to: {resp.url}")
                    return resp.url
                
                # 2. Extract from Splash Page (WIZ_global_data or IJ_values)
                text = resp.text
                import re
                
                # More specific pattern for JSON-like arrays in Google splash pages
                patterns = [
                    r'\["(https?://[^"]+)"', 
                    r'"(https?://[^"]+)"',
                ]
                
                found_urls = []
                for p in patterns:
                    matches = re.findall(p, text)
                    for m in matches:
                        # BLOCK tracking and meta domains
                        blocked = ["google.com", "gstatic.com", "googleusercontent.com", "google-analytics.com", "doubleclick.net", "googletagmanager.com", "googlesyndication.com"]
                        if not any(b in m for b in blocked):
                            found_urls.append(m)
                
                if found_urls:
                    # Prioritize URLs that contain 'article', 'news', or common extensions
                    priority_urls = [u for u in found_urls if any(p in u.lower() for p in ['/20', '.html', 'article', 'news'])]
                    final_url = priority_urls[0] if priority_urls else found_urls[0]
                    print(f"✅ [Extractor] Found via Splash Scrape: {final_url}")
                    return final_url
                
        except Exception as e:
            print(f"⚠️ [Extractor] Resolution failed: {e}")
            
        return url

    def extract(self, url):
        try:
            # [FIX] Resolve URL first!
            url = self._resolve_final_url(url)

            # [SECURITY] Validate URL to prevent SSRF attacks
            if not _is_safe_url(url):
                return {'error': 'Invalid or unsafe URL', 'title': 'Security Error', 'text': 'The provided URL is not allowed for security reasons.'}
            
            print(f"📖 Extractor: Reading {url}...")
            
            # [FIX] Use custom User-Agent to avoid 403 blocks (Updated to Chrome 120)
            # [FIX] Use custom User-Agent to avoid 403 blocks (Updated to Chrome 120)
            from newspaper import Config
            config = Config()
            config.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            config.request_timeout = 15

            # Try newspaper3k first (it handles its own downloading well usually)
            article = Article(url, config=config)
            try:
                article.download()
                article.parse()
            except Exception as ne:
                print(f"⚠️ Newspaper3k download failed: {ne}")

            print(f"📰 Newspaper3k extraction: Title={bool(article.title)}, Text length={len(article.text) if article.text else 0}")
            
            # [CRITICAL] If we are STILL on Google (Splash Page), Text length will be 0 but Title will be set
            final_text = ""
            if article.text and len(article.text) > 200:
                 final_text = article.text
            else:
                 print("⚠️ Newspaper3k failed or stub page detected. Trying Trafilatura with unified session...")
                 # [FIX] Manually download using requests to control headers and encoding
                 try:
                     session = requests.Session()
                     session.headers.update({
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Encoding": "gzip, deflate", # EXPLICITLY disable br/zstd if causing issues
                        "Accept-Language": "en-US,en;q=0.5"
                     })
                     resp = session.get(url, timeout=15)
                     resp.raise_for_status()
                     # Pass RESPONSE CONTENT/TEXT to trafilatura
                     downloaded = resp.text
                     if downloaded:
                         final_text = trafilatura.extract(downloaded) or ""
                 except Exception as te:
                     print(f"⚠️ Trafilatura manual fetch failed: {te}")
            
            # [FINAL FALLBACK] If text is still suspiciously empty, use the title to search for a clean copy
            if len(final_text) < 200 and article.title:
                 print(f"🕵️ Deep Recovery: Searching for clean copy of '{article.title}'")
                 from src.ddg_client import DDGClient
                 ddg = DDGClient()
                 search_results = ddg.search_news(article.title, limit=3)
                 if search_results:
                     for res in search_results:
                         new_url = res.get('link')
                         if new_url and "google.com" not in new_url:
                             print(f"🚀 Found better URL: {new_url}")
                             # Quick scrape of this new URL
                             try:
                                 # Use same safe download logic
                                 rec_resp = requests.get(new_url, headers={"User-Agent": config.browser_user_agent}, timeout=10)
                                 if rec_resp.status_code == 200:
                                     recovered_text = trafilatura.extract(rec_resp.text)
                                     if recovered_text and len(recovered_text) > 300:
                                         print(f"✅ Recovery successful! {len(recovered_text)} chars found.")
                                         return {
                                             'title': article.title,
                                             'text': recovered_text,
                                             'image': article.top_image or res.get('thumbnail'),
                                             'url': new_url,
                                             'is_recovered': True
                                         }
                             except: pass

            # Return results
            result = {
                'title': article.title or "Article",
                'text': final_text,
                'image': article.top_image,
                'authors': article.authors,
                'publish_date': str(article.publish_date) if article.publish_date else None,
                'url': url
            }
            
            print(f"✅ Extraction complete: {len(result.get('text', ''))} chars")
            return result
            
        except Exception as e:
            print(f"⚠️ Extraction Failed: {e}")
            import traceback
            traceback.print_exc()
            return {'error': str(e), 'title': 'Extraction Error', 'text': f'Could not extract article content: {str(e)}'}
