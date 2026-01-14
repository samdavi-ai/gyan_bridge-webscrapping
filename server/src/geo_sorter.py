class GeoSorter:
    """
    Sorts search results into three priority tiers:
    1. Tamil Nadu (Local) - Cities, Districts, State
    2. India (National) - Country, Other States
    3. Global (Rest of World)
    """
    
    def __init__(self):
        # 1. Tier 1 Keywords: Tamil Nadu Specific
        self.tn_keywords = [
            'tamil nadu', 'tamilnadu', 'chennai', 'madurai', 'coimbatore', 'salem', 
            'tiruchirappalli', 'trichy', 'tirunelveli', 'vellore', 'erode', 
            'thoothukudi', 'thanjavur', 'dindigul', 'kanyakumari', 'nagercoil', 
            'kanchipuram', 'cuddalore', 'tiruppur', 'sivakasi', 'karur', 'hosur',
            'virudhunagar', 'theni', 'ramanathapuram', 'sivaganga'
        ]
        
        # 2. Tier 2 Keywords: India Specific (excluding what's already caught by TN)
        self.india_keywords = [
            'india', 'indian', 'delhi', 'mumbai', 'bangalore', 'bengaluru', 
            'kerala', 'hyderabad', 'kolkata', 'rupee', 'inr',
            'matterindia', 'christianity india', 'dalit', 'persecution india'
        ]

    def sort_results(self, results):
        """
        Takes a list of search result dicts and returns a sorted list.
        Each result usually has: 'title', 'snippet', 'url'
        """
        tier1_tn = []
        tier2_india = []
        tier3_global = []
        
        for r in results:
            # Create a "Searchable Context" string for easy matching
            context = (r.get('title', '') + " " + r.get('snippet', '') + " " + r.get('url', '')).lower()
            
            # Check Tier 1: Tamil Nadu
            if any(kw in context for kw in self.tn_keywords):
                r['_geo_tier'] = 'Tamil Nadu'
                tier1_tn.append(r)
                continue
            
            # Check Tier 2: India
            # Logic: Explicit 'india' keyword OR '.in' top-level domain
            if '.in/' in r.get('url', '').lower() or any(kw in context for kw in self.india_keywords):
                r['_geo_tier'] = 'India'
                tier2_india.append(r)
                continue
                
            # Check Tier 3: Global (Default)
            r['_geo_tier'] = 'Global'
            tier3_global.append(r)
            
        print(f"🌍 GeoSorter: Sorted {len(results)} results -> TN: {len(tier1_tn)}, India: {len(tier2_india)}, Global: {len(tier3_global)}")
        
        # Merge priorities
        return tier1_tn + tier2_india + tier3_global