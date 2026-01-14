from newspaper import Article
import time

class ContentExtractor:
    """
    Extracts the main content of an article for 'Reader Mode'.
    """
    def extract(self, url):
        try:
            print(f"📖 Extractor: Reading {url}...")
            article = Article(url)
            article.download()
            article.parse()
            
            # Basic Meta
            return {
                'title': article.title,
                'text': article.text,
                'image': article.top_image,
                'authors': article.authors,
                'publish_date': str(article.publish_date) if article.publish_date else None,
                'url': url
            }
        except Exception as e:
            print(f"⚠️ Extraction Failed: {e}")
            return {'error': str(e)}
