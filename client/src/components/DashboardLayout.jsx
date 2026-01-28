import React, { useState, useEffect, useRef } from 'react';
import LiveAnalyticsDashboard from './AnalysisDashboard';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import NewsCard from './NewsCard';
import VideoCard from './VideoCard';
import SearchSuggestions from './SearchSuggestions';
import VideoModal from './VideoModal';
import ReaderModal from './ReaderModal';
import ContextMenu from './ContextMenu';
import LegalAssistantModal from './LegalAssistantModal';
import TrendingSection from './TrendingSection';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DashboardLayout = () => {
    const { t, i18n } = useTranslation();
    const { user, currentProfile, logout, switchProfile, getSavedVideos, saveVideo, unsaveVideo, getSavedNews, saveNews, unsaveNews } = useAuth();
    const navigate = useNavigate();

    // Check if profile is active
    useEffect(() => {
        if (!currentProfile) {
            navigate('/profiles');
        }
    }, [currentProfile, navigate]);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [newsSearchQuery, setNewsSearchQuery] = useState('');
    const [videosSearchQuery, setVideosSearchQuery] = useState('');
    const [notInterestedItems, setNotInterestedItems] = useState([]);
    const [likedItems, setLikedItems] = useState([]);
    const [inlineReaderArticle, setInlineReaderArticle] = useState(null);

    // Data States
    const [news, setNews] = useState([]);
    const [videos, setVideos] = useState([]);
    const [webResults, setWebResults] = useState([]);
    const [savedItems, setSavedItems] = useState([]);
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);

    // UI States
    const [loading, setLoading] = useState(false);
    const [activeVideo, setActiveVideo] = useState(null);
    const [activeArticle, setActiveArticle] = useState(null);

    // Fetch saved items on profile change
    useEffect(() => {
        const fetchSaved = async () => {
            if (currentProfile) {
                setIsLoadingSaved(true);
                try {
                    const [videosRes, newsRes] = await Promise.all([getSavedVideos(), getSavedNews()]);
                    // Normalize data structure
                    // Backend returns dicts. Ensure ID consistency.
                    // video: video_id, title, thumbnail, channel
                    // news: url, title, source

                    const formattedVideos = (videosRes || []).map(v => ({ ...v, id: v.video_id, type: 'video' }));
                    const formattedNews = (newsRes || []).map(n => ({ ...n, id: n.url, type: 'news', url: n.url }));

                    setSavedItems([...formattedVideos, ...formattedNews]);
                } catch (e) {
                    console.error("Failed to fetch saved items", e);
                } finally {
                    setIsLoadingSaved(false);
                }
            } else {
                setSavedItems([]);
            }
        };
        fetchSaved();
    }, [currentProfile]);

    useEffect(() => {
        fetchNews();
        fetchVideos();
        // Restore local preferences (liked/not interested) - Keep these local for now or move to backend later
        const notInterested = JSON.parse(localStorage.getItem('gb_not_interested') || '[]');
        setNotInterestedItems(notInterested);
        const liked = JSON.parse(localStorage.getItem('gb_liked') || '[]');
        setLikedItems(liked);
    }, []);

    // Refresh content when language changes & Save Preference
    useEffect(() => {
        localStorage.setItem('gb_language', i18n.language);
        fetchNews();
        fetchVideos();
    }, [i18n.language]);

    // Persist local preferences
    useEffect(() => {
        localStorage.setItem('gb_liked', JSON.stringify(likedItems));
    }, [likedItems]);

    useEffect(() => {
        localStorage.setItem('gb_not_interested', JSON.stringify(notInterestedItems));
    }, [notInterestedItems]);

    const fetchNews = async () => {
        try {
            const res = await fetch(`/api/news?lang=${i18n.language}`);
            const data = await res.json();
            setNews(Array.isArray(data) ? data : []);
        } catch (e) { console.error("Failed to fetch news", e); }
    };

    const fetchVideos = async () => {
        try {
            const res = await fetch(`/api/videos?lang=${i18n.language}`);
            const data = await res.json();
            setVideos(Array.isArray(data) ? data : []);
        } catch (e) { console.error("Failed to fetch videos", e); }
    };

    // Helper Functions (DEFINED EARLY to avoid ReferenceErrors in render)
    const isSaved = (item) => {
        if (!item) return false;
        const itemId = item.video_id || item.id || item.url;
        return !!savedItems.find(i => (i.video_id === itemId || i.id === itemId || i.url === itemId));
    };

    const isLiked = (item) => {
        if (!item) return false;
        return !!likedItems.find(i => i.id === item.id || i.url === item.url);
    };

    const isNotInterested = (item) => {
        if (!item || !notInterestedItems) return false;
        // Check both ID and URL for robust matching
        return notInterestedItems.some(i =>
            (i.id && item.id && i.id === item.id) ||
            (i.url && item.url && i.url === item.url)
        );
    };

    const filterContent = (items) => {
        if (!Array.isArray(items)) return [];
        return items.filter(item => !isNotInterested(item));
    };

    const toggleSave = async (item) => {
        if (!currentProfile) return;

        // Determine type key ID
        const isVideo = item.video_id || item.videoId || item.duration || item.type === 'video';
        const itemId = item.video_id || item.id || item.url; // url used as ID for news

        const isAlreadySaved = savedItems.find(i => (i.video_id === itemId || i.id === itemId || i.url === itemId || (i.id === item.id && i.type === item.type)));

        let success = false;

        // Optimistic Update could go here, but let's wait for success to be safe or do parallel
        if (isAlreadySaved) {
            // Unsave
            if (isVideo) {
                success = await unsaveVideo(isAlreadySaved.video_id || itemId); // Use stored video_id if available
            } else {
                success = await unsaveNews(item.url || itemId);
            }

            if (success) {
                setSavedItems(prev => prev.filter(i => {
                    const iId = i.video_id || i.id || i.url;
                    return iId !== itemId;
                }));
            }
        } else {
            // Save
            if (isVideo) {
                // Ensure video object has fields backend expects
                const videoData = {
                    id: itemId, // Mapping to video_id
                    videoId: itemId,
                    title: item.title,
                    thumbnail: item.thumbnail || item.image,
                    channel: item.channel || item.source
                };
                success = await saveVideo(videoData);
            } else {
                const newsData = {
                    url: item.url,
                    title: item.title,
                    source: item.source
                };
                success = await saveNews(newsData);
            }

            if (success) {
                const newItem = { ...item, type: isVideo ? 'video' : 'news', id: itemId, video_id: isVideo ? itemId : undefined };
                setSavedItems(prev => [newItem, ...prev]);
            }
        }
    };

    const toggleLike = (item) => {
        let newLiked;
        if (likedItems.find(i => i.id === item.id || i.url === item.url)) {
            newLiked = likedItems.filter(i => i.id !== item.id && i.url !== item.url);
        } else {
            newLiked = [...likedItems, item];
        }
        setLikedItems(newLiked);
    };

    const markNotInterested = (item) => {
        const newNotInterested = [...notInterestedItems, item];
        setNotInterestedItems(newNotInterested);
    };

    const handleSearch = (query) => {
        if (!query || query.trim() === '') return;
        setSearchQuery(query);
        setLoading(true);
        Promise.all([
            fetch(`/api/news?q=${encodeURIComponent(query)}&lang=${i18n.language}`).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`/api/videos?q=${encodeURIComponent(query)}&lang=${i18n.language}`).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: query, type: 'web', lang: i18n.language }),
                signal: AbortSignal.timeout(30000)
            }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
        ]).then(([newsData, videoData, webData]) => {
            setNews(Array.isArray(newsData) ? newsData : []);
            setVideos(Array.isArray(videoData) ? videoData : []);
            setWebResults(Array.isArray(webData.results) ? webData.results : []);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    };

    const handleNewsSearch = (query) => {
        if (!query || query.trim() === '') { fetchNews(); return; }
        setNewsSearchQuery(query);
        setLoading(true);
        fetch(`/api/news?q=${encodeURIComponent(query)}&lang=${i18n.language}`)
            .then(r => r.json())
            .then(data => { setNews(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => { setNews([]); setLoading(false); });
    };

    const handleVideosSearch = (query) => {
        if (!query || query.trim() === '') { fetchVideos(); return; }
        setVideosSearchQuery(query);
        setLoading(true);
        fetch(`/api/videos?q=${encodeURIComponent(query)}&lang=${i18n.language}`)
            .then(r => r.json())
            .then(data => { setVideos(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => { setVideos([]); setLoading(false); });
    };

    const SidebarItem = ({ id, icon, label, onClick }) => (
        <button
            onClick={() => onClick ? onClick() : setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === id ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
            <i className={`${icon} text-xl`}></i>
            <span className="font-medium font-['Rajdhani']">{label}</span>
        </button>
    );

    const NavItem = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 font-medium text-sm ${activeTab === id ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
            {icon && <i className={icon}></i>}
            {label}
        </button>
    );

    return (
        <div className="flex h-screen bg-[#0F0F12] text-white font-['Rajdhani'] overflow-hidden">

            {/* Sidebar */}
            <div className={`absolute left-0 top-0 h-full flex flex-col border-r border-white/10 bg-[#15151A] z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64`}>
                <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
                    <img src="/logo.png" alt="GyanBridge" className="w-8 h-8 object-contain" />
                    <h1 className="text-xl font-bold tracking-wider">GyanBridge</h1>
                </div>

                <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest px-4 mb-2">{t('menu')}</p>
                    <SidebarItem id="dashboard" icon="ri-home-4-line" label={t('dashboard')} />
                    <SidebarItem id="analytics" icon="ri-bar-chart-groupped-line" label={t('analytics')} />
                    <SidebarItem id="wishlist" icon="ri-heart-line" label={t('wishlist')} />
                    <SidebarItem id="legal" icon="ri-scales-3-line" label={t('legal_assistant')} onClick={() => setIsLegalOpen(true)} />

                </div>

                <div className="p-4 border-t border-white/10 bg-[#121215]">
                    <div className="flex gap-2 mb-4">
                        {['en', 'hi', 'ta'].map(lang => (
                            <button
                                key={lang}
                                onClick={() => i18n.changeLanguage(lang)}
                                className={`flex-1 py-1 rounded text-xs font-bold uppercase border ${i18n.language === lang ? 'bg-white text-black border-white' : 'border-white/20 text-gray-400 hover:border-white'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                            {currentProfile?.name?.[0]?.toUpperCase() || user?.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{currentProfile?.name || user?.full_name || 'Guest'}</p>
                            <p className="text-xs text-green-400">{t('online')}</p>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => navigate('/profiles')} title="Switch Profile" className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition">
                                <i className="ri-user-settings-line"></i>
                            </button>
                            <button onClick={logout} title="Logout" className="p-2 hover:bg-red-500/10 rounded-full text-red-400 transition">
                                <i className="ri-logout-box-r-line"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>

                {/* Top Header */}
                <div className="h-16 bg-[#15151A]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-30 sticky top-0">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white mr-4"
                    >
                        <i className={`text-xl ${isSidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'}`}></i>
                    </button>
                    <div className={`flex-1 max-w-xl transition-opacity duration-300 ${(activeTab === 'news' || activeTab === 'videos') ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <SearchSuggestions query={searchQuery} setQuery={setSearchQuery} type="web" onSelect={handleSearch} onClose={() => { }} />
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                        <NavItem id="news" label={t('news')} icon="ri-newspaper-line" />
                        <NavItem id="videos" label={t('videos')} icon="ri-video-line" />

                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                            <>
                                <div className="h-6 w-px bg-white/10 mx-2"></div>
                                <NavItem
                                    id="admin"
                                    label="Admin"
                                    icon="ri-shield-user-line"
                                />
                            </>
                        )}

                        <div className="h-6 w-px bg-white/10 mx-2"></div>

                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative p-8">
                    {loading && (
                        <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center backdrop-blur-sm">
                            <div className="animate-spin text-4xl text-purple-500"><i className="ri-loader-4-line"></i></div>
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <div className="space-y-12 animate-fade-in max-w-7xl mx-auto">
                            <div className="relative py-8 px-6 rounded-2xl bg-gradient-to-br from-indigo-900/60 via-purple-900/50 to-blue-900/40 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-md group hover:border-white/20 transition-all duration-500">
                                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-purple-500/20 rounded-full blur-[80px] opacity-70 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[80px] opacity-70 group-hover:opacity-100 transition-opacity duration-700"></div>

                                <div className="relative flex flex-row items-center justify-between gap-6">
                                    <div className="flex-1 text-left">
                                        <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent tracking-tight leading-tight">
                                            {searchQuery ? `${t('search_results', 'Results for')} "${searchQuery}"` : `${t('welcome_back', 'Welcome back')}, ${currentProfile?.name || user?.full_name || 'Explorer'}`}
                                        </h1>
                                        <p className="text-base text-gray-400 font-medium">
                                            {searchQuery ? t('unified_results', 'Here is what we found') : t('personalized_feed', 'Your personalized feed and legal updates are ready.')}
                                        </p>
                                    </div>

                                    {!searchQuery && (
                                        <div className="flex gap-3">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-lg border border-white/5 text-xs text-green-400 font-medium backdrop-blur-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {t('live_updates', 'Live')}
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-lg border border-white/5 text-xs text-blue-400 font-medium backdrop-blur-sm">
                                                <i className="ri-shield-check-line"></i> {t('secure_access', 'Secure')}
                                            </div>
                                        </div>
                                    )}

                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                        <i className="ri-layout-grid-line text-xl text-white"></i>
                                    </div>
                                </div>
                            </div>



                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2"><i className="ri-video-fill text-red-500"></i> {searchQuery ? t('videos') : t('trending_videos')}</h2>
                                    {!searchQuery && <button onClick={() => setActiveTab('videos')} className="text-purple-400 hover:text-white transition text-sm">{t('view_all')}</button>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {(searchQuery ? filterContent(videos) : filterContent(videos).slice(0, 3)).map((video, i) => (
                                        <VideoCard
                                            key={i}
                                            video={video}
                                            isSaved={isSaved(video)}
                                            onToggleSave={toggleSave}
                                            isLiked={isLiked(video)}
                                            onToggleLike={toggleLike}
                                            onNotInterested={markNotInterested}
                                            onWatch={setActiveVideo}
                                        />
                                    ))}
                                </div>
                                {searchQuery && videos.length === 0 && <p className="text-gray-500 italic">{t('no_videos')}</p>}
                            </section>

                            {(webResults.length > 0) && (
                                <section>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold flex items-center gap-2"><i className="ri-global-line text-green-500"></i> Web Results</h2>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        {filterContent(webResults).map((result, i) => (
                                            <NewsCard
                                                key={`web-${i}`}
                                                article={result}
                                                isSaved={isSaved(result)}
                                                onToggleSave={toggleSave}
                                                isLiked={isLiked(result)}
                                                onToggleLike={toggleLike}
                                                onNotInterested={markNotInterested}
                                                onRead={setActiveArticle}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {!searchQuery && (
                                <section className="mb-12">
                                    <TrendingSection onSelect={(topic) => handleSearch(topic)} />
                                </section>
                            )}

                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2"><i className="ri-newspaper-fill text-blue-500"></i> {searchQuery ? t('news') : t('latest_news')}</h2>
                                    {!searchQuery && <button onClick={() => setActiveTab('news')} className="text-purple-400 hover:text-white transition text-sm">{t('view_all')}</button>}
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {(searchQuery ? filterContent(news) : filterContent(news).slice(0, 4)).map((article, i) => (
                                        <NewsCard
                                            key={i}
                                            article={article}
                                            isSaved={isSaved(article)}
                                            onToggleSave={toggleSave}
                                            isLiked={isLiked(article)}
                                            onToggleLike={toggleLike}
                                            onNotInterested={markNotInterested}
                                            onRead={setActiveArticle}
                                        />
                                    ))}
                                </div>
                                {searchQuery && news.length === 0 && <p className="text-gray-500 italic">{t('no_news')}</p>}
                            </section>
                        </div>
                    )}

                    {activeTab === 'news' && (
                        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h1 className="text-3xl font-bold">News Feed</h1>
                                <div className="relative w-96">
                                    <SearchSuggestions query={newsSearchQuery} setQuery={setNewsSearchQuery} type="news" onSelect={handleNewsSearch} onClose={() => { }} />
                                    {newsSearchQuery && <button onClick={() => { setNewsSearchQuery(''); fetchNews(); }} className="absolute -right-12 top-2 text-gray-400 hover:text-white"><i className="ri-close-circle-line text-xl"></i></button>}
                                </div>
                            </div>
                            {filterContent(news).length === 0 ? <p className="text-gray-500 text-center py-12">{t('no_news')}</p> : (
                                <div className="grid grid-cols-1 gap-6">
                                    {filterContent(news).map((item, i) => (
                                        <NewsCard
                                            key={i}
                                            article={item}
                                            isSaved={isSaved(item)}
                                            onToggleSave={toggleSave}
                                            isLiked={isLiked(item)}
                                            onToggleLike={toggleLike}
                                            onNotInterested={markNotInterested}
                                            onRead={setActiveArticle}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'videos' && (
                        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h1 className="text-3xl font-bold">Video Library</h1>
                                <div className="relative w-96">
                                    <SearchSuggestions query={videosSearchQuery} setQuery={setVideosSearchQuery} type="videos" onSelect={handleVideosSearch} onClose={() => { }} />
                                    {videosSearchQuery && <button onClick={() => { setVideosSearchQuery(''); fetchVideos(); }} className="absolute -right-12 top-2 text-gray-400 hover:text-white"><i className="ri-close-circle-line text-xl"></i></button>}
                                </div>
                            </div>
                            {filterContent(videos).length === 0 ? <p className="text-gray-500 text-center py-12">{t('no_videos')}</p> : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filterContent(videos).map((item, i) => (
                                        <VideoCard
                                            key={i}
                                            video={item}
                                            isSaved={isSaved(item)}
                                            onToggleSave={toggleSave}
                                            isLiked={isLiked(item)}
                                            onToggleLike={toggleLike}
                                            onNotInterested={markNotInterested}
                                            onWatch={setActiveVideo}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'analytics' && <div className="max-w-7xl mx-auto"><LiveAnalyticsDashboard /></div>}
                    {activeTab === 'admin' && (user?.role === 'admin' || user?.role === 'superadmin') && <div className="max-w-7xl mx-auto"><AdminDashboard /></div>}
                    {activeTab === 'superadmin' && user?.role === 'superadmin' && <div className="max-w-7xl mx-auto"><SuperAdminDashboard /></div>}

                    {activeTab === 'wishlist' && (
                        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
                            <h1 className="text-3xl font-bold">Wishlist (<span className="text-purple-500">{savedItems.length}</span>)</h1>
                            {isLoadingSaved ? (
                                <div className="flex justify-center p-12"><div className="animate-spin text-4xl text-purple-500"><i className="ri-loader-4-line"></i></div></div>
                            ) : savedItems.length === 0 ? <p className="text-gray-500">No items saved yet.</p> : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {savedItems.map((item, i) => item.type === 'video' || item.duration ?
                                        <VideoCard key={i} video={item} isSaved={true} onToggleSave={toggleSave} isLiked={isLiked(item)} onToggleLike={toggleLike} onNotInterested={markNotInterested} onWatch={setActiveVideo} /> :
                                        <NewsCard key={i} article={item} isSaved={true} onToggleSave={toggleSave} isLiked={isLiked(item)} onToggleLike={toggleLike} onNotInterested={markNotInterested} onRead={setActiveArticle} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Modals */}
            {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
            {activeArticle && <ReaderModal url={activeArticle.url} topic={activeArticle.title} lang={i18n.language} article={activeArticle} onClose={() => setActiveArticle(null)} />}

            {isLegalOpen && <LegalAssistantModal onClose={() => setIsLegalOpen(false)} />}
        </div>
    );
};

export default DashboardLayout;
