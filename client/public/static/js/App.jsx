
import NewsCard from './components/NewsCard.jsx';
import VideoCard from './components/VideoCard.jsx';
import LegalAssistantModal from './components/LegalAssistantModal.jsx';
import SearchSuggestions from './components/SearchSuggestions.jsx';
import { useTranslation } from './hooks/useTranslation.js';
import { getYoutubeId } from './utils.js';
import { TRANSLATIONS } from './constants.js';

const { useState, useEffect, useRef, useCallback } = React;

// --- Helper: Dynamic Image Selection ---
const getTopicImage = (title) => {
    const t = title.toLowerCase();
    let img = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80";
    if (t.includes('india') || t.includes('delhi')) img = "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&q=80";
    else if (t.includes('church') || t.includes('priest')) img = "https://images.unsplash.com/photo-1548625361-bd8bdccc5d30?w=800&q=80";
    else if (t.includes('jesus') || t.includes('christ')) img = "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&q=80";
    return img;
};

// --- Component: Login Entry ---
const LoginEntry = ({ onLogin }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim().length > 0 && password.trim().length > 0) {
            onLogin(username);
        } else {
            setError("Please enter valid credentials.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a12] relative overflow-hidden">
            <div className="absolute inset-0 circuit-grid"></div>
            <div className="relative z-10 w-full max-w-md p-8 bg-[#1A1A1A]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl teleport-entry">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src="/static/logo.png" alt="GyanBridge Logo" className="w-16 h-16 rounded-full" />
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">GyanBridge</h1>
                    </div>
                    <p className="text-gray-400 text-sm">Secure Access Portal</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs text-purple-400 uppercase tracking-wider mb-2">Identify</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded px-4 py-3 text-white focus:border-cyan-400 outline-none" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-purple-400 uppercase tracking-wider mb-2">Passcode</label>
                        <input type="password" className="w-full bg-black/40 border border-white/10 rounded px-4 py-3 text-white focus:border-cyan-400 outline-none" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                    <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded font-bold text-white hover:opacity-90 shadow-lg shadow-purple-900/50">Initialize Session</button>
                </form>
            </div>
        </div>
    );
};

