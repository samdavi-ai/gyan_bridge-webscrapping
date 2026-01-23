"""
Search Utilities Module
Centralized utilities for search operations across the application.
"""
import re
import time
from urllib.parse import urlparse, urlunparse
from typing import Optional, List
import threading


def sanitize_query(query: str, max_length: int = 500) -> str:
    """
    Sanitize search query by removing dangerous characters and normalizing whitespace.
    
    Args:
        query: Raw search query
        max_length: Maximum allowed query length
        
    Returns:
        Sanitized query string
    """
    if not query:
        return ""
    
    # Remove control characters and normalize whitespace
    query = ' '.join(query.split())
    
    # Remove potentially dangerous characters
    query = re.sub(r'[<>{}\\|^~\[\]`]', '', query)
    
    # Truncate if too long
    if len(query) > max_length:
        query = query[:max_length]
    
    return query.strip()


def normalize_url(url: str) -> str:
    """
    Normalize URL for deduplication by removing query params, fragments, and trailing slashes.
    
    Args:
        url: URL to normalize
        
    Returns:
        Normalized URL string
    """
    if not url:
        return ""
    
    try:
        parsed = urlparse(url)
        # Remove query params and fragment
        normalized = urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path.rstrip('/'),
            '',  # params
            '',  # query
            ''   # fragment
        ))
        return normalized
    except Exception:
        # If parsing fails, just return lowercase version without trailing slash
        return url.lower().rstrip('/')


def is_valid_region(region: str) -> bool:
    """
    Validate region code for search APIs.
    
    Args:
        region: Region code (e.g., 'wt-wt', 'in-en', 'us-en')
        
    Returns:
        True if valid region code
    """
    valid_regions = {
        'wt-wt',  # Global
        'in-en',  # India English
        'us-en',  # USA English
        'uk-en',  # UK English
        'au-en',  # Australia English
    }
    return region in valid_regions


def detect_non_latin_script(text: str) -> bool:
    """
    Detect if text contains non-Latin scripts (Chinese, Arabic, etc.).
    
    Args:
        text: Text to check
        
    Returns:
        True if non-Latin script detected
    """
    if not text:
        return False
    
    # Chinese characters
    for char in text:
        if '\u4e00' <= char <= '\u9fff':
            return True
        # Arabic
        if '\u0600' <= char <= '\u06ff':
            return True
        # Cyrillic (if not wanted)
        # if '\u0400' <= char <= '\u04ff':
        #     return True
    
    return False


def validate_url(url: str) -> bool:
    """
    Validate if string is a proper URL.
    
    Args:
        url: URL string to validate
        
    Returns:
        True if valid URL
    """
    if not url:
        return False
    
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


class CircuitBreaker:
    """
    Circuit breaker pattern to prevent cascading failures.
    Automatically opens circuit after threshold failures and closes after recovery time.
    """
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before attempting recovery
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'closed'  # closed, open, half_open
        self._lock = threading.Lock()
    
    def call(self, func, *args, **kwargs):
        """
        Execute function through circuit breaker.
        
        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            Exception: If circuit is open or function fails
        """
        with self._lock:
            if self.state == 'open':
                # Check if recovery timeout has passed
                if self.last_failure_time and \
                   time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = 'half_open'
                    self.failure_count = 0
                else:
                    raise Exception(f"Circuit breaker is OPEN. Service unavailable.")
        
        try:
            result = func(*args, **kwargs)
            
            # Success - reset if in half_open state
            with self._lock:
                if self.state == 'half_open':
                    self.state = 'closed'
                    self.failure_count = 0
            
            return result
            
        except Exception as e:
            with self._lock:
                self.failure_count += 1
                self.last_failure_time = time.time()
                
                if self.failure_count >= self.failure_threshold:
                    self.state = 'open'
                    print(f"🔴 Circuit breaker OPENED after {self.failure_count} failures")
            
            raise e
    
    def reset(self):
        """Manually reset circuit breaker."""
        with self._lock:
            self.state = 'closed'
            self.failure_count = 0
            self.last_failure_time = None


def extract_domain(url: str) -> Optional[str]:
    """
    Extract domain from URL.
    
    Args:
        url: URL string
        
    Returns:
        Domain or None if extraction fails
    """
    try:
        parsed = urlparse(url)
        return parsed.netloc
    except Exception:
        return None


def deduplicate_results(results: List[dict], key: str = 'url') -> List[dict]:
    """
    Deduplicate list of result dicts by specified key.
    Uses normalized URLs for deduplication.
    
    Args:
        results: List of result dictionaries
        key: Key to use for deduplication (default: 'url')
        
    Returns:
        Deduplicated list
    """
    seen = set()
    unique = []
    
    for result in results:
        value = result.get(key, '')
        
        # Normalize URLs for better deduplication
        if key == 'url':
            value = normalize_url(value)
        else:
            value = value.lower().strip()
        
        if value and value not in seen:
            seen.add(value)
            unique.append(result)
    
    return unique
