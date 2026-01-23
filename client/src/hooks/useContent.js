import { useState, useEffect } from 'react';
import { orchestrator } from '../services/ClientOrchestrator';

const useContent = (lang) => {
    const [liveNews, setLiveNews] = useState([]);
    const [liveVideos, setLiveVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                console.log('Fetching dashboard data for lang:', lang);
                const data = await orchestrator.fetchDashboardData(lang);
                console.log('Dashboard data received:', { newsCount: data.news?.length, videosCount: data.videos?.length });
                setLiveNews(data.news || []);
                setLiveVideos(data.videos || []);
                setLoading(false);
            } catch (err) {
                console.error("Orchestrator Fetch Error:", err);
                setLoading(false);
            }
        };

        fetchContent();
        // Poll every minute
        const interval = setInterval(fetchContent, 60000);
        return () => clearInterval(interval);
    }, [lang]);

    return { liveNews, liveVideos, loading };
};

export default useContent;
