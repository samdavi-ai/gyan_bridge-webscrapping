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
    def extract(self, url):
        try:
            # [SECURITY] Validate URL to prevent SSRF attacks
            if not _is_safe_url(url):
                return {'error': 'Invalid or unsafe URL', 'title': 'Security Error', 'text': 'The provided URL is not allowed for security reasons.'}
            
            print(f"📖 Extractor: Reading {url}...")
            
            # [FIX] Use custom User-Agent to avoid 403 blocks
            from newspaper import Config
            config = Config()
            config.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            config.request_timeout = 10

            # Try newspaper3k first
            article = Article(url, config=config)
            article.download()
            article.parse()
            
            print(f"📰 Newspaper3k extraction: Title={bool(article.title)}, Text length={len(article.text) if article.text else 0}")
            
            # If newspaper3k fails to get text, try trafilatura
            if not article.text or len(article.text) < 100:
                print("⚠️ Newspaper3k returned insufficient text. Trying trafilatura...")
                downloaded = trafilatura.fetch_url(url)
                if downloaded:
                    extracted_text = trafilatura.extract(downloaded)
                    if extracted_text and len(extracted_text) > 100:
                        print(f"✅ Trafilatura success: {len(extracted_text)} chars")
                        return {
                            'title': article.title or "Article",
                            'text': extracted_text,
                            'image': article.top_image,
                            'authors': article.authors,
                            'publish_date': str(article.publish_date) if article.publish_date else None,
                            'url': url
                        }
            
            # Return newspaper3k results
            result = {
                'title': article.title,
                'text': article.text,
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
