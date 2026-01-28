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

    const getIcon = (category) => {
        switch (category) {
            case 'religion': return { icon: 'ri-cross-fill', color: 'text-orange-400', bg: 'bg-orange-500/10' };
            case 'global': return { icon: 'ri-global-line', color: 'text-blue-400', bg: 'bg-blue-500/10' };
            case 'science': return { icon: 'ri-flask-line', color: 'text-green-400', bg: 'bg-green-500/10' };
            case 'legal': return { icon: 'ri-scales-3-line', color: 'text-purple-400', bg: 'bg-purple-500/10' };
            case 'sports': return { icon: 'ri-basketball-line', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
            default: return { icon: 'ri-hashtag', color: 'text-gray-400', bg: 'bg-gray-500/10' };
        }
    };

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-white/5 rounded-xl border border-white/10"></div>
            ))}
        </div>
    );

    if (trending.length === 0) return null;

    return (
        <div className="animate-fade-in mb-8">
            <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
                        <i className="ri-fire-line text-orange-500"></i> {t('trending_exploration', 'Trending Exploration')}
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">{t('discovery_subtitle') || 'Explore what is happening around the world'}</p>
                </div>
                <button
                    onClick={fetchTrending}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all transform hover:rotate-180 duration-700 border border-white/10 shadow-lg"
                    title="Refresh Topics"
                >
                    <i className="ri-shuffle-line text-lg"></i>
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {trending.map((item, index) => {
                    const { icon, color, bg } = getIcon(item.category);
                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(item.title)}
                            className="group w-full flex items-center gap-4 px-5 py-3.5 bg-gradient-to-r from-white/5 to-white/0 hover:from-white/10 hover:to-white/5 border border-white/5 hover:border-white/20 rounded-xl transition-all duration-500 text-left backdrop-blur-sm shadow-lg hover:shadow-purple-500/10 hover:scale-[1.01] relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent w-full translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

                            <div className={`w-10 h-10 rounded-lg ${bg} ${color} flex items-center justify-center text-xl shadow-lg group-hover:shadow-${color.replace('text-', '')}/50 transition-shadow duration-300`}>
                                <i className={icon}></i>
                            </div>

                            <div className="flex-1 min-w-0 flex items-center gap-3">
                                <p className="text-base font-semibold text-gray-200 group-hover:text-white truncate transition-colors font-['Rajdhani'] tracking-wide">
                                    {item.title}
                                </p>
                                <span className="text-[10px] text-gray-400 bg-black/20 px-2.5 py-1 rounded-md font-bold uppercase tracking-widest border border-white/5 group-hover:border-white/20 transition-colors">
                                    {item.category || 'General'}
                                </span>
                            </div>

                            <div className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex items-center">
                                <span className="text-xs text-blue-400 mr-2 font-medium tracking-wide">EXPLORE</span>
                                <i className="ri-arrow-right-line text-blue-400"></i>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TrendingSection;
