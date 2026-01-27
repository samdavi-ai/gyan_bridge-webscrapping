from duckduckgo_search import DDGS
import time

class DDGClient:
    """
    Wrapper for DuckDuckGo Search to provide fallback results
    when primary scrapers (YouTube/Google News) fail.
    """
    
    def __init__(self):
        self.ddgs = DDGS()

    def search_videos(self, query, limit=20):
        """
        Search for videos using DDG and normalize to VideoEngine format.
        Returns: list of dicts {id, title, url, thumbnail, channel, ...}
        """
        results = []
        try:
            print(f"🦆 [DDG Fallback] Searching Videos: '{query}'")
            # DDG video search
            # keywords: query
            # region: wt-wt (no region), safesearch: moderate, time: None, resolution: high
            ddg_results = self.ddgs.videos(
                keywords=query,
                region="wt-wt",
                safesearch="moderate",
                max_results=limit
            )
            
            for v in ddg_results:
                # DDG Video Result Format:
                # {'content': '...', 'description': '...', 'duration': '...', 'embed_html': '...', 'embed_url': '...', 'images': {...}, 'provider': 'YouTube', 'published': '...', 'publisher': '...', 'statistics': {...}, 'title': '...', 'uploader': '...', 'url': '...'}
                
                # We need to map to:
                # {'id': '...', 'title': '...', 'url': '...', 'thumbnail': '...', 'channel': '...', 'views': '...', 'length': '...', 'published': '...'}
                
                # Extract ID from thumbnail or URL if possible, generic fallback
                video_url = v.get('content', '') or v.get('url', '')
                title = v.get('title', 'Unknown Video')
                
                # Simple ID extraction or fallback
                vid_id = str(hash(video_url))[-10:] 
                if 'youtube.com/watch?v=' in video_url:
                    vid_id = video_url.split('v=')[1].split('&')[0]
                elif 'youtu.be/' in video_url:
                    vid_id = video_url.split('youtu.be/')[1].split('?')[0]
                
                thumbnail = ''
                if v.get('images'):
                    thumbnail = v['images'].get('large') or v['images'].get('medium') or v['images'].get('small') or ''
                
                results.append({
                    'id': vid_id,
                    'title': title,
                    'url': video_url,
                    'thumbnail': thumbnail,
                    'channel': v.get('uploader') or v.get('publisher') or 'Unknown',
                    'views': str(v.get('statistics', {}).get('viewCount', '0')),
                    'length': v.get('duration', '0:00'),
                    'published': v.get('published', '')
                })
                
        except Exception as e:
            print(f"⚠️ [DDG Fallback] Video search failed: {e}")
            
        return results

    def search_news(self, query, limit=20):
        """
        Search for news using DDG and normalize to NewsFeeder format.
        Returns: list of dicts {title, link, source, date, snippet, thumbnail}
        """
        results = []
        try:
            print(f"🦆 [DDG Fallback] Searching News: '{query}'")
            ddg_results = self.ddgs.news(
                keywords=query,
                region="wt-wt",
                safesearch="moderate",
                max_results=limit
            )
            
            for n in ddg_results:
                # DDG News Result Format:
                # {'date': '...', 'image': '...', 'source': '...', 'title': '...', 'url': '...', 'body': '...'}
                
                results.append({
                    'title': n.get('title', 'No Title'),
                    'link': n.get('url', ''),
                    'source': n.get('source', 'DuckDuckGo'),
                    'date': n.get('date', ''),
                    'published': n.get('date', ''), # [FIX] Map date to published
                    'snippet': n.get('body', ''),
                    'thumbnail': n.get('image', '')
                })
                
        except Exception as e:
            print(f"⚠️ [DDG Fallback] News search failed: {e}")
            
        return results
