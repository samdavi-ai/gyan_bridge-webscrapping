import concurrent.futures
from .agents import SearchAgents
from .filter_layer import ContentFilter
from .hybrid_ranker import HybridRanker
from .refiner import QueryRefiner
from .geo_sorter import GeoSorter

class Orchestrator:
    """
    The 'Conductor' of the orchestra.
    Manages parallel execution of intents and aggregates results.
    Pipeline: Search -> Dedupe -> ContentFilter -> HybridRanker.
    """
    def __init__(self):
        # Precise Dorks
        self.intents = {
            'general': [
                '{topic}'
            ],
            'academic': [
                '{topic} research',
                '{topic} site:.edu'
            ],
            # SUPER INTENT: Christ-Centred Data
            'christ_data': [
                # Global Christian News & Media
                '{topic} site:christianpost.com OR site:cbn.com OR site:christianitytoday.com',
                '{topic} site:godreports.com OR site:religionnews.com OR site:premierchristian.news',
                '{topic} site:worthynews.com OR site:assistnews.net OR site:evangelicalfocus.com',
                
                # Theology, Apologetics & Resources
                '{topic} site:biblegateway.com OR site:crosswalk.com OR site:biblestudytools.com',
                '{topic} site:desiringgod.org OR site:thegospelcoalition.org OR site:ligonier.org',
                '{topic} site:gotquestions.org OR site:blueletterbible.org OR site:biblehub.com',
                
                # Persecution & Missions
                '{topic} site:opendoors.org OR site:persecution.org OR site:vom.org',
                '{topic} site:missionnetworknews.org OR site:barnabasfund.org',
                
                # Research & Academic
                '{topic} site:gordonconwell.com OR site:pewresearch.org "christian"',
                '{topic} site:fuller.edu OR site:dts.edu',
                
                # General Dorks
                '{topic} "christian perspective" OR "biblical view"',
                '{topic} "church history" OR "theology"'
            ],
            'social': [
                '{topic} forum',
                '{topic} reddit'
            ],
            'video': [
                '{topic} youtube',
                '{topic} site:tbn.org',
                '{topic} site:godtube.com'
            ],
            'commerce': [
                '{topic} price',
                '{topic} buy'
            ],
            'news': [
                '{topic} news',
                '{topic} site:reuters.com OR site:apnews.com OR site:bbc.com',
                '{topic} site:cnn.com OR site:foxnews.com OR site:aljazeera.com'
            ]
        }
        self.agents = SearchAgents()
        self.content_filter = ContentFilter()
        self.ranker = HybridRanker()
        self.refiner = QueryRefiner()
        self.geo_sorter = GeoSorter()

    def run(self, topic, active_intents=['general'], limit=50, time_filter=None, keys=None):
        results = []
        errors = []
        
        # 1. Determine Engine Strategy
        serp_key = keys.get('serpapi') if keys else None
        engine_name = "Google" if serp_key else "DuckDuckGo"
        
        print(f"🎻 Orchestrator: Conducting '{topic}' via {engine_name}...")
        
        # 2. Refine Query (AI or Logic)
        refined_topic = self.refiner.refine(topic)
        
        # 3. Build Query List (Use refined topic for better precision)
        # We can mix: Original Topic for broad, Refined for specific
        queries = []
        
        # CHRISTIAN-FIRST: Always include 'christ_data' intent for Christian-only results
        search_intents = list(active_intents)
        if 'christ_data' not in search_intents:
            search_intents.insert(0, 'christ_data')  # Prioritize Christian sources
        if 'general' not in search_intents:
            search_intents.append('general')
            
        for intent in search_intents:
            if intent in self.intents:
                for template in self.intents[intent]:
                    queries.append({
                        'q': template.format(topic=refined_topic), # Use REFINED topic
                        'intent': intent
                    })
        
        # 4. Parallel Execution
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_q = {}
            for q_obj in queries:
                if serp_key:
                    future = executor.submit(self.agents.search_google, q_obj['q'], q_obj['intent'], limit, time_filter, serp_key)
                else:
                    future = executor.submit(self.agents.search_ddg, q_obj['q'], q_obj['intent'], limit, time_filter)
                future_to_q[future] = q_obj
            
            for future in concurrent.futures.as_completed(future_to_q):
                try:
                    data = future.result()
                    results.extend(data)
                except Exception as e:
                    # Capture the specific intent failure
                    q_failed = future_to_q[future]
                    error_msg = f"Agent Failed ({q_failed['intent']}): {str(e)}"
                    print(f"⚠️ {error_msg}")
                    errors.append(error_msg)

        # 5. Aggressive Deduplication & Normalization
        unique = []
        seen_urls = set()
        seen_titles = set()
        
        for r in results:
            # Normalize: Remove https/http diffs, trailing slashes, and query params
            norm_url = r['url'].split('://')[-1].split('?')[0].rstrip('/').lower()
            norm_title = r['title'].lower().strip()
            
            # Stale Archive Filter
            if 'archives' in norm_title and len(norm_title) < 20:
                continue

            if norm_url not in seen_urls and norm_title not in seen_titles:
                seen_urls.add(norm_url)
                seen_titles.add(norm_title)
                unique.append(r)
        
        # 6. Content-Based Filtering (Quality Gate)
        # Removes low-quality/spam items before ranking to save compute
        # Strictness: 20 -> A bit relaxed to prevent zero-results, but still penalizes missing core words (via filter_layer)
        # RELAXED: Lowered threshold from 20 to 5 to let almost everything through
        # 6. Content-Based Filtering (Quality Gate)
        # Removes low-quality/spam items before ranking to save compute
        # Strictness: 20 -> A bit relaxed to prevent zero-results, but still penalizes missing core words (via filter_layer)
        # RELAXED: Lowered threshold from 20 to 5 to let almost everything through
        filtered_results = self.content_filter.filter_batch(unique, topic, min_score=5)
        
        # 7. Hybrid Re-Ranking (The User's Formula)
        # BM25 + Vectors + QualityBoost
        ranked_results = self.ranker.rank(filtered_results, topic)
        
        # 8. Geo-Sorting (TN > India > Global)
        # This is the final presentation layer
        final_sorted_results = self.geo_sorter.sort_results(ranked_results)
        
        print(f"✅ Orchestrator: Symphony complete. Final Count: {len(final_sorted_results)}")
        return final_sorted_results, errors
