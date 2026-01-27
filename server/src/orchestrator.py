class Orchestrator:
    """
    The 'Conductor' of the orchestra.
    Manages parallel execution of intents and aggregates results.
    Pipeline: Search -> Dedupe -> ContentFilter -> HybridRanker.
    """
    def __init__(self):
        # Precise Dorks (Moved intents definition below imports)
        self.intents = {
            'general': ['{topic}'],
            'academic': ['{topic} research', '{topic} site:.edu'],
            'christ_data': [
                '{topic} site:christianpost.com OR site:cbn.com OR site:christianitytoday.com',
                '{topic} site:godreports.com OR site:religionnews.com OR site:premierchristian.news',
                '{topic} site:worthynews.com OR site:assistnews.net OR site:evangelicalfocus.com',
                '{topic} site:biblegateway.com OR site:crosswalk.com OR site:biblestudytools.com',
                '{topic} site:desiringgod.org OR site:thegospelcoalition.org OR site:ligonier.org',
                '{topic} site:gotquestions.org OR site:blueletterbible.org OR site:biblehub.com',
                '{topic} site:opendoors.org OR site:persecution.org OR site:vom.org',
                '{topic} site:missionnetworknews.org OR site:barnabasfund.org',
                '{topic} site:gordonconwell.com OR site:pewresearch.org "christian"',
                '{topic} site:fuller.edu OR site:dts.edu',
                '{topic} "christian perspective" OR "biblical view"',
                '{topic} "church history" OR "theology"'
            ],
            'social': ['{topic} forum', '{topic} reddit'],
            'video': ['{topic} youtube', '{topic} site:tbn.org', '{topic} site:godtube.com'],
            'commerce': ['{topic} price', '{topic} buy'],
            'news': [
                '{topic} news',
                '{topic} site:reuters.com OR site:apnews.com OR site:bbc.com',
                '{topic} site:cnn.com OR site:foxnews.com OR site:aljazeera.com'
            ]
        }
        self.components_loaded = False

    def _load_components(self):
        if self.components_loaded: return
        print("🎻 Orchestrator: Lazy Loading Components...")
        from .agents import SearchAgents
        from .filter_layer import ContentFilter
        from .hybrid_ranker import HybridRanker
        from .refiner import QueryRefiner
        from .geo_sorter import GeoSorter
        
        self.agents = SearchAgents()
        self.content_filter = ContentFilter()
        self.ranker = HybridRanker()
        self.refiner = QueryRefiner()
        self.geo_sorter = GeoSorter()
        self.components_loaded = True

    def run(self, topic, active_intents=['general'], limit=100, time_filter=None, keys=None):
        import concurrent.futures
        from src.search_utils import sanitize_query
        
        # Input validation
        if not topic or not isinstance(topic,str):
            errors = ["Invalid topic provided"]
            results = []
            return results, errors
        
        topic = sanitize_query(topic)
        if not topic:
            errors = ["Topic is empty after sanitization"]
            results = []
            return results, errors
        
        # [STRICT TOPIC CONTROL]
        from src.topic_manager import topic_manager
        active_topics = topic_manager.get_active_keywords()
        if active_topics:
            # Force the search to include at least one of the active topics
            topic_constraint = " AND (" + " OR ".join([f'"{t}"' for t in active_topics]) + ")"
            # Only append if not already present to avoid "Christianity AND Christianity"
            if not any(t.lower() in topic.lower() for t in active_topics):
                print(f"🔒 [Orchestrator] Applying Strict Topic Control: '{topic}' -> '{topic}{topic_constraint}'")
                topic += topic_constraint
        
        self._load_components()
        results = []
        errors = []
        
        # 1. Determine Engine Strategy
        serp_key = keys.get('serpapi') if keys else None
        engine_name = "Google" if serp_key else "DuckDuckGo"
        
        print(f"🎻 Orchestrator: Conducting '{topic}' via {engine_name}...")
        
        # 2. Refine Query (AI or Logic)
        # refined_topic = self.refiner.refine(topic) # DISABLED by User Request
        refined_topic = topic
        
        # 3. Build Query List
        queries = []
        
        search_intents = list(active_intents)
        if 'general' not in search_intents:
            search_intents.append('general')
            
        for intent in search_intents:
            if intent in self.intents:
                for template in self.intents[intent]:
                    queries.append({
                        'q': template.format(topic=refined_topic),
                        'intent': intent
                    })
        
        # 4. Parallel Execution with Increased Workers for Speed
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
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

        # 5. Aggressive Deduplication & Normalization using utility
        from src.search_utils import deduplicate_results, normalize_url
        
        # First deduplicate by URL
        unique = deduplicate_results(results, key='url')
        
        # Additional title-based dedup for extra safety
        seen_titles = set()
        final_unique = []
        for r in unique:
            norm_title = r.get('title', '').lower().strip()
            
            # Skip stale archives
            if 'archives' in norm_title and len(norm_title) < 20:
                continue
            
            if norm_title and norm_title not in seen_titles:
                seen_titles.add(norm_title)
                final_unique.append(r) # Add to final_unique if not seen
        
        # 6. Content-Based Filtering (Quality Gate)
        filtered_results = self.content_filter.filter_batch(final_unique, topic, min_score=5)
        
        # 7. Hybrid Re-Ranking (The User's Formula)
        # BM25 + Vectors + QualityBoost
        ranked_results = self.ranker.rank(filtered_results, topic)
        
        # 8. Geo-Sorting (TN > India > Global)
        # This is the final presentation layer
        final_sorted_results = self.geo_sorter.sort_results(ranked_results)
        
        print(f"✅ Orchestrator: Symphony complete. Final Count: {len(final_sorted_results)}")
        return final_sorted_results, errors
