
import os
import sys
from dotenv import load_dotenv

# Add server directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

if __name__ == "__main__":
    # Ensure keys are present
    if not os.getenv("LIVEKIT_URL"):
        print("❌ Error: LIVEKIT_URL not found in .env")
        exit(1)
    
    if not os.getenv("LIVEKIT_API_KEY"):
        print("❌ Error: LIVEKIT_API_KEY not found in .env")
        exit(1)
        
    print("🚀 Starting LiveKit Voice Agent Worker...")
    
    # Import and run the agent
    from src.voice_agent import run
    run()
