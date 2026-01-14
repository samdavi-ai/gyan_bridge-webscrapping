import time
import random

# Optional import - only needed if using Google APIs
try:
    from google.api_core.exceptions import ResourceExhausted
except ImportError:
    ResourceExhausted = Exception  # Fallback to base Exception

def retry_with_backoff(retries=5, initial_delay=2, backoff_factor=2):
    """
    Retry decorator for functions that might hit API rate limits.
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            delay = initial_delay
            for i in range(retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    # Check for Rate Limit Error (ResourceExhausted or 429 in message)
                    is_rate_limit = "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e) or isinstance(e, ResourceExhausted)
                    
                    if is_rate_limit:
                        if i < retries - 1:
                            sleep_time = delay + random.uniform(0, 1) # Add jitter
                            print(f"⚠️ Rate Limit Hit (Attempt {i+1}/{retries}). Retrying in {sleep_time:.2f}s...")
                            time.sleep(sleep_time)
                            delay *= backoff_factor
                            continue
                    
                    # If not rate limit or out of retries, raise last error
                    if i == retries - 1:
                        raise e
            return func(*args, **kwargs)
        return wrapper
    return decorator
