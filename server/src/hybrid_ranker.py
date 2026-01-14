import math
import numpy as np
from rank_bm25 import BM25Okapi

class HybridRanker:
    """
    Advanced Hybrid Retrieval & Ranking System.
    Combines Lexical (BM25) and Semantic (Vector) signals.
    """
    def __init__(self):
        # Lazily load heavy ML libraries to prevent startup crashes/hangs
        self.embedder = None
        self.use_vectors = False
        
        try:
            print("🧠 HybridRanker: Vector Model Loading DISABLED for fast startup...")
            # from sentence_transformers import SentenceTransformer, util
            # self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
            # self.util = util 
            self.use_vectors = False # Forced False
            print("✅ HybridRanker: Skipped Vector Model.")
        except Exception as e:
            print(f"⚠️ Vector Model Load Failed: {e}. Falling back to Keyword-Only mode.")
            self.use_vectors = False

    def normalize(self, scores):
        """Min-Max normalization to 0-1 range."""
        if len(scores) == 0: return []
        
        # Ensure we are working with standard python types if possible, or handle numpy min/max
        min_s = np.min(scores) if isinstance(scores, np.ndarray) else min(scores)
        max_s = np.max(scores) if isinstance(scores, np.ndarray) else max(scores)
        
        if max_s == min_s: return [1.0] * len(scores)
        
        # Return as list
        return [(s - min_s) / (max_s - min_s) for s in scores]

    def rank(self, results, query):
        if not results: return []
        
        # --- 1. PREPARATION ---
        # Extract corpus for BM25 (Title + Snippet)
        corpus = [f"{r.get('title', '')} {r.get('snippet', '')}" for r in results]
        tokenized_corpus = [doc.lower().split() for doc in corpus]
        tokenized_query = query.lower().split()
        
        # --- 2. LEXICAL SCORING (BM25) ---
        bm25 = BM25Okapi(tokenized_corpus)
        bm25_scores = bm25.get_scores(tokenized_query)
        norm_bm25 = self.normalize(bm25_scores)
        
        # --- 3. SEMANTIC SCORING (Vectors) ---
        norm_vector = [0] * len(results)
        if self.use_vectors and self.embedder:
            try:
                query_embedding = self.embedder.encode(query, convert_to_tensor=True)
                doc_embeddings = self.embedder.encode(corpus, convert_to_tensor=True)
                cosine_scores = self.util.cos_sim(query_embedding, doc_embeddings)[0]
                norm_vector = self.normalize(cosine_scores.tolist())
            except Exception as e:
                print(f"⚠️ Vector Calculation Failed: {e}")
                norm_vector = self.normalize([0] * len(results))

        # --- 4. QUALITY & PENALTY SCORING ---
        # Weights (from User definition)
        W_BM25 = 0.45
        W_VEC = 0.30
        W_QUAL = 0.15 # Using existing FilterLayer score as Quality
        W_PENALTY = 0.5

        final_ranked = []
        
        try: 
            for i, r in enumerate(results):
                # Calculate Component Scores
                s_bm25 = norm_bm25[i]
                s_vec = norm_vector[i]
                
                # Quality Boost (Delta): Use existing 'relevance_score' if available (0-100 -> 0-1)
                # Or check basic signals
                s_qual = 0
                if 'site:.edu' in query or '.edu' in r['url']: s_qual += 0.5
                if 'site:.org' in query or '.org' in r['url']: s_qual += 0.3
                if len(r.get('snippet', '')) > 50: s_qual += 0.2
                
                # Penalty (Kappa): Stale or Duplicate-looking
                s_penalty = 0
                if 'archives' in r['title'].lower(): s_penalty += 1.0 # Stale
                
                # FINAL FORMULA
                # score(d,q) = α*BM25 + β*Vec + δ*Qual - κ*Penalty
                final_score = (W_BM25 * s_bm25) + \
                              (W_VEC * s_vec) + \
                              (W_QUAL * s_qual) - \
                              (W_PENALTY * s_penalty)
                
                r['_hybrid_score'] = final_score
                r['_formula_metrics'] = f"BM25:{s_bm25:.2f} Vec:{s_vec:.2f}"
                final_ranked.append(r)
                
        except Exception as e:
            print(f"Ranking Error: {e}")
            return results

        # Sort descending
        final_ranked.sort(key=lambda x: x['_hybrid_score'], reverse=True)
        
        print(f"🧠 HybridRanker: Re-ranked {len(final_ranked)} items. Top Score: {final_ranked[0]['_hybrid_score']:.3f}")
        return final_ranked