// --- Component: Sidebar ---
const Sidebar = ({ activeTab, onNavigate, onLogout, collapsed, setCollapsed, lang, setLang }) => {
    const menuItems = [
        { id: 'dashboard', icon: 'ri-dashboard-line', label: TRANSLATIONS[lang].dashboard },
        { id: 'saved', icon: 'ri-heart-3-line', label: TRANSLATIONS[lang].wishlist },
        { id: 'analytics', icon: 'ri-bar-chart-grouped-line', label: TRANSLATIONS[lang].analytics },
        { id: 'legal', icon: 'ri-scales-3-line', label: TRANSLATIONS[lang].legal },
    ];

    return (
        <aside className={`${collapsed ? 'w-16' : 'w-64'} h-screen bg-[#0a0a0c]/90 backdrop-blur border-r border-white/5 flex flex-col transition-all duration-300 fixed md:relative z-50`}>
            {/* Logo Section */}
            <div className={`p-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {!collapsed && (
                    <div className="flex items-center gap-2 animate-fade-in">
                        <img src="/static/logo.png" alt="Logo" className="w-8 h-8" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">GyanBridge</span>
                    </div>
                )}
                <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white transition-colors">
                    <i className={`ri-${collapsed ? 'menu-unfold' : 'menu-fold'}-line text-xl`}></i>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 space-y-2 px-3">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${activeTab === item.id
                            ? 'bg-gradient-to-r from-purple-600/20 to-cyan-600/20 text-white border border-white/5'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            } ${collapsed ? 'justify-center' : ''}`}
                        title={collapsed ? item.label : ''}
                    >
                        <i className={`${item.icon} text-xl ${activeTab === item.id ? 'text-purple-400' : 'group-hover:text-purple-400'} transition-colors`}></i>
                        {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                        {activeTab === item.id && !collapsed && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>}
                    </button>
                ))}
            </nav>

            {/* Language Selector */}
            {!collapsed && (
                <div className="px-6 pb-4">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-bold">Language</p>
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                        {Object.keys(TRANSLATIONS).map((l) => (
                            <button
                                key={l}
                                onClick={() => setLang(l)}
                                className={`flex-1 text-xs py-1.5 rounded transition-all ${lang === l ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {l.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Logout */}
            <div className="p-4 border-t border-white/5">
                <button onClick={onLogout} className={`w-full flex items-center gap-3 px-3 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all ${collapsed ? 'justify-center' : ''}`}>
                    <i className="ri-logout-box-r-line text-xl"></i>
                    {!collapsed && <span className="font-medium text-sm">{TRANSLATIONS[lang].logout}</span>}
                </button>
            </div>
        </aside>
    );
};

// --- Component: Reader Modal ---
const ReaderModal = ({ url, topic, onClose }) => {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                // Determine if it's a mock item
                const isMock = url && url.startsWith('#');
                if (isMock) {
                    // Simulate fetch for mock
                    setTimeout(() => {
                        setContent({
                            title: topic,
                            text: "<p>This is a simulated article view for demonstration purposes. In a live environment, this would content extracted from the source URL.</p><p><strong>Mock Content:</strong>Details would appear here, formatted for easy reading.</p>",
                            image: getTopicImage(topic)
                        });
                        setLoading(false);
                    }, 800);
                } else {
                    const res = await fetch('/api/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, topic })
                    });
                    const data = await res.json();
                    setContent(data);
                    setLoading(false);
                }
            } catch (e) {
                setContent({ error: "Failed to load content." });
                setLoading(false);
            }
        };
        if (url) fetchContent();
    }, [url, topic]);

    if (!url) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1A1A1A] w-full max-w-4xl h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col relative animate-fade-in">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">Reader Mode</div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                        <i className="ri-close-line text-xl text-gray-400"></i>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <i className="ri-loader-4-line text-4xl animate-spin mb-4"></i>
                            <p>Extracting optimized content...</p>
                        </div>
                    ) : (content?.error ? (
                        <div className="text-red-400 text-center mt-20">
                            <p>{content.error}</p>
                            <a href={url} target="_blank" className="mt-4 inline-block text-blue-400 hover:underline">Open original</a>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-lg max-w-none">
                            {content.image && <img src={content.image} className="w-full h-64 object-cover rounded-lg mb-8 shadow-lg" />}
                            <h1 className="text-3xl font-bold text-white mb-6">{content.title}</h1>
                            <div className="text-gray-300 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(content.text) : content.text }}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Component: Video Modal ---
const VideoModal = ({ video, onClose }) => {
    const isYouTube = video.source_type === 'youtube' || (video.url && video.url.includes('youtu'));
    const videoId = video.id; 

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-6xl flex justify-end mb-4">
                <button onClick={onClose} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                    <i className="ri-logout-box-r-line"></i> EXIT PLAYER
                </button>
            </div>

            <div className="w-full max-w-6xl bg-[#121212] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col h-[80vh]">
                <div className="flex items-center justify-between p-4 bg-black/40 border-b border-white/5 shrink-0">
                    <h3 className="text-white font-bold truncate">{video.title}</h3>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="aspect-video w-full bg-black relative flex items-center justify-center shrink-0">
                        {isYouTube ? (
                            <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                                title={video.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="text-center p-10">
                                <i className="ri-error-warning-line text-4xl text-gray-500 mb-2"></i>
                                <p className="text-gray-400">External playback not supported for this source.</p>
                                <a href={video.url} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline mt-2 inline-block">Watch on {video.source}</a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Component: Admin Dashboard ---
const AdminDashboard = () => {
    const [token, setToken] = useState(localStorage.getItem('admin_token'));
    const [adminUsername, setAdminUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [content, setContent] = useState({ videos: [], news: [] });
    const [activeView, setActiveView] = useState('videos'); // 'videos' or 'news'
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token) fetchContent();
    }, [token]);

    const handleLogin = (e) => {
        e.preventDefault();
        fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                localStorage.setItem('admin_token', data.token);
                setToken(data.token);
                setError('');
            } else {
                setError(data.error || 'Invalid credentials');
            }
        });
    };

    const fetchContent = () => {
        setLoading(true);
        fetch('/api/admin/content')
            .then(res => res.json())
            .then(data => {
                setContent({ videos: data.videos || [], news: data.news || [] });
                setLoading(false);
            })
            .catch(err => {
                console.error("Admin fetch error", err);
                setLoading(false);
            });
    };

    const handleToggle = (id, type, currentStatus) => {
        // Optimistic update
        const key = type === 'video' ? 'videos' : 'news';
        setContent(prev => ({
            ...prev,
            [key]: prev[key].map(i => i.id === id ? { ...i, is_approved: !currentStatus ? 1 : 0 } : i)
        }));

        fetch('/api/admin/content/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, type, status: !currentStatus })
        }).catch(() => fetchContent()); // Revert
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center h-full animate-fade-in p-6">
                <form onSubmit={handleLogin} className="bg-[#15151A] p-8 rounded-2xl border border-white/10 w-full max-w-md space-y-6 shadow-2xl relative overflow-hidden">
                     <h2 className="text-2xl font-bold text-white text-center mb-6">Admin Access</h2>
                     {error && <div className="text-red-400 text-xs text-center mb-4">{error}</div>}
                    <div className="space-y-4">
                        <input type="text" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} placeholder="Username" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white" />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white" />
                        <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg">Unlock Dashboard</button>
                    </div>
                </form>
            </div>
        );
    }

    const items = activeView === 'videos' ? content.videos : content.news;

    return (
        <div className="space-y-6 animate-fade-in p-6">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-bold text-white">Content Moderation</h1>
                 <button onClick={() => { localStorage.removeItem('admin_token'); setToken(null); }} className="text-red-400 text-sm">Logout</button>
            </div>
            
            <div className="flex gap-4">
                <button onClick={() => setActiveView('videos')} className={`px-4 py-2 rounded ${activeView === 'videos' ? 'bg-purple-600' : 'bg-gray-800'}`}>Videos</button>
                <button onClick={() => setActiveView('news')} className={`px-4 py-2 rounded ${activeView === 'news' ? 'bg-purple-600' : 'bg-gray-800'}`}>News</button>
            </div>

            <div className="bg-[#15151A] rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Title</th>
                            <th className="px-6 py-3">Source</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? <tr><td colSpan="4" className="text-center py-4">Loading...</td></tr> : 
                        items.map((item) => (
                            <tr key={item.id} className="hover:bg-white/5">
                                <td className="px-6 py-4 truncate max-w-xs">{item.title}</td>
                                <td className="px-6 py-4">{item.source}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs ${item.is_approved ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {item.is_approved ? 'Approved' : 'Hidden'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleToggle(item.id, activeView === 'videos' ? 'video' : 'news', item.is_approved)}
                                        className={`text-xs font-bold px-3 py-1 rounded ${item.is_approved ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
                                    >
                                        {item.is_approved ? 'Reject' : 'Approve'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Component: Super Admin Dashboard ---
const SuperAdminDashboard = () => {
    const [token, setToken] = useState(localStorage.getItem('super_token'));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [topics, setTopics] = useState({});

    useEffect(() => {
        if (token) fetchTopics();
    }, [token]);

    const handleLogin = (e) => {
        e.preventDefault();
        fetch('/api/super-admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                localStorage.setItem('super_token', data.token);
                setToken(data.token);
                setError('');
            } else {
                setError(data.error);
            }
        });
    };

    const fetchTopics = () => {
         fetch('/api/topics').then(r => r.json()).then(setTopics);
    };

    const toggleTopic = (topic, currentStatus) => {
        setTopics(prev => ({ ...prev, [topic]: !currentStatus }));
        fetch('/api/topics/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, status: !currentStatus })
        });
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center h-full animate-fade-in p-6">
                <form onSubmit={handleLogin} className="bg-[#15151A] p-8 rounded-2xl border border-white/10 w-full max-w-md space-y-6">
                    <h2 className="text-2xl font-bold text-white text-center">Super Admin</h2>
                    {error && <div className="text-red-400 text-sm text-center">{error}</div>}
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full bg-black/40 border-white/10 px-4 py-2 rounded text-white" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-black/40 border-white/10 px-4 py-2 rounded text-white" />
                    <button type="submit" className="w-full bg-orange-600 text-white font-bold py-2 rounded">Access Control</button>
                </form>
            </div>
        );
    }

    return (
        <div className="p-8 h-full overflow-y-auto animate-fade-in">
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Topic Control</h1>
                <button onClick={() => { setToken(null); localStorage.removeItem('super_token'); }} className="text-gray-400">Logout</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(topics).map(([topic, active]) => (
                    <div key={topic} className={`p-6 rounded-xl border ${active ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">{topic}</h3>
                            <button onClick={() => toggleTopic(topic, active)} className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? 'bg-green-500' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <p className={`text-sm ${active ? 'text-green-400' : 'text-red-400'}`}>{active ? 'Active' : 'Disabled'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Component: Dashboard Layout ---
const DashboardLayout = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [lang, setLang] = useState(() => localStorage.getItem('gyanbridge_lang') || 'en');
    const [activeTopics, setActiveTopics] = useState([]);
    
    useEffect(() => { localStorage.setItem('gyanbridge_lang', lang); }, [lang]);
    useEffect(() => { fetch('/api/topics/active').then(r => r.json()).then(d => setActiveTopics(d.topics || [])); }, []);

    const t = (key) => TRANSLATIONS[lang][key] || key;

    const getDynamicTitle = (baseTitle, type) => {
        if (!activeTopics || activeTopics.length === 0 || activeTopics.includes("Christianity") || activeTopics.includes("Christian")) return baseTitle;
        const rawTopic = activeTopics[0];
        const topic = t(rawTopic) || rawTopic;
        if (type === 'news') {
            if (lang === 'hi') return `${topic} समाचार फ़ीड`;
            if (lang === 'ta') return `${topic} செய்திகள்`;
            return `${topic} News Feed`;
        }
        if (type === 'video') {
             if (lang === 'hi') return `ट्रेंडिंग ${topic} वीडियो`;
             if (lang === 'ta') return `பிரபலமான ${topic} வீடியோக்கள்`;
             return `Trending ${topic} Videos`;
        }
        return baseTitle;
    };

    const [query, setQuery] = useState("");
    const [savedItems, setSavedItems] = useState([]);
    const [liveNews, setLiveNews] = useState(null);
    const [liveVideos, setLiveVideos] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    // Separate search states
    const [newsQuery, setNewsQuery] = useState("");
    const [videoQuery, setVideoQuery] = useState("");
    const [newsSearchResults, setNewsSearchResults] = useState(null);
    const [videoSearchResults, setVideoSearchResults] = useState(null);
    const [newsSearching, setNewsSearching] = useState(false);
    const [videoSearching, setVideoSearching] = useState(false);
    
    const [readerUrl, setReaderUrl] = useState(null);
    const [activeVideo, setActiveVideo] = useState(null);
    const [legalOpen, setLegalOpen] = useState(false);

    const [showMainSuggestions, setShowMainSuggestions] = useState(false);
    const [showNewsSuggestions, setShowNewsSuggestions] = useState(false);
    const [showVideoSuggestions, setShowVideoSuggestions] = useState(false);

    const fetchNews = useCallback(() => {
        fetch(`/api/news?lang=${lang}`).then(res => res.json()).then(data => {
            if (Array.isArray(data)) {
                 const cleanData = data.map((item, idx) => ({ ...item, id: item.id || `news_${idx}` }));
                 setLiveNews(cleanData);
            } else setLiveNews([]);
        }).catch(() => setLiveNews([]));
    }, [lang]);

    const fetchVideos = useCallback(() => {
        fetch(`/api/videos?lang=${lang}`).then(res => res.json()).then(data => {
             if (Array.isArray(data)) {
                  const cleanVideos = data.map((item, idx) => ({ ...item, id: item.id || `vid_${idx}` }));
                  setLiveVideos(cleanVideos);
             } else setLiveVideos([]);
        }).catch(() => setLiveVideos([]));
    }, [lang]);

    useEffect(() => {
        const saved = localStorage.getItem('gb_wishlist');
        if (saved) setSavedItems(JSON.parse(saved));
        fetchNews();
        fetchVideos();
        const newsInterval = setInterval(fetchNews, 60000);
        const videosInterval = setInterval(fetchVideos, 60000);
        return () => { clearInterval(newsInterval); clearInterval(videosInterval); };
    }, [fetchNews, fetchVideos]);

    const toggleSave = (item) => {
        let newItems;
        const itemUrl = item.url || item.link;
        const existingIndex = savedItems.findIndex(i => (item.id && i.id === item.id) || ((i.url || i.link) === itemUrl));
        if (existingIndex !== -1) {
            newItems = [...savedItems];
            newItems.splice(existingIndex, 1);
        } else {
            newItems = [...savedItems, item];
        }
        setSavedItems(newItems);
        localStorage.setItem('gb_wishlist', JSON.stringify(newItems));
    };

    const handleVoiceSearch = () => {
         if (!('webkitSpeechRecognition' in window)) { alert("Voice search is not supported in this browser."); return; }
         const recognition = new window.webkitSpeechRecognition();
         recognition.continuous = false;
         recognition.interimResults = false;
         recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-US'; 
         recognition.onstart = () => console.log("Voice Listening...");
         recognition.onresult = (event) => {
             const transcript = event.results[0][0].transcript;
             setQuery(transcript);
             handleSearch(null, transcript);
         };
         recognition.start();
    };

    const handleSearch = async (e, manualQuery = null) => {
        if (e) e.preventDefault();
        const q = manualQuery || query;
        if (!q.trim()) return;
        setLoading(true);
        setActiveTab('dashboard');
        setSearchResults(null);
        try {
            const [newsRes, videoRes] = await Promise.all([
                fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: q, limit: 20, type: 'news', lang })
                }),
                fetch('/api/search', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ topic: q, limit: 20, type: 'video', lang })
                })
            ]);
            const newsData = await newsRes.json();
            const videoData = await videoRes.json();
            
            const newsResults = (newsData.results || []).map((item, idx) => ({ ...item, id: item.id || `news_${Date.now()}_${idx}`, result_type: 'news' }));
            const videoResults = (videoData.results || []).map((item, idx) => ({ ...item, id: item.id || `video_${Date.now()}_${idx}`, result_type: 'video', source_type: 'youtube' }));
            
            const combined = [];
            const maxLen = Math.max(newsResults.length, videoResults.length);
            for (let i = 0; i < maxLen; i++) {
                if (videoResults[i]) combined.push(videoResults[i]);
                if (newsResults[i]) combined.push(newsResults[i]);
            }
            setSearchResults(combined);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleNewsSearch = async (e, manualQuery = null) => {
         if (e) e.preventDefault();
         const q = manualQuery || newsQuery;
         if (!q.trim()) { setNewsSearchResults(null); return; }
         setNewsSearching(true);
         try {
             const res = await fetch('/api/search', { method: 'POST', body: JSON.stringify({ topic: q, limit: 30, type: 'news', lang }), headers: { 'Content-Type': 'application/json'} });
             const data = await res.json();
             setNewsSearchResults((data.results || []).map((item, idx) => ({ ...item, id: item.id || `ns_${idx}` })));
         } catch(e) { console.error(e); setNewsSearchResults([]); } finally { setNewsSearching(false); }
    };

    const handleVideoSearch = async (e, manualQuery = null) => {
         if (e) e.preventDefault();
         const q = manualQuery || videoQuery;
         if (!q.trim()) { setVideoSearchResults(null); return; }
         setVideoSearching(true);
         try {
             const res = await fetch('/api/search', { method: 'POST', body: JSON.stringify({ topic: q, limit: 30, type: 'video', lang }), headers: { 'Content-Type': 'application/json'} });
             const data = await res.json();
             setVideoSearchResults((data.results || []).map((item, idx) => ({ ...item, id: item.id || `vs_${idx}`, source_type: 'youtube' })));
         } catch(e) { console.error(e); setVideoSearchResults([]); } finally { setVideoSearching(false); }
    };

    return (
        <div className="bg-[#0a0a12] text-white font-['Rajdhani'] h-screen flex flex-col md:flex-row overflow-hidden">
            <Sidebar activeTab={activeTab} onNavigate={(tab) => tab === 'legal' ? setLegalOpen(true) : setActiveTab(tab)} onLogout={onLogout} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} lang={lang} setLang={setLang} />
            <div className={`flex-1 flex flex-col h-full relative transition-all duration-300`}>
                <header className="shrink-0 bg-[#0a0a12]/95 backdrop-blur border-b border-white/5 h-[70px] flex items-center justify-between px-6 z-40">
                     <div className="flex items-center gap-4 w-full max-w-xl">
                          <button className="text-gray-400 mr-2 md:hidden"><i className="ri-menu-line text-2xl"></i></button>
                          <div className="flex items-center gap-2 md:hidden">
                               <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">GyanBridge</span>
                          </div>
                          {activeTab !== 'news' && activeTab !== 'videos' && (
                              <form onSubmit={handleSearch} className="flex-1 relative">
                                  <i className="ri-search-line absolute left-3 top-2.5 text-gray-500"></i>
                                  <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setShowMainSuggestions(true); }} placeholder={t('search_placeholder')} className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-12 text-sm text-white focus:border-purple-500 outline-none" />
                                  <button type="button" onClick={handleVoiceSearch} className="absolute right-2 top-1.5 p-1 text-gray-400 hover:text-white"><i className="ri-mic-fill"></i></button>
                                  {showMainSuggestions && <SearchSuggestions query={query} type="web" onSelect={(s) => { setQuery(s); handleSearch(null, s); setShowMainSuggestions(false); }} onClose={() => setShowMainSuggestions(false)} />}
                              </form>
                          )}
                     </div>
                     <div className="flex items-center gap-6">
                        <button onClick={() => setActiveTab('news')} className={`flex flex-col items-center group ${activeTab === 'news' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}><i className="ri-newspaper-fill text-xl"></i><span className="text-[10px] mt-0.5">{t('news_btn')}</span></button>
                        <button onClick={() => setActiveTab('videos')} className={`flex flex-col items-center group ${activeTab === 'videos' ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}><i className="ri-youtube-fill text-xl"></i><span className="text-[10px] mt-0.5">{t('videos_btn')}</span></button>
                        <button onClick={() => setActiveTab('admin')} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold shadow-lg border border-white/20">{user.charAt(0).toUpperCase()}</button>
                        <button onClick={() => setActiveTab('superadmin')} className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-xs font-bold shadow-lg border border-white/20"><i className="ri-shield-star-fill"></i></button>
                     </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar relative">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in pb-12">
                             {searchResults ? (
                                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                     {searchResults.length > 0 ? searchResults.map((item, idx) => (
                                         item.result_type === 'video' || item.source_type === 'youtube' ? 
                                         <VideoCard key={item.id || idx} video={item} onWatch={setActiveVideo} isSaved={!!savedItems.find(i => (item.id && i.id === item.id) || i.url === item.url)} onToggleSave={toggleSave} /> : 
                                         <NewsCard key={item.id || idx} article={item} onRead={setReaderUrl} isSaved={!!savedItems.find(i => i.url === item.url)} onToggleSave={toggleSave} t={t} />
                                     )) : <div className="col-span-full text-center py-10 text-gray-500">{t('no_results')}</div>}
                                 </div>
                             ) : (
                                 <div className="space-y-12">
                                     <div>
                                          <h2 className="text-2xl font-bold flex items-center gap-2 mb-6"><i className="ri-fire-fill text-orange-500"></i> {getDynamicTitle(t('trending_title'), 'video')}</h2>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                              {liveVideos ? (liveVideos.length > 0 ? liveVideos.slice(0, 4).map(v => <VideoCard key={v.id} video={v} onWatch={setActiveVideo} isSaved={!!savedItems.find(i => (v.id && i.id === v.id) || i.url === v.url)} onToggleSave={toggleSave} />) : <div className="col-span-4 text-center py-10 text-gray-500">{t('no_results')}</div>) : <div className="col-span-4 animate-pulse h-64 bg-[#1E1E1E] rounded-xl"></div>}
                                          </div>
                                     </div>
                                     <div>
                                          <h2 className="text-2xl font-bold flex items-center gap-2 mb-6"><i className="ri-global-line text-blue-500"></i> {getDynamicTitle(t('news_title'), 'news')}</h2>
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                              {liveNews ? (liveNews.length > 0 ? liveNews.slice(0, 4).map(a => <NewsCard key={a.id} article={a} onRead={setReaderUrl} isSaved={!!savedItems.find(i => (a.id && i.id === a.id) || i.url === a.url)} onToggleSave={toggleSave} t={t} />) : <div className="col-span-full text-center py-10 text-gray-500">{t('no_results')}</div>) : <div className="col-span-full animate-pulse h-48 bg-[#1E1E1E] rounded-xl"></div>}
                                          </div>
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                    {activeTab === 'news' && (
                        <div className="space-y-6 animate-fade-in pb-12">
                            <h1 className="text-3xl font-bold text-white mb-2">{getDynamicTitle(t('news_title'), "news")}</h1>
                            <form onSubmit={handleNewsSearch} className="relative max-w-xl">
                                <i className="ri-search-line absolute left-3 top-3 text-gray-500"></i>
                                <input type="text" value={newsQuery} onChange={(e) => { setNewsQuery(e.target.value); setShowNewsSuggestions(true); }} placeholder={t('search_news_placeholder')} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-20 text-sm text-white focus:border-purple-500 outline-none" />
                                <button type="submit" disabled={newsSearching} className="absolute right-2 top-1.5 px-3 py-1 bg-purple-600 rounded text-sm font-medium">{newsSearching ? '...' : t('search')}</button>
                                {showNewsSuggestions && <SearchSuggestions query={newsQuery} type="news" onSelect={(s) => { setNewsQuery(s); handleNewsSearch(null, s); setShowNewsSuggestions(false); }} onClose={() => setShowNewsSuggestions(false)} />}
                            </form>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {newsSearchResults ? (newsSearchResults.length > 0 ? newsSearchResults.map((item, idx) => <NewsCard key={item.id} article={item} onRead={setReaderUrl} isSaved={!!savedItems.find(i => i.url === item.url)} onToggleSave={toggleSave} t={t} />) : <div className="col-span-full text-center py-10">{t('no_news')}</div>) : (liveNews || []).map((item, idx) => <NewsCard key={item.id} article={item} onRead={setReaderUrl} isSaved={!!savedItems.find(i => i.url === item.url)} onToggleSave={toggleSave} t={t} />)}
                            </div>
                        </div>
                    )}
                    {activeTab === 'videos' && (
                        <div className="space-y-6 animate-fade-in pb-12">
                             <h1 className="text-3xl font-bold text-white mb-2">{getDynamicTitle(t('trending_title'), "video")}</h1>
                             <form onSubmit={handleVideoSearch} className="relative max-w-xl">
                                <i className="ri-search-line absolute left-3 top-3 text-gray-500"></i>
                                <input type="text" value={videoQuery} onChange={(e) => { setVideoQuery(e.target.value); setShowVideoSuggestions(true); }} placeholder={t('search_videos_placeholder')} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-20 text-sm text-white focus:border-red-500 outline-none" />
                                <button type="submit" disabled={videoSearching} className="absolute right-2 top-1.5 px-3 py-1 bg-red-600 rounded text-sm font-medium">{videoSearching ? '...' : t('search')}</button>
                                {showVideoSuggestions && <SearchSuggestions query={videoQuery} type="video" onSelect={(s) => { setVideoQuery(s); handleVideoSearch(null, s); setShowVideoSuggestions(false); }} onClose={() => setShowVideoSuggestions(false)} />}
                            </form>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {videoSearchResults ? (videoSearchResults.length > 0 ? videoSearchResults.map((v, idx) => <VideoCard key={v.id} video={v} onWatch={setActiveVideo} isSaved={!!savedItems.find(i => (v.id && i.id === v.id) || i.url === v.url)} onToggleSave={toggleSave} />) : <div className="col-span-full text-center py-10">{t('no_videos')}</div>) : (liveVideos || []).map((v, idx) => <VideoCard key={v.id} video={v} onWatch={setActiveVideo} isSaved={!!savedItems.find(i => (v.id && i.id === v.id) || i.url === v.url)} onToggleSave={toggleSave} />)}
                             </div>
                        </div>
                    )}
                    {activeTab === 'saved' && (
                         <div className="space-y-8 animate-fade-in pb-12">
                              {savedItems.length === 0 ? <p className="text-center text-gray-500 py-10">Wishlist empty.</p> : (
                                   <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                       {savedItems.map((item) => (item.source_type ? <VideoCard key={item.id} video={item} onWatch={setActiveVideo} isSaved={true} onToggleSave={toggleSave} /> : <NewsCard key={item.id} article={item} onRead={setReaderUrl} isSaved={true} onToggleSave={toggleSave} t={t} />))}
                                   </div>
                              )}
                         </div>
                    )}
                    {activeTab === 'admin' && <AdminDashboard />}
                    {activeTab === 'superadmin' && <SuperAdminDashboard />}
                </main>
            </div>
            {readerUrl && <ReaderModal url={readerUrl.url} topic={readerUrl.title} onClose={() => setReaderUrl(null)} />}
            {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
            {legalOpen && <LegalAssistantModal onClose={() => setLegalOpen(false)} lang={lang} />}
        </div>
    );
};

// --- Root Application ---
const GyanBridgeApp = () => {
    const [user, setUser] = useState(() => localStorage.getItem('gb_user') || null);
    const handleLogin = (username) => { localStorage.setItem('gb_user', username); setUser(username); };
    const handleLogout = () => { localStorage.removeItem('gb_user'); setUser(null); };

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 20px; }
            .circuit-grid { background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 30px 30px; }
        `;
        document.head.appendChild(style);
    }, []);

    return (
        <React.StrictMode>
             {!user ? <LoginEntry onLogin={handleLogin} /> : <DashboardLayout user={user} onLogout={handleLogout} />}
        </React.StrictMode>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<GyanBridgeApp />);
