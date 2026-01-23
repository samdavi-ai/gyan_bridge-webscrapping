/**
 * ClientOrchestrator.js
 * Central "Conductor" for the Frontend application.
 * Manages API calls, Data Sync, and State logic.
 */

class ClientOrchestrator {
    constructor() {
        this.apiBase = 'http://localhost:5001/api';
        this.cache = {
            news: [],
            videos: [],
            lastFetch: 0
        };
        this.isFetching = false;
    }

    /**
     * Singleton Instance
     */
    static getInstance() {
        if (!ClientOrchestrator.instance) {
            ClientOrchestrator.instance = new ClientOrchestrator();
        }
        return ClientOrchestrator.instance;
    }

    /**
     * Orchestrates fetching of dashboard data.
     * Parallelizes calls to News and Video endpoints.
     */
    async fetchDashboardData(lang = 'en') {
        if (this.isFetching) return this.cache;

        this.isFetching = true;
        try {
            console.log(`🎻 Orchestrator: Conducting fetch for ${lang}...`);

            const [news, videos] = await Promise.all([
                this._fetchNews(lang),
                this._fetchVideos(lang)
            ]);

            this.cache = {
                news: news || [],
                videos: videos || [],
                lastFetch: Date.now()
            };

            return this.cache;
        } catch (error) {
            console.error("Orchestrator Fetch Error:", error);
            throw error;
        } finally {
            this.isFetching = false;
        }
    }

    async _fetchNews(lang) {
        try {
            const res = await fetch(`${this.apiBase}/news?lang=${lang}`);
            if (!res.ok) throw new Error("News Fetch Failed");
            return await res.json();
        } catch (e) {
            console.warn("News fallback:", e);
            return [];
        }
    }

    async _fetchVideos(lang) {
        try {
            const res = await fetch(`${this.apiBase}/videos?lang=${lang}`);
            if (!res.ok) throw new Error("Video Fetch Failed");
            return await res.json();
        } catch (e) {
            console.warn("Video fallback:", e);
            return [];
        }
    }

    /**
     * Unified Search
     */
    async search(query, type = 'web', lang = 'en', limit = 20) {
        try {
            const res = await fetch(`${this.apiBase}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: query, limit, type, lang })
            });
            if (!res.ok) throw new Error("Search Failed");
            return await res.json();
        } catch (e) {
            console.error("Orchestrator Search Error:", e);
            return { results: [], errors: [e.message] };
        }
    }

    /**
     * Legal Assistant Interface
     */
    async askLegalAssistant(query, lang) {
        // Post to /api/legal/ask
        const res = await fetch(`${this.apiBase}/legal/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, lang })
        });
        return await res.json();
    }
}

export const orchestrator = ClientOrchestrator.getInstance();
