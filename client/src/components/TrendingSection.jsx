import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const TrendingSection = ({ onSelect }) => {
    const { t } = useTranslation();
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTrending = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/trending');
            const data = await res.json();
            setTrending(data.results || []);
        } catch (e) {
            console.error("Failed to fetch trending", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrending();
    }, []);

    const icons = ['👶', '🏢', '⚖️', '🍽️', '⛪', '📖', '🌍', '🕯️'];

    if (loading) return (
        <div className="animate-pulse space-y-4 max-w-2xl mx-auto py-8">
            <div className="h-6 bg-white/5 rounded w-1/4 mb-6"></div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-white/5 rounded-xl w-full"></div>
            ))}
        </div>
    );

    if (trending.length === 0) return null;

    return (
        <div className="max-w-2xl mx-auto py-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-gray-400 font-medium text-lg flex items-center gap-2">
                    Try something new
                </h2>
                <button
                    onClick={fetchTrending}
                    className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all transform hover:rotate-180 duration-500"
                >
                    <i className="ri-shuffle-line text-xl"></i>
                </button>
            </div>

            <div className="space-y-1">
                {trending.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => onSelect(item.title)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group text-left border border-transparent hover:border-white/5 active:scale-[0.98]"
                    >
                        <div className="text-2xl transform group-hover:scale-110 transition-transform">
                            {icons[index % icons.length]}
                        </div>
                        <div className="flex-1">
                            <p className="text-gray-300 group-hover:text-white transition-colors line-clamp-1 text-lg">
                                {item.title}
                            </p>
                        </div>
                        <i className="ri-arrow-right-line text-gray-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1"></i>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TrendingSection;
