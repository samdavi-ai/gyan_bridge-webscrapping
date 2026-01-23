# GyanBridge System Documentation (A-Z Guide)

## 1. Executive Summary
GyanBridge is a Next-Gen AI-powered platform designed to empower minority communities in India with Knowledge, Legal Aid, and Digital Content. It bridges the gap between complex information and the user by providing:
- **Real-time Legal Assistance** (Constitutional Rights, Acts, Procedures).
- **Localized Content** (News & Videos provided in Tamil, Hindi, and English).
- **Data-Driven Analytics** (Forecasting trends related to minority safety).
- **Secure Access** (Role-based access for Admins and Super Admins).

## 2. System Architecture

### 2.1 Technology Stack
- **Frontend**: React.js (Single Page Application), Tailwind CSS (Nebula Theme), Lucide/Remix Icons.
- **Backend**: Flask (Python), serving REST API and managing background workers.
- **Database**: SQLite (Lightweight, file-based) for News and Video metadata.
- **AI & ML**:
    - **LLM**: OpenAI GPT-4o (Reasoning, Translation, Legal Analysis).
    - **Vector Search**: ChromaDB (Semantic Search for Legal Context).
    - **Real-time Voice**: LiveKit (WebRTC Low-latency Voice Agent).
    - **Forecasting**: Custom polynomial regression & trend analysis.

### 2.2 Core Components
1.  **API Server (`server/api.py`)**: The central brain. Handles HTTP requests, runs background threads, and initializes engines.
2.  **Legal Engine (`server/src/legal_engine.py`)**: Specialized RAG (Retrieval-Augmented Generation) pipeline. It:
    -   Mines Indian Government websites (indiacode.nic.in, indiankanoon.org).
    -   Filters content for relevance to Constitutional Rights.
    -   Synthesizes answers using GPT-4o.
3.  **Video Engine (`server/src/video_engine.py`)**: Discovery engine for YouTube content.
    -   Monitors curated channels (Tech, Science, Christian, News).
    -   Classifies videos and stores them in DB.
4.  **News Feeder (`server/src/news_feeder.py`)**: RSS & Web Scraper for news.
    -   Fetches updates from global and local sources.
    -   Uses `EventTrendAnalyzer` to quantify incident stats.
5.  **Voice Agent (`server/src/voice_agent.py`)**:
    -   Connects to LiveKit Rooms.
    -   Provides bi-directional voice interaction in local languages.

## 3. Capabilities & Features

### 3.1 Legal Assistant (The Core)
-   **Function**: Acts as a verified legal advisor for Indian Minority Rights.
-   **Capabilities**:
    -   **Contextual Search**: Doesn't just hallucinate; it reads specific Acts (FCRA, IPC) and Procedures.
    -   **Multilingual**: Supports queries and answers in Tamil (`ta`), Hindi (`hi`), and English (`en`).
    -   **Voice Mode**: Real-time conversation capability using LiveKit.
    -   **Read Aloud**: High-quality Text-to-Speech (TTS) for accessibility.

### 3.2 Live Content Feed
-   **News Tab**: Aggregated news articles, translated on-the-fly.
-   **Videos Tab**: Trending/Educational content, categorized by topics (Christianity, Tech, Science).
-   **Search**: Unified search bar that queries both News and Video databases + Live Web.

### 3.3 Analytics & Strategic Outlook
-   **Trend Analysis**: Visualizes data points (e.g., "Incidents in 2025") on interactive charts.
-   **Forecasting**: Predicts future trends (3-5 years) based on historical data.

### 3.4 Admin Panels
-   **Content Moderation**: Approve/Reject mined videos and news before they go live.
-   **Topic Manager**: Super Admin can add/remove tracking keywords (e.g., "Church Attacks", "NGO License").

## 4. Workflows

### 4.1 Data Acquisition Pipeline
1.  **Background Workers** (`video_engine`, `news_feeder`) wake up every X minutes.
2.  They fetch 10-20 items from sources (YouTube API / RSS).
3.  Items are **Duplication Checked** against SQLite DB.
4.  New items are saved with `is_approved=True` (or False if moderation enabled).
5.  Frontend polls `/api/news` or `/api/videos` to display.

### 4.2 Legal Query Workflow
1.  User asks: "Orue Charcha register pannu" (Tamil/English mix).
2.  **Frontend**: Detects `lang='ta'` setting. Sends text to `/api/legal/ask`.
3.  **Backend (`legal_engine`)**:
    -   Translates query to specific English legal terms: "How to register a church in India procedure".
    -   **Search**: Queries `indiacode.nic.in`, `legislative.gov.in`.
    -   **Synthesize**: Feeds snippets to LLM with instruction: *"Respond in TAMIL SCRIPT"*.
4.  **Response**: JSON containing Answer (Tamil), Acts (Links), Procedures (Links).
5.  **Frontend**: Renders the response. User clicks "Voice Mode" -> LiveKit connects -> Agent speaks.

## 5. Security & Deployment
-   **AccessTokens**: LiveKit tokens generated on-the-fly with strict permissions.
-   **Environment Variables**: All keys (`OPENAI_API_KEY`, `LIVEKIT_*`) stored in `.env`.
-   **Deployment**: Ready for Dockerization. Runs on port `5001`.

## 6. Directory Structure
```
/GB_web_scraber
├── server/
│   ├── api.py              # Main Entry Point
│   ├── run_agent.py        # Voice Agent Entry Point
│   ├── src/                # Logic Cores (Engines)
│   ├── static/             # React Frontend (built-in)
│   └── templates/          # HTML Host file
├── requirements.txt
└── .env
```

---
*Generated by Antigravity AI for GyanBridge.*
