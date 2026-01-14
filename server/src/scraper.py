from playwright.sync_api import sync_playwright
import trafilatura
from youtube_transcript_api import YouTubeTranscriptApi
import requests
import time
import re

class UniversalScraper:
    def __init__(self):
        pass

    def scrape_item(self, item):
        """
        Routes the item to the appropriate scraper based on source_type.
        Returns dict with 'content', 'raw_text', 'error'.
        """
        url = item['url']
        source = item['source_type']
        
        print(f"  ⬇️ Scraping ({source}): {url[:50]}...")
        
        try:
            if source == 'video' or 'youtube.com' in url or 'youtu.be' in url:
                return self.scrape_youtube(url)
            elif source == 'paper' or url.endswith('.pdf'):
                return self.scrape_pdf(url)
            else:
                # Web / Social / News -> Try Fast then Heavy
                return self.scrape_web_hybrid(url)
        except Exception as e:
            return {'error': str(e), 'content': None}

    def scrape_web_hybrid(self, url):
        # 1. Try Trafilatura (Fast, requests-based)
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = trafilatura.extract(downloaded, include_comments=False, include_tables=True)
            if text and len(text) > 200:
                return {'content': text, 'method': 'fast_trafilatura', 'error': None}
        
        # 2. Key Error or Empty? Fallback to Playwright (Heavy)
        # Only if fast failed or returned junk.
        print("     ⚠️ Fast fetch failed/low-quality. Engaging Playwright...")
        return self.scrape_playwright(url)

    def scrape_playwright(self, url):
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                
                # Stecklh: block images/media to speed up
                page.route("**/*", lambda route: route.continue_() if route.request.resource_type in ["document", "script"] else route.abort())
                
                try:
                    page.goto(url, timeout=30000, wait_until="domcontentloaded")
                    # Wait a bit for hydration
                    time.sleep(2)
                    
                    # Get content
                    content = page.content()
                    
                    # Use Trafilatura on the rendered HTML
                    text = trafilatura.extract(content)
                    
                    if not text:
                         # Fallback to simple text content
                         text = page.evaluate("document.body.innerText")
                    
                    return {'content': text, 'method': 'playwright_render', 'error': None}
                    
                finally:
                    browser.close()
        except Exception as e:
            return {'error': f"Playwright failed: {e}", 'content': None}

    def scrape_youtube(self, url):
        # Extract Video ID
        video_id = None
        if "v=" in url:
            video_id = url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in url:
            video_id = url.split("youtu.be/")[1].split("?")[0]
            
        if not video_id:
            return {'error': "Could not parse Video ID", 'content': None}
            
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            # Join text
            full_text = " ".join([t['text'] for t in transcript])
            return {'content': "BUFFER_VIDEO_TRANSCRIPT: \n" + full_text, 'method': 'youtube_api', 'error': None}
        except Exception as e:
            return {'error': f"No transcript available: {e}", 'content': None}

    def scrape_pdf(self, url):
        # Simple PDF download and text extraction (using trafilatura or other if strictly needed, 
        # but trafilatura handles PDF via URL sometimes poorly, better to download)
        try:
            response = requests.get(url, timeout=15)
            # Use raw bytes -> trafilatura doesn't do PDF directly well without tools.
            # For now, return a placeholder or try basic parsing if text.
            # Improving: simple byte check
            if response.status_code == 200:
                return {'content': f"[PDF Content Downloaded - {len(response.content)} bytes]. (Text extraction pending PDF library update)", 'method': 'pdf_download', 'error': None}
            return {'error': "PDF download failed", 'content': None}
        except Exception as e:
            return {'error': str(e), 'content': None}
