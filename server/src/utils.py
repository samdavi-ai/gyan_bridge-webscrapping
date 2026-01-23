import time
import random

# Optional import - only needed if using Google APIs
try:
    from google.api_core.exceptions import ResourceExhausted
except ImportError:
    ResourceExhausted = Exception  # Fallback to base Exception

def retry_with_backoff(retries=5, initial_delay=2, backoff_factor=2, timeout=None, exceptions=(Exception,)):
    """
    Enhanced retry decorator for functions that might hit API rate limits or network issues.
    
    Args:
        retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds before first retry
        backoff_factor: Multiplier for delay between retries
        timeout: Optional timeout in seconds for the entire operation
        exceptions: Tuple of exceptions to catch and retry
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            delay = initial_delay
            last_exception = None
            
            for i in range(retries):
                # Check timeout
                if timeout and (time.time() - start_time) > timeout:
                    raise TimeoutError(f"Operation timed out after {timeout}s")
                
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    # Check for Rate Limit Error
                    is_rate_limit = "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e) or \
                                   isinstance(e, ResourceExhausted) or "rate limit" in str(e).lower()
                    
                    # Check for network errors
                    is_network_error = "connection" in str(e).lower() or "timeout" in str(e).lower()
                    
                    if is_rate_limit or is_network_error:
                        if i < retries - 1:
                            sleep_time = delay + random.uniform(0, 1)  # Add jitter
                            error_type = "Rate Limit" if is_rate_limit else "Network Error"
                            print(f"⚠️ {error_type} (Attempt {i+1}/{retries}). Retrying in {sleep_time:.2f}s... Error: {str(e)[:100]}")
                            time.sleep(sleep_time)
                            delay *= backoff_factor
                            continue
                    
                    # If not retryable or out of retries, raise
                    if i == retries - 1:
                        print(f"❌ Failed after {retries} attempts: {str(e)[:200]}")
                        raise e
            
            # Should not reach here, but raise last exception if we do
            if last_exception:
                raise last_exception
                
        return wrapper
    return decorator
