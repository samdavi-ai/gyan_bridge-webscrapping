# 🌌 GyanBridge: System Architecture & Capabilities
**Version 2.0 | Built for High-Recall Data Harvesting**

## 1. How It Works (The Core Process)
Nebula is not just a scraper; it is an **Intelligence Orchestrator**. When you click "SCAN", the following pipeline executes:

**1. Intent Recognition (The Brain)**
*   The system analyzes your query (e.g., "Christian persecution trends").
*   It activates specific "Search Intents" (Faith Data, News, Academic, Social).

**2. The Orchestrator (The Conductor)**
*   Located in `server/src/orchestrator.py`.
*   It converts your topic into advanced **Boolean Dorks** (e.g., `site:opendoors.org OR site:cbn.com "persecution"`).
*   It fires these queries in parallel across multiple engines (Google Deep Search & DuckDuckGo).

**3. Intelligent Filtering (The Guard)**
*   **Noise Cancellation**: It strips out filler words ("details", "about") to focus on core keywords.
*   **Ratio Check**: A result is rejected unless it matches >50% of your specific keywords.
*   **Aggressive Deduplication**: It detects identical content even if the URLs are slightly different (e.g., stripping tracking codes).

**4. Meta-Enrichment (The Eyes)**
*   The `SearchAgents` visit the top results in real-time.
*   They extract high-quality visuals (Open Graph images) and descriptions directly from the source code, replacing generic placeholders.

**5. Antigravity UI (The Face)**
*   The React frontend receives the clean JSON data.
*   It renders "Data Pods" with levitation physics and holographic effects.

---

## 2. Model Capabilities

### 🛡️ The Orchestrator Model
*   **Role**: Decision Maker.
*   **Capability**:
    *   **Intent Mapping**: Knows that "Church" implies `site:christianpost.com` and `site:cbn.com`.
    *   **Smart Filter**: Can distinguish between a "Windows Update" and a "Christian Conference Update" based on context.
    *   **Deduplication**: Ensures you never see the same article twice.

### 🕵️ The Search Agents
*   **Role**: Data Retrievers.
*   **Capability**:
    *   **Multi-Source Hopping**: Can jump between News, Academic Papers (Pew Research), and Social Forums simultaneously.
    *   **Meta-Scraping**: Fetches the "real" image representing the article, not just a logo.

### 🔮 The Visual Engine (Nebula UI)
*   **Role**: Visualization.
*   **Capability**:
    *   **Glassmorphism**: Frosted glass panels for a modern "Head-Up Display" feel.
    *   **Physics**: Elements react to your mouse (Tilt, Glare, Levitation).
    *   **Data Layout**: Optimized "Horizontal Pods" (Data Left, Visuals Right) for rapid scanning.

---

## 3. Data Sources (Active Coverage)
We have trained the model to specifically target:

*   **Faith & News**: The Christian Post, CBN News, TBN.
*   **Research**: Pew Research Center, Center for Study of Global Christianity.
*   **Advocacy**: Open Doors (World Watch List).
*   **Global Web**: CNN, BBC, Reuters (for cross-referencing).

---

## 4. Main Entry Point

**Primary File:** `server/api.py`

This is the main Flask application that powers the entire Nebula system. It:
- Serves the web interface at `http://localhost:5000`
- Provides all API endpoints for search, scraping, news feed, and analytics
- Initializes core components (Orchestrator, RAG Engine, News Feeder, Predictor)
- Runs on port 5000 by default (configurable via `.env`)

---

## 5. How to Run (Windows Guide)

### 🚀 Standard Mode (Start Everything)
Since the frontend is now integrated into the backend, you only need to run the server!

1. **Navigate to Server Directory**:
   ```powershell
   cd d:\GB_web_scraber\server
   ```
2. **Activate Virtual Environment**:
   ```powershell
   ..\.venv\Scripts\Activate
   ```
3. **Run the App**:
   ```powershell
   python api.py
   ```
   *Open `http://localhost:5001` in your browser. The full UI and Backend are running here.*

---

### 🛠️ Developer Mode (Hot Reload)
If you want to edit the React UI and see changes instantly:

1. **Run Backend** (Terminal 1):
   ```powershell
   cd server
   ..\.venv\Scripts\Activate
   python api.py
   ```

2. **Run Frontend** (Terminal 2):
   ```powershell
   cd client
   npm run dev
   ```
   *Open `http://localhost:3000`. Changes to React files will update instantly.*


---

## 6. 🧠 Admin Watchtower (New AI Analytics)
Nebula now features **"Antigravity Analytics"**, a RAG-powered engine that lets you talk to your data.

### How to Access:
1. Open the main app (`localhost:5000`).
2. Click the **Admin Icon** (👤) in the top-right corner.
3. Login using the default key: `admin123`.

### Capabilities:
*   **Natural Language Queries**: Ask "What is the trend of Christian persecution in Nigeria?"
*   **RAG Engine**: Retrieves cached articles using HuggingFace embeddings (all-MiniLM-L6-v2 model).
*   **LLM Synthesis**: OpenAI GPT-4 Turbo analyzes the data with high accuracy, falling back to GPT-3.5 Turbo for speed.
*   **Auto-Retry**: Robust handling of API rate limits ensures stability.





taskkill /F /IM python.exe /T
taskkill /F /IM node.exe /T

---

## 7. 💻 Technology Stack

### 🌟 1. The Frontend (Client)
*Built for speed, interactivity, and a premium "Glassmorphism" look.*
*   **Core Framework**: **React** (Industry standard for dynamic UIs).
*   **Build Tool**: **Vite** (Super-fast build tool, replaces Webpack).
*   **Styling**: **Tailwind CSS** (Utility-first CSS for gradients & responsive layouts).
*   **Icons**: **Remix Icons** (`ri-` classes).
*   **Routing**: **React Router** (Seamless navigation).

### 🧠 2. The Backend (Server)
*The "Brain" handling logic, AI, and data mining.*
*   **Core Framework**: **Flask** (Lightweight Python web server).
*   **Database**: **SQLite** (Self-contained, file-based SQL DB).
*   **Authentication**: **JWT** + **Bcrypt** (Secure session management).

### 🤖 3. The AI & Data Engine
*The "Secret Sauce" making the app smart.*
*   **Web Scrapers**: `Trafilatura`, `Newspaper3k`, `Feedparser`, `Scrapetube`.
*   **AI Models**:
    *   **OpenAI API**: Legal Assistant & TTS.
    *   **Whisper**: Voice-to-Text.
    *   **Scikit-Learn**: Data clustering & trend analysis.

### 🔗 4. Architecture (Hybrid)
*   **Development**: Frontend (`:3000`) proxies to Backend (`:5001`).
*   **Production**: Backend serves static frontend files from `/dist`. A single executable Python app.
