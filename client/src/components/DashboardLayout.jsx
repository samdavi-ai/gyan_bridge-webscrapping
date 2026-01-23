
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
import { useTranslation } from 'react-i18next';

const DashboardLayout = ({ user, onLogout }) => {
    const { t, i18n } = useTranslation();
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
    const [webResults, setWebResults] = useState([]); // [NEW] Web Search Results
    const [savedItems, setSavedItems] = useState([]);

    // UI States
    const [loading, setLoading] = useState(false);
    const [activeVideo, setActiveVideo] = useState(null);
    const [activeArticle, setActiveArticle] = useState(null);
    const [voiceMode, setVoiceMode] = useState(false);

    // Removed internal states for Legal Assistant as it's now a component

    useEffect(() => {
        // [PERSISTENCE] Restore language handled by i18n.js
        // const savedLang = localStorage.getItem('gb_language');
        // if (savedLang && savedLang !== i18n.language) {
        //     i18n.changeLanguage(savedLang);
        // }

        fetchNews();
        fetchVideos();
        const saved = JSON.parse(localStorage.getItem('gb_saved') || '[]');
        setSavedItems(saved);
        const notInterested = JSON.parse(localStorage.getItem('gb_not_interested') || '[]');
        setNotInterestedItems(notInterested);
        const liked = JSON.parse(localStorage.getItem('gb_liked') || '[]');
        setLikedItems(liked);
        setActiveTab('dashboard');
    }, []);

    // Refresh content when language changes & Save Preference
    useEffect(() => {
        localStorage.setItem('gb_language', i18n.language);
        fetchNews();
        fetchVideos();
    }, [i18n.language]);

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

    const handleSearch = (query) => {
        if (!query || query.trim() === '') return;
        setSearchQuery(query);
        setLoading(true);
        console.log(`🔍 [Frontend] Dashboard search triggered: "${query}"`);
        Promise.all([
            fetch(`/api/news?q=${encodeURIComponent(query)}&lang=${i18n.language}`)
                .then(r => {
                    if (!r.ok) throw new Error(`News API: ${r.status}`);
                    return r.json();
                })
                .catch(err => {
                    console.error('❌ News search failed:', err);
                    return [];
                }),
            fetch(`/api/videos?q=${encodeURIComponent(query)}&lang=${i18n.language}`, {
                signal: AbortSignal.timeout(30000)
            })
                .then(r => {
                    if (!r.ok) throw new Error(`Video API: ${r.status}`);
                    return r.json();
                })
                .catch(err => {
                    console.error('❌ Video search failed:', err);
                    return [];
                }),
            // [NEW] Fetch Web Results
            fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: query, type: 'web', lang: i18n.language }),
                signal: AbortSignal.timeout(30000)
            })
                .then(r => {
                    if (!r.ok) throw new Error(`Web API: ${r.status}`);
                    return r.json();
                })
                .catch(err => {
                    console.error('❌ Web search failed:', err);
                    return { results: [] };
                })
        ]).then(([newsData, videoData, webData]) => {
            console.log(`✅ [Frontend] Dashboard search complete - News: ${Array.isArray(newsData) ? newsData.length : 0}, Videos: ${Array.isArray(videoData) ? videoData.length : 0}, Web: ${Array.isArray(webData.results) ? webData.results.length : 0}`);
            setNews(Array.isArray(newsData) ? newsData : []);
            setVideos(Array.isArray(videoData) ? videoData : []);
            setWebResults(Array.isArray(webData.results) ? webData.results : []);
            setLoading(false);
            // Stay on dashboard to show search results
        }).catch(err => {
            console.error('❌ [Frontend] Dashboard search error:', err);
            setLoading(false);
        });
    };

    const handleNewsSearch = (query) => {
        if (!query || query.trim() === '') {
            fetchNews();
            return;
        }
        setNewsSearchQuery(query);
        setLoading(true);
        console.log(`🔍 [Frontend] News search triggered: "${query}"`);
        fetch(`/api/news?q=${encodeURIComponent(query)}&lang=${i18n.language}`)
            .then(r => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                }
                return r.json();
            })
            .then(data => {
                console.log(`✅ [Frontend] News search results: ${Array.isArray(data) ? data.length : 0} items`);
                setNews(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error('❌ [Frontend] News search error:', err);
                setLoading(false);
                setNews([]); // Clear results on error
            });
    };

    const handleVideosSearch = (query) => {
        if (!query || query.trim() === '') {
            fetchVideos();
            return;
        }
        setVideosSearchQuery(query);
        setLoading(true);
        console.log(`🔍 [Frontend] Video search triggered: "${query}"`);
        fetch(`/api/videos?q=${encodeURIComponent(query)}&lang=${i18n.language}`, {
            signal: AbortSignal.timeout(30000) // 30 second timeout
        })
            .then(r => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                }
                return r.json();
            })
            .then(data => {
                console.log(`✅ [Frontend] Video search results: ${Array.isArray(data) ? data.length : 0} items`);
                setVideos(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error('❌ [Frontend] Video search error:', err);
                setLoading(false);
                setVideos([]); // Clear results on error
            });
    };

    const toggleSave = (item) => {
        let newSaved;
        if (savedItems.find(i => i.id === item.id || i.url === item.url)) {
            newSaved = savedItems.filter(i => i.id !== item.id && i.url !== item.url);
        } else {
            newSaved = [...savedItems, item];
        }
        setSavedItems(newSaved);
        localStorage.setItem('gb_saved', JSON.stringify(newSaved));
    };

    const isSaved = (item) => !!savedItems.find(i => i.id === item.id || i.url === item.url);

    const isLiked = (item) => !!likedItems.find(i => i.id === item.id || i.url === item.url);

    const isNotInterested = (item) => !!notInterestedItems.find(i => i.id === item.id || i.url === item.url);

    const toggleLike = (item) => {
        let newLiked;
        if (likedItems.find(i => i.id === item.id || i.url === item.url)) {
            newLiked = likedItems.filter(i => i.id !== item.id && i.url !== item.url);
        } else {
            newLiked = [...likedItems, item];
        }
        setLikedItems(newLiked);
        localStorage.setItem('gb_liked', JSON.stringify(newLiked));
    };

    const markNotInterested = (item) => {
        const newNotInterested = [...notInterestedItems, item];
        setNotInterestedItems(newNotInterested);
        localStorage.setItem('gb_not_interested', JSON.stringify(newNotInterested));
    };

    // Filter out not interested items
    const filterContent = (items) => {
        return items.filter(item => !isNotInterested(item));
    };

    // Removed toggleLegalDictation

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
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{user?.username || 'Guest'}</p>
                            <p className="text-xs text-green-400">{t('online')}</p>
                        </div>
                        <button onClick={onLogout} title="Logout" className="p-2 hover:bg-red-500/10 rounded-full text-red-400 transition">
                            <i className="ri-logout-box-r-line"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>

                {/* Top Header (Search & Content Nav) */}
                <div className="h-16 bg-[#15151A]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-30 sticky top-0">
                    {/* Sidebar Toggle Button */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white mr-4"
                        title={isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
                    >
                        <i className={`text-xl ${isSidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'}`}></i>
                    </button>
                    {/* Common Search Bar - Hide on News and Videos tabs as they have their own specific search */}
                    <div className={`flex-1 max-w-xl transition-opacity duration-300 ${(activeTab === 'news' || activeTab === 'videos') ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <SearchSuggestions query={searchQuery} setQuery={setSearchQuery} type="web" onSelect={handleSearch} onClose={() => { }} />
                    </div>

                    {/* Right Navigation */}
                    <div className="flex items-center gap-3 ml-4">
                        <NavItem id="news" label={t('news')} icon="ri-newspaper-line" />
                        <NavItem id="videos" label={t('videos')} icon="ri-video-line" />

                        <div className="h-6 w-px bg-white/10 mx-2"></div>
                        <NavItem id="admin" label={t('admin')} icon="ri-shield-user-line" />
                        <NavItem id="superadmin" label={t('super')} icon="ri-shield-keyhole-line" />
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative p-8">
                    {loading && (
                        <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center backdrop-blur-sm">
                            <div className="animate-spin text-4xl text-purple-500"><i className="ri-loader-4-line"></i></div>
                        </div>
                    )}

                    {/* Dashboard View */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-12 animate-fade-in max-w-7xl mx-auto">
                            <div className="text-center py-6">
                                <h1 className="text-3xl font-bold mb-2">
                                    {searchQuery ? `${t('search_results')} "${searchQuery}"` : t('dashboard')}
                                </h1>
                                <p className="text-gray-400">
                                    {searchQuery ? t('unified_results') : t('personalized_feed')}
                                </p>
                            </div>

                            {/* VIDEOS SECTION */}
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

                            {/* WEB RESULTS SECTION */}
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

                            {/* NEWS SECTION */}
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
                                <div className="w-96">
                                    <SearchSuggestions
                                        query={newsSearchQuery}
                                        setQuery={setNewsSearchQuery}
                                        type="news"
                                        onSelect={handleNewsSearch}
                                        onClose={() => { }}
                                    />
                                    {newsSearchQuery && (
                                        <button onClick={() => { setNewsSearchQuery(''); fetchNews(); }} className="absolute -right-12 top-2 text-gray-400 hover:text-white">
                                            <i className="ri-close-circle-line text-xl"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                            {filterContent(news).length === 0 ? (
                                <p className="text-gray-500 text-center py-12">{t('no_news')}</p>
                            ) : (
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
                                <div className="w-96">
                                    <SearchSuggestions
                                        query={videosSearchQuery}
                                        setQuery={setVideosSearchQuery}
                                        type="videos"
                                        onSelect={handleVideosSearch}
                                        onClose={() => { }}
                                    />
                                    {videosSearchQuery && (
                                        <button onClick={() => { setVideosSearchQuery(''); fetchVideos(); }} className="absolute -right-12 top-2 text-gray-400 hover:text-white">
                                            <i className="ri-close-circle-line text-xl"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                            {filterContent(videos).length === 0 ? (
                                <p className="text-gray-500 text-center py-12">{t('no_videos')}</p>
                            ) : (
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
                    {activeTab === 'admin' && <div className="max-w-7xl mx-auto"><AdminDashboard /></div>}
                    {activeTab === 'superadmin' && <div className="max-w-7xl mx-auto"><SuperAdminDashboard /></div>}

                    {activeTab === 'wishlist' && (
                        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
                            <h1 className="text-3xl font-bold">Wishlist (<span className="text-purple-500">{savedItems.length}</span>)</h1>
                            {savedItems.length === 0 ? <p className="text-gray-500">No items saved yet.</p> : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {savedItems.map((item, i) => item.duration ?
                                        <VideoCard key={i} video={item} isSaved={true} onToggleSave={toggleSave} onWatch={setActiveVideo} /> :
                                        <NewsCard key={i} article={item} isSaved={true} onToggleSave={toggleSave} onRead={setActiveArticle} />
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
