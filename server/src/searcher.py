from ddgs import DDGS
from datetime import datetime
from youtube_transcript_api import YouTubeTranscriptApi
import arxiv
import time # Ensure time is imported

import feedparser
import re
import requests
from src.resource_definitions import CHRISTIAN_SOURCES

class DiscoveryEngine:
    def __init__(self):
        pass

    def get_trending_videos(self, max_results=30):
        """
        Fetches trending Christian-related videos by cycling through popular queries.
        Applies strict keyword filtering to ensure relevance.
        """
        import random
        from urllib.parse import urlparse, parse_qs
        
        now = datetime.now()
        current_year = now.year
        current_month = now.strftime("%B") # e.g. "January"
        
        # [FIX] Simplified & Diversified Queries
        queries = [
            f"Christian World News {current_month} {current_year}",
            f"Global Christian Persecution Report {current_year}",
            f"Top Christian Worship Songs {current_year} Official",
            f"Powerful Christian Sermons {current_month} {current_year}",
            f"Christian Testimony Viral {current_year}",
            "Vatican News English latest",
            "CNA News Video Catholic",
            f"International Christian Concern {current_year}",
            f"Voice of the Martyrs {current_year}",
            f"Christian Documentary {current_year}"
        ]
        
        random.shuffle(queries)
        
        all_videos = []
        # Cycle through queries to get a mix
        for q in queries:
            # [FIX] Enforce 'm' (Past Month) time filter to avoid old videos
            vids = self.search_youtube(q, max_results=5, timelimit='m')
            all_videos.extend(vids)
            
            # [OPTIMIZATION] Break early if we have enough candidates (2x max_results to allow for deduping)
            if len(all_videos) >= max_results * 2:
                break
                
            time.sleep(1.0) 
            
        # Deduplicate using Video ID
        unique_videos = []
        seen_ids = set()
        
        # Keywords for validation
        valid_keywords = [
            'christian', 'church', 'jesus', 'god', 'gospel', 'bible', 'pastor', 'bishop', 
            'pope', 'vatican', 'catholic', 'worship', 'sermon', 'testimony', 'faith', 
            'prayer', 'mission', 'ministry', 'persecution', 'attack', 'report', 'news', 
            'update', 'documentary', 'joshua', 'hillsong', 'bethel', 'elevation'
        ]
        
        for v in all_videos:
            vid_id = self._extract_video_id(v['url'])
            if vid_id and vid_id not in seen_ids:
                # Relevance Check
                title_lower = v['title'].lower()
                is_relevant = any(k in title_lower for k in valid_keywords)
                
                if is_relevant:
                    seen_ids.add(vid_id)
                    unique_videos.append(v)
                
        return unique_videos[:max_results]

    def _extract_video_id(self, url):
        """Helper to extract YouTube Video ID from various URL formats."""
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(url)
            if "youtube.com" in parsed.netloc:
                return parse_qs(parsed.query).get('v', [None])[0]
            elif "youtu.be" in parsed.netloc:
                return parsed.path.lstrip('/')
            return url # Fallback to URL if not standard YT
        except:
            return url

    def discover(self, topic, max_results=150, include_trusted=True):
        """
        Orchestrates discovery across all supported platforms.
        Increased limits for comprehensive internet-wide search.
        Returns a list of dicts: {'url', 'source_type', 'title', 'metadata'}
        """
        results = []
        print(f"🌟 Starting Discovery for: {topic}")
        
        # 1. Search Web (General + News)
        web_results = self.search_web(topic, max_results=max_results // 2)
        results.extend(web_results)
        
        # 2. Search Video (YouTube)
        video_results = self.search_youtube(topic, max_results=max_results // 4)
        results.extend(video_results)
        
        # 3. Search Academic (Arxiv)
        paper_results = self.search_arxiv_papers(topic, max_results=max_results // 5)
        results.extend(paper_results)
        
        # 4. Search Social (Reddit/Quora specifically)
        social_results = self.search_social(topic, max_results=max_results // 5)
        results.extend(social_results)

        # 5. Search Trusted Sources (Optional Deep Scan)
        if include_trusted:
            trusted_results = self.search_trusted_sources(topic, max_results=max_results // 2)
            results.extend(trusted_results)

        # Deduplicate by URL
        unique_results = []
        seen_urls = set()
        for r in results:
            if r['url'] not in seen_urls:
                seen_urls.add(r['url'])
                unique_results.append(r)
        
        print(f"✅ Discovery Complete: Found {len(unique_results)} unique items.")
        return unique_results

    def _is_valid_content(self, text):
        """
        Checks if text contains non-Latin scripts.
        DEPRECATED: Use search_utils.detect_non_latin_script instead.
        """
        from src.search_utils import detect_non_latin_script
        if not text:
            return True
        return not detect_non_latin_script(text)
    def search_web(self, topic, max_results=50, region='wt-wt', include_news=True):
        """Web search with timeout, validation, and error handling. Increased limits for better coverage."""
        from src.search_utils import sanitize_query, validate_url, detect_non_latin_script
        
        items = []
        
        # Validate and sanitize
        if not topic or not isinstance(topic, str):
            return items
        
        topic = sanitize_query(topic)
        if not topic:
            return items
        
        print(f"  🔍 Querying Web & News ({region})...")
        try:
            # [FIX] Added timeout parameter for updated DDGS support
            with DDGS(timeout=20) as ddgs:
                # General Search
                gen_results = ddgs.text(topic, region=region, max_results=max_results)
                if gen_results:
                    for r in gen_results:
                        title = r.get('title', '')
                        body = r.get('body', '')
                        url = r.get('href', '')
                        
                        # Filter non-Latin content
                        if detect_non_latin_script(title) or detect_non_latin_script(body):
                            continue
                        
                        if not validate_url(url):
                            continue
                            
                        items.append({
                            'url': url,
                            'title': title,
                            'source_type': 'web',
                            'metadata': {'snippet': body}
                        })
                
                # News Search
                if include_news:
                    news_topic = f"{topic} latest"
                    try:
                        news_results = ddgs.news(news_topic, region=region, max_results=max_results // 2)
                        if news_results:
                            for r in news_results:
                                title = r.get('title', '')
                                url = r.get('url', '')
                                
                                if detect_non_latin_script(title):
                                    continue
                                
                                if not validate_url(url):
                                    continue

                                items.append({
                                    'url': url,
                                    'title': title,
                                    'source_type': 'news',
                                    'metadata': {'date': r.get('date'), 'source': r.get('source')}
                                })
                    except Exception as e:
                        print(f"  ⚠️ News search fallback skipped: {e}")

        except Exception as e:
            print(f"  ❌ Web Search Error: {str(e)[:100]}")
        return items

    def search_youtube(self, topic, max_results=10, timelimit=None):
        """
        YouTube video search with validation and timeout.
        """
        from src.search_utils import sanitize_query, validate_url, detect_non_latin_script
        
        items = []
        
        # Validate input
        if not topic:
            return items
        
        topic = sanitize_query(topic)
        
        print(f"  🎥 Querying YouTube ({timelimit if timelimit else 'all'})...")
        try:
            with DDGS() as ddgs:
                results = ddgs.videos(
                    topic, 
                    region='wt-wt', 
                    max_results=max_results, 
                    timelimit=timelimit
                )
                
                for r in results:
                    title = r.get('title', '')
                    
                    # Filter non-Latin content
                    if detect_non_latin_script(title):
                        continue
                        
                    url = r.get('content') or r.get('embed_url')
                    
                    if url and ("youtube.com" in url or "youtu.be" in url):
                        if validate_url(url):
                            items.append({
                                'url': url,
                                'title': title,
                                'source_type': 'video',
                                'metadata': {
                                    'duration': r.get('duration'), 
                                    'views': r.get('statistics', {}).get('viewCount')
                                }
                            })
                            
        except Exception as e:
            print(f"  ❌ YouTube Search Error: {str(e)[:100]}")
            
        return items

    def search_arxiv_papers(self, topic, max_results=5):
        items = []
        print(f"  🎓 Querying Arxiv...")
        try:
            search = arxiv.Search(
                query=topic,
                max_results=max_results,
                sort_by=arxiv.SortCriterion.Relevance
            )
            for result in search.results():
                items.append({
                    'url': result.pdf_url,
                    'title': result.title,
                    'source_type': 'paper',
                    'metadata': {'authors': [a.name for a in result.authors], 'published': str(result.published)}
                })
        except Exception as e:
            print(f"  ❌ Arxiv Error: {e}")
        return items

    def search_social(self, topic, max_results=10):
        items = []
        platforms = ["site:reddit.com", "site:quora.com", "site:medium.com"]
        print(f"  💬 Querying Social Channels...")
        try:
            with DDGS() as ddgs:
                for platform in platforms:
                    query = f"{platform} {topic}"
                    results = ddgs.text(query, max_results=5)
                    for r in results:
                        # [FIX] Filter out Chinese content
                        if not self._is_valid_content(r['title']) or not self._is_valid_content(r['body']):
                            continue
                            
                        items.append({
                            'url': r['href'],
                            'title': r['title'],
                            'source_type': 'social',
                            'metadata': {'platform': platform.replace('site:', '')}
                        })
        except Exception as e:
            print(f"  ❌ Social Error: {e}")
        return items

    def search_trusted_sources(self, topic, max_results=20):
        """
        Performs targeted searches against the Master List of Christian sources.
        """
        items = []
        print(f"  ✝️ Querying Trusted Christian Sources...")
        
        try:
            with DDGS() as ddgs:
                # Iterate through categories in the master list
                for category, domains in CHRISTIAN_SOURCES.items():
                    if not domains: continue
                    
                    # We can't search ALL at once (URL length limits). 
                    # Strategy: Create a combined query for the top 5-8 domains of each category.
                    # This ensures we get high-quality hits from each sector (Official, News, Academic, etc.)
                    
                    chunk_size = 6
                    for i in range(0, len(domains), chunk_size):
                        chunk = domains[i:i+chunk_size]
                        # Construct query: "topic (site:a.com OR site:b.com ...)"
                        site_operators = " OR ".join([f"site:{d}" for d in chunk])
                        query = f"{topic} ({site_operators})"
                        
                        try:
                            # We only need a few results per chunk to verify coverage
                            # Use 'wt-wt' (Global) instead of 'us-en' to ensure Indian/International sites are hit
                            results = ddgs.text(query, region='wt-wt', max_results=3)
                            for r in results:
                                items.append({
                                    'url': r['href'],
                                    'title': r['title'],
                                    'source_type': f'trusted_{category}',
                                    'metadata': {'snippet': r['body'], 'category': category}
                                })
                        except Exception: 
                            continue
                            
                    if len(items) >= max_results:
                        break
                        
        except Exception as e:
            print(f"  ❌ Trusted Source Error: {e}")
            
        print(f"    found {len(items)} trusted items.")
        return items
