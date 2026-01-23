# GyanBridge: End-to-End Flow & Security Analysis

## End-to-End Process Flow

### 1. Application Startup (`server/api.py`)
- **Entry Point**: `api.py` (Flask app on port 5001)
- **Initialization**:
  - Loads environment variables from `.env` (OPENAI_API_KEY, SERPAPI_KEY)
  - Initializes lightweight components: Orchestrator, ContentExtractor, NewsFeeder, VideoEngine, ContentTranslator
  - Starts background workers for NewsFeeder and VideoEngine
  - Lazy loads heavy ML models in background thread: RAGEngine, LLMAnalytics, EventTrendAnalyzer, Predictor, LegalAssistant, DiscoveryEngine

### 2. User Search Flow (`/api/search`)

**Input**: POST request with `topic`, `intents`, `limit`, `time_filter`, `type` (web/news/video), `lang`

**Process**:
1. **Input Validation** (`api.py:117-154`):
   - Validates request body exists
   - Sanitizes topic using `sanitize_query()` (removes dangerous chars, limits length to 500)
   - Validates limit (1-200, defaults to 100)
   - Validates search type (web/news/video)

2. **Search Execution** (based on `type`):
   - **Video Search**: `video_engine.search(topic, limit, lang)`
   - **News Search**: `news_feeder.search(topic, limit, lang)` + triggers background analysis
   - **Web Search**: `orchestrator.run(topic, intents, limit, time_filter, keys)`

3. **Orchestrator Process** (`orchestrator.py`):
   - Refines query using QueryRefiner
   - Builds query list from active intents (general, academic, christ_data, social, video, news)
   - Parallel execution via ThreadPoolExecutor (10 workers)
   - Searches via Google (SERPAPI) or DuckDuckGo
   - Deduplicates results by URL and title
   - Content filtering (min_score=5)
   - Hybrid ranking (BM25 + Vectors + QualityBoost)
   - Geo-sorting (TN > India > Global)

4. **Fallback Strategy** (`api.py:218-243`):
   - If results < 10, triggers DiscoveryEngine fallback
   - Normalizes and deduplicates fallback results

5. **Response Processing**:
   - Normalizes result structure for frontend
   - Returns JSON with results, errors, count

### 3. Content Extraction Flow (`/api/extract`)

**Input**: POST with `url`, optional `topic`, `lang`

**Process**:
1. Resolves Google News redirects (`news_feeder._resolve_target_url_sync`)
2. Tracks view via AnalyticsEngine
3. Extracts content via ContentExtractor:
   - Primary: newspaper3k
   - Fallback: trafilatura
4. Translates if `lang != 'en'`
5. Returns extracted content with view count

### 4. Background Workers

**NewsFeeder** (`news_feeder.py`):
- Runs every 60 seconds
- Fetches RSS feeds based on active topics
- Filters by Christian keywords
- Stores in SQLite (`news.db`)
- Geo-sorts results

**VideoEngine** (`video_engine.py`):
- Fetches YouTube videos from curated channels
- Stores in SQLite (`videos.db`)
- Geo-sorts results

### 5. RAG Ingestion (`/api/scrape`)

**Process**:
1. Extracts content from URL
2. Ingests into RAGEngine with metadata (source, title, type)
3. Returns extracted content

---

## Security Issues Found

### 🔴 CRITICAL

1. **Hardcoded Admin Credentials** (`api.py:574-578`)
   - Username: `"admin"`, Password: `"gyanbridge123"`
   - **Risk**: Anyone with code access can login as admin
   - **Fix**: Move to environment variables, use password hashing (bcrypt)

2. **Hardcoded Super Admin Credentials** (`api.py:592`)
   - Username: `"superadmin"`, Password: `"genesis123"`
   - **Risk**: Same as above, but with super admin privileges
   - **Fix**: Move to environment variables, use password hashing

3. **Weak Authentication Tokens** (`api.py:578, 593`)
   - Returns static strings: `"valid_session"` and `"super_session"`
   - **Risk**: No expiration, no validation, easily guessable
   - **Fix**: Implement JWT tokens with expiration

### 🟡 HIGH

4. **Potential SSRF Vulnerability** (`extractor.py`, `agents.py`)
   - `ContentExtractor.extract(url)` and `SearchAgents.get_meta_info(url)` fetch arbitrary URLs
   - **Risk**: Could be used to access internal services (localhost, private IPs)
   - **Fix**: Validate URLs, block private IP ranges, use allowlist of domains

5. **API Key Exposure in Logs** (`api.py:30`)
   - Logs partial API key: `{key[:15]}...{key[-10:]}`
   - **Risk**: Information disclosure (though partial)
   - **Fix**: Remove or mask completely

6. **No Rate Limiting**
   - **Risk**: API endpoints can be abused for DoS
   - **Fix**: Implement rate limiting (Flask-Limiter)

### 🟢 MEDIUM

7. **SQL Injection Protection** ✅
   - All queries use parameterized statements (`?` placeholders)
   - **Status**: SAFE

8. **Input Sanitization** ✅
   - `sanitize_query()` removes dangerous characters
   - **Status**: GOOD, but could be enhanced

9. **CORS Configuration** (`api.py:36`)
   - `CORS(app)` allows all origins
   - **Risk**: CSRF attacks if not properly handled
   - **Fix**: Restrict to specific origins in production

10. **Error Information Disclosure**
    - Stack traces returned to client in some error responses
    - **Risk**: Information disclosure
    - **Fix**: Return generic errors in production, log details server-side

### 🔵 LOW

11. **No HTTPS Enforcement**
    - **Risk**: Credentials transmitted in plaintext
    - **Fix**: Enforce HTTPS in production

12. **Session Management**
    - Tokens stored in localStorage (client-side)
    - **Risk**: XSS could steal tokens
    - **Fix**: Use httpOnly cookies

---

## Logic Issues Found

### 1. **Async/Await Mismatch** (`api.py:466-470, 487-490, 504-506, 511-514`)
   - Code checks for coroutines and uses `asyncio.run()` synchronously
   - **Issue**: Mixing sync/async can cause blocking
   - **Status**: Has workarounds but not ideal

2. **Background Model Loading** (`api.py:64-91`)
   - Heavy models loaded in background thread
   - **Issue**: Endpoints may fail if called before models load
   - **Status**: Has checks but could be improved with readiness endpoint

3. **Topic Filtering Logic** (`api.py:157-162`)
   - Comment says user searches should NOT be filtered
   - **Status**: Logic appears correct, but comment suggests previous confusion

4. **Database Connection Management**
   - SQLite connections opened/closed per operation
   - **Issue**: Could be inefficient under high load
   - **Status**: Works but could use connection pooling

---

## Recommendations

### Immediate Actions:
1. ✅ Move admin credentials to environment variables
2. ✅ Implement proper JWT authentication
3. ✅ Add URL validation for SSRF protection
4. ✅ Remove API key from logs

### Short-term:
5. Add rate limiting
6. Restrict CORS origins
7. Implement proper error handling (hide stack traces)
8. Add HTTPS enforcement

### Long-term:
9. Implement connection pooling for SQLite
10. Add comprehensive logging and monitoring
11. Add unit and integration tests
12. Implement API versioning
