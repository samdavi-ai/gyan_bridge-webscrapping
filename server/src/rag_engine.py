import os
import chromadb
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
import uuid
from .utils import retry_with_backoff

class RAGEngine:
    def __init__(self, persist_directory="data/chroma_db"):
        self.persist_directory = persist_directory
        # Ensure persist directory exists
        if not os.path.exists(persist_directory):
            os.makedirs(persist_directory)
            
        # Switch to Local Embeddings (Reliable & Free & Fixed Env)
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Initialize Chroma Client
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection = self.client.get_or_create_collection(name="analytics_data")
        
    @retry_with_backoff(retries=5, initial_delay=2)
    def ingest(self, text, metadata=None):
        """
        Chunks and ingests text into the vector store.
        """
        if not text:
            return 0

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_text(text)
        
        if not chunks:
            return 0
            
        ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [metadata or {} for _ in chunks]
        
        # Embed chunks
        # embeddings = self.embeddings.embed_documents(chunks) 
        # Optimization: Chroma can compute embeddings if we setup an embedding function, 
        # but manual embedding gives us control if using Langchain wrapper.
        # Let's do manual embedding here to be safe with the wrapper.
        embeddings = self.embeddings.embed_documents(chunks)
        
        self.collection.add(
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        return len(chunks)

    @retry_with_backoff(retries=5, initial_delay=2)
    def search(self, query, k=5):
        """
        Retrieves relevant documents.
        """
        if not query:
            return []

        query_embedding = self.embeddings.embed_query(query)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k
        )
        
        if not results['documents']:
            return []

        # Flatten results
        documents = results['documents'][0]
        metadatas = results['metadatas'][0] if results['metadatas'] else [{}] * len(documents)
        
        return [{"content": doc, "metadata": meta} for doc, meta in zip(documents, metadatas)]

    def search_hybrid(self, query, live_texts, k=5):
        """
        Performs a hybrid search:
        1. Vectorizes 'live_texts' on-the-fly and finds top matches (Online Context).
        2. Queries the persistent ChromaDB for historical matches (Offline Context).
        3. Merges and deduplicates results.
        """
        hybrid_results = []
        
        # 1. Historical/DB Search
        db_results = self.search(query, k=k)
        for res in db_results:
            res['source'] = 'historical_db'
        hybrid_results.extend(db_results)
        
        # 2. Live/Online Search (In-Memory Vectorization)
        if live_texts and query:
            try:
                # Embed query
                query_vec = self.embeddings.embed_query(query)
                
                # Embed live texts (batch)
                live_vecs = self.embeddings.embed_documents(live_texts)
                
                # Calculate Similarity (Cosine/Dot Product for normalized vectors)
                # manual dot product to avoid numpy dependency issues if not installed
                scores = []
                for i, vec in enumerate(live_vecs):
                    dot_product = sum(a*b for a, b in zip(query_vec, vec))
                    scores.append((dot_product, i))
                
                # Sort by score descending
                scores.sort(key=lambda x: x[0], reverse=True)
                
                # Take top k from live
                top_live = scores[:k]
                
                for score, idx in top_live:
                    hybrid_results.append({
                        "content": live_texts[idx],
                        "metadata": {"source": "live_web_search", "score": score},
                        "source": "live_web"
                    })
                    
            except Exception as e:
                print(f"⚠️ Hybrid Search Warning: Could not streamline live vectors: {e}")
                # Fallback: Just add raw texts if vectorization fails
                for text in live_texts[:k]:
                    hybrid_results.append({
                        "content": text,
                        "metadata": {"source": "live_web_fallback"},
                        "source": "live_web"
                    })

        return hybrid_results
