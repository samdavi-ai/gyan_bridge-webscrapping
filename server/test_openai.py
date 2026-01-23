
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    print(f"Client type: {type(client)}")
    
    # We won't actually call the API to save cost/time if possible, 
    # but simplest way to check return type is to inspect the method.
    print(f"Method type: {client.audio.speech.create}")
    
    # Or just try to instantiate it (mocking)
    # But better to check if it's async
    import inspect
    print(f"Is coroutine function: {inspect.iscoroutinefunction(client.audio.speech.create)}")
    
except Exception as e:
    print(f"Error: {e}")
