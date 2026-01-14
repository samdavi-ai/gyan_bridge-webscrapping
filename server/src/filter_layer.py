
class ContentFilter:
    """
    A dedicated layer for Content-Based Filtering.
    Calculates a Relevance Score for each result based on the user's topic.
    """
    
    def __init__(self):
        # 1. Stop Words (Pure Noise)
        self.stop_words = {
            'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'with', 'about', 
            'updates', 'details', 'info', 'information', 'find', 'search', 'query', 'what', 'is', 
            'how', 'where', 'when', 'who', 'verify', 'check', 'list', 'show', 'give', 'me', 'any', 'some',
            'insights', 'overview', 'community', 'communities', 'top', 'best', 'vs', 'review'
        }
        
        # 2. Generic Words (Weak Context - need boosting to count)
        self.generic_words = {
            'conference', 'meeting', 'video', 'news', 'report', 'paper', 'research', 'study', 
            'analysis', 'global', 'trends', 'updates', 'daily', 'weekly', 'forum', 'discussion', 
            'prices', 'shop', 'store', 'online', 'watch', 'live', 'data', 'results',
            'announcement', 'announcements' # Added to prevent "NVIDIA Announcements" matching "Christian Announcements"
        }

        # 3. Domain Blacklist (Low Quality Aggregators)
        self.blacklist_domains = {
            '10times.com', 'eventbrite.com', 'allconferencealert.com', 'waaset.org', 
            'conferencealerts.com', 'waset.org', 'researchgate.net', 'pinterest.com',
            'ebay.com', 'amazon.com', 'temu.com' # Commerce noise
        }
        
        # 4. Christian Keywords (Boost for Christian content)
        self.christian_keywords = {
            'christian', 'christ', 'jesus', 'church', 'bible', 'gospel', 'faith', 'worship',
            'prayer', 'ministry', 'missionary', 'pastor', 'bishop', 'catholic', 'protestant',
            'evangelical', 'pentecostal', 'baptist', 'methodist', 'presbyterian', 'anglican',
            'vatican', 'pope', 'scripture', 'theology', 'sermon', 'disciples', 'apostle',
            'trinity', 'salvation', 'grace', 'holy spirit', 'resurrection', 'crucifixion',
            'persecution', 'martyr', 'testament', 'revelation', 'psalms', 'proverbs'
        }
    
    def calculate_relevance(self, topic, item):
        """
        Returns a Score (0-100). Returns -1 if blacklisted.
        """
        title = item.get('title', '').lower()
        snippet = item.get('snippet', '').lower()
        url = item.get('url', '').lower()
        
        # A. Hard Blacklists
        if any(b in url for b in self.blacklist_domains):
            return -1
        
        full_text = f"{title} {snippet}"
        
        # B. Topic Parsing
        raw_keywords = [w.lower() for w in topic.split() if w.lower() not in self.stop_words and len(w) > 2]
        if not raw_keywords: return 50 # If topic is all stop words, strictness is low
        
        core_keywords = [k for k in raw_keywords if k not in self.generic_words]
        
        # C. Scoring Engine
        score = 0
        
        # C1. Core Keywords (High Value)
        hits = 0
        missing_core_keywords = 0
        
        for k in core_keywords:
            if k in title:
                score += 40 # Title match is strong
                hits += 1
            elif k in snippet:
                score += 15 # Snippet match is okay
                hits += 1
            else:
                missing_core_keywords += 1
        
        # STRONG FILTERING: Penalize missing core keywords
        # RELAXED: Reduced penalty from 20 to 5 to allow broader results
        score -= (missing_core_keywords * 5)
                
        # C2. Generic Keywords (Context Value)
        for k in [w for w in raw_keywords if w in self.generic_words]:
            if k in full_text:
                score += 10 # Boost generic matches slightly more
        
        # C3. Christian Keyword Bonus (NEW - Ensures Christian content is prioritized)
        for keyword in self.christian_keywords:
            if keyword in full_text:
                score += 25  # Strong boost for Christian keywords
                
        # D. Penalties (Contextual Pollution)
        # If topic does NOT contain tech words, penalize tech spam
        is_tech_topic = any(w in topic.lower() for w in ['windows', 'microsoft', 'update', 'android', 'software', 'linux', 'code'])
        if not is_tech_topic:
            spam_terms = ['windows update', 'android', 'software download', 'crack', 'serial', 'hack']
            if any(s in full_text for s in spam_terms):
                score -= 100
                
        # E. Mandatory Core Presence (The "Gatekeeper")
        # RELAXED: Removed strict failure. If no core words, we still return calculated score (which might be low but > 0)
        # if core_keywords and hits == 0:
        #    return 0 
            
        return score

    def filter_batch(self, results, topic, min_score=25):
        """
        Filters a list of results based on threshold.
        """
        kept = []
        for r in results:
            score = self.calculate_relevance(topic, r)
            if score >= min_score:
                r['_relevance_score'] = score
                kept.append(r)
                
        kept.sort(key=lambda x: x['_relevance_score'], reverse=True)
        return kept
