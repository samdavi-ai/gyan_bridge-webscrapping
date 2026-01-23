import sys
import os
import json
from dotenv import load_dotenv

# Setup path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'server'))

# Load env for API Key
load_dotenv(os.path.join(os.getcwd(), 'server', '.env'))

print("🔑 OpenAI Key:", os.getenv("OPENAI_API_KEY")[:10] + "...")

from src.llm_analytics import LLMAnalytics

# Mock Engines
class MockRAG:
    def search(self, query, k=5):
        return [{"metadata": {"source": "Mock"}, "content": "Christian persecution in India has seen a rise in 2024. Reports indicate 150 incidents in Jan-Feb."}]

class MockDiscovery:
    def search_web(self, query, max_results=5):
        return [{"url": "http://mock.com", "metadata": {"snippet": "Mock web result"}}]

def run_debug():
    print("🚀 Initializing Debug Analytics...")
    analytics = LLMAnalytics(rag_engine=MockRAG(), discovery_engine=MockDiscovery())
    
    query = "Christian Persecution Trends 2024"
    print(f"🧠 Running analysis for: {query}")
    
    try:
        report = analytics.analyze_and_graph(query)
        print("✅ Analysis Data Generated:")
        print(json.dumps(report, indent=2))
        
        # Save to file to verify write permissions
        with open('data/debug_report.json', 'w') as f:
            json.dump(report, f)
        print("💾 Saved to data/debug_report.json")
        
    except Exception as e:
        print(f"❌ Error during generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_debug()
