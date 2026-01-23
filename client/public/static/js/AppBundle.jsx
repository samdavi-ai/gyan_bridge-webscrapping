
const { useState, useEffect, useRef, useCallback } = React;

// --- CONSTANTS ---
const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800";
const TRANSLATIONS = {
    en: {
        dashboard: "Dashboard",
        wishlist: "Wishlist / Saved",
        analytics: "Analytics",
        legal: "Legal Assistant",
        logout: "Logout",
        search_placeholder: "Search sermons, news...",
        trending_title: "Trending Gospel Videos",
        trending_desc: "Curated trending video content from YouTube.",
        news_title: "Christian News Feed",
        news_desc: "Updates from the Global Church.",
        videos_title: "Gospel Videos",
        videos_desc: "Watch the latest sermons and worship sessions.",
        admin_panel: "Admin Panel",
        super_admin: "Super Admin",
        live_updates: "Live Updates",
        no_results: "No results found",
        loading: "Loading...",
        search: "Search",
        clear: "Clear",
        read_more: "Read More",
        watch_now: "Watch Now",
        saved: "Saved",
        save: "Save",
        legal_intro: "Hello! I am your Legal Assistant. I can help you find Acts, Procedures, and relevant Case Laws. Ask me anything!",
        legal_placeholder: "Ask about church bylaws, property disputes, or FCRA regulations...",
        constitutional_guide: "Constitutional & Minority Rights Guide",
        verified_ai_response: "Verified AI Response",
        read_aloud: "READ ALOUD",
        news_btn: "News",
        videos_btn: "Videos",
        min_read: "min read",
        recently: "Recently",
        legal_disclaimer: "AI can make mistakes. Please consult with a qualified legal professional for official advice.",
        search_news_placeholder: "Search news articles...",
        search_videos_placeholder: "Search videos...",
        found_results: "Found results for",
        no_news: "No news found for",
        no_videos: "No videos found for",
        Sports: "Sports",
        Technology: "Technology",
        Science: "Science",
        Business: "Business",
        Entertainment: "Entertainment",
        Politics: "Politics",
        Christianity: "Christianity"
    },
    hi: {
        dashboard: "डैशबोर्ड",
        wishlist: "सहेजे गए",
        analytics: "विश्लेषण",
        legal: "कानूनी सहायक",
        logout: "लॉग आउट",
        search_placeholder: "उपदेश, समाचार खोजें...",
        trending_title: "ट्रेंडिंग गॉस्पेल वीडियो",
        trending_desc: "YouTube से क्यूरेट सामग्री।",
        news_title: "ईसाई समाचार फ़ीड",
        news_desc: "वैश्विक चर्च से अपडेट।",
        videos_title: "गॉस्पेल वीडियो",
        videos_desc: "नवीनतम उपदेश और आराधना सत्र देखें।",
        admin_panel: "व्यवस्थापक पैनल",
        super_admin: "सुपर एडमिन",
        live_updates: "लाइव अपडेट",
        no_results: "कोई परिणाम नहीं मिला",
        loading: "लोड हो रहा है...",
        search: "खोजें",
        clear: "साफ़ करें",
        read_more: "और पढ़ें",
        watch_now: "अभी देखें",
        saved: "सहेजा गया",
        save: "सहेजें",
        legal_intro: "नमस्ते! मैं आपका कानूनी सहायक हूँ। मैं अधिनियम, प्रक्रियाएं और केस कानून खोजने में आपकी सहायता कर सकता हूँ।",
        legal_placeholder: "चर्च उपनियम, संपत्ति विवाद, या FCRA नियमों के बारे में पूछें...",
        constitutional_guide: "संवैधानिक और अल्पसंख्यक अधिकार गाइड",
        verified_ai_response: "सत्यापित एआई प्रतिक्रिया",
        read_aloud: "जोर से पढ़ें",
        news_btn: "समाचार",
        videos_btn: "वीडियो",
        min_read: "मिनट पढ़ें",
        recently: "हाल ही में",
        legal_disclaimer: "AI गलतियाँ कर सकता है। कृपया आधिकारिक सलाह के लिए किसी योग्य कानूनी पेशेवर से परामर्श लें।",
        search_news_placeholder: "समाचार लेख खोजें...",
        search_videos_placeholder: "वीडियो खोजें...",
        found_results: "परिणाम मिले",
        no_news: "कोई समाचार नहीं मिला",
        no_videos: "कोई वीडियो नहीं मिला",
        Sports: "खेल",
        Technology: "प्रौद्योगिकी",
        Science: "विज्ञान",
        Business: "व्यापार",
        Entertainment: "मनोरंजन",
        Politics: "राजनीति",
        Christianity: "ईसाई धर्म"
    },
    ta: {
        dashboard: "டாஷ்போர்டு",
        wishlist: "விருப்பப்பட்டியல்",
        analytics: "பகுப்பாய்வு",
        legal: "சட்ட உதவியாளர்",
        logout: "வெளியேறு",
        search_placeholder: "செய்திகளைத் தேடுங்கள்...",
        trending_title: "பிரபலமான வீடியோக்கள்",
        trending_desc: "YouTube இல் இருந்து தேர்ந்தெடுக்கப்பட்ட வீடியோக்கள்.",
        news_title: "கிறிஸ்தவ செய்திகள்",
        news_desc: "உலகளாவிய சர்ச் செய்திகள்.",
        videos_title: "நற்செய்தி வீடியோக்கள்",
        videos_desc: "சமீபத்திய பிரசங்கங்கள் மற்றும் வழிபாடுகளைப் பாருங்கள்.",
        admin_panel: "நிர்வாகக் குழு",
        super_admin: "சூப்பர் நிர்வாகி",
        live_updates: "நேரடி புதுப்பிப்புகள்",
        no_results: "முடிவுகள் எதுவும் இல்லை",
        loading: "ஏற்றுகிறது...",
        search: "தேடு",
        clear: "தெளிவாக்கு",
        read_more: "மேலும் படிக்க",
        watch_now: "இப்போது பார்க்கவும்",
        saved: "சேமிக்கப்பட்டது",
        save: "சேமி",
        legal_intro: "வணக்கம்! நான் உங்கள் சட்ட உதவியாளர். சட்டங்கள், நடைமுறைகள் மற்றும் வழக்குத் தீர்ப்புகளைக் கண்டறிய நான் உதவ முடியும்.",
        legal_placeholder: "தேவாலய விதிகள், சொத்து தகராறுகள் அல்லது FCRA விதிமுறைகள் பற்றி கேட்கவும்...",
        constitutional_guide: "அரசியலமைப்பு மற்றும் சிறுபான்மை உரிமைகள் வழிகாட்டி",
        verified_ai_response: "சரிபார்க்கப்பட்ட AI பதில்",
        read_aloud: "உரக்கப் படியுங்கள்",
        news_btn: "செய்திகள்",
        videos_btn: "வீடியோக்கள்",
        min_read: "நிமிடம் படித்தல்",
        recently: "சமீபத்தில்",
        legal_disclaimer: "AI தவறுகள் செய்யலாம். அதிகாரப்பூர்வ ஆலோசனைக்கு தகுதிவாய்ந்த சட்ட நிபுணரை அணுகவும்.",
        search_news_placeholder: "செய்தி கட்டுரைகளைத் தேடுங்கள்...",
        search_videos_placeholder: "வீடியோக்களைத் தேடுங்கள்...",
        found_results: "முடிவுகள் கிடைத்தன",
        no_news: "செய்திகள் எதுவும் இல்லை",
        no_videos: "வீடியோக்கள் எதுவும் இல்லை",
        Sports: "விளையாட்டு",
        Technology: "தொழில்நுட்பம்",
        Science: "அறிவியல்",
        Business: "வணிகம்",
        Entertainment: "பொழுதுபோக்கு",
        Politics: "அரசியல்",
        Christianity: "கிறிஸ்தவம்"
    }
};

// --- UTILS ---
const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- COMPONENTS ---

// VideoCard
const VideoCard = ({ video, isSaved, onToggleSave, onWatch }) => {
    const getBadge = (type) => {
        if (type === 'youtube') return { color: 'text-red-500', icon: 'ri-youtube-fill', name: 'YouTube' };
        if (type === 'instagram') return { color: 'text-pink-500', icon: 'ri-instagram-fill', name: 'Instagram' };
        if (type === 'facebook') return { color: 'text-blue-500', icon: 'ri-facebook-fill', name: 'Facebook' };
        if (type === 'vimeo') return { color: 'text-sky-400', icon: 'ri-vimeo-fill', name: 'Vimeo' };
        return { color: 'text-gray-400', icon: 'ri-video-fill', name: 'Video' };
    };
    const badge = getBadge(video.source_type);

    return (
        <div className="bg-[#1E1E1E] rounded-xl overflow-hidden hover:bg-[#252525] transition-all duration-300 group border border-white/5 hover:border-red-500/30 flex flex-col">
            <div className="relative aspect-video bg-black cursor-pointer overflow-hidden" onClick={() => onWatch(video)}>
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-14 h-14 bg-red-600/90 rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl shadow-red-500/30 transform scale-75 group-hover:scale-100 transition-all">
                        <i className="ri-play-fill text-2xl text-white ml-1"></i>
                    </div>
                </div>
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border border-white/10">
                    <i className={`${badge.icon} ${badge.color}`}></i> {badge.name}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onToggleSave(video); }} className="absolute top-2 right-2 p-2 hover:bg-black/50 rounded-full transition text-white">
                    <i className={`${isSaved ? 'ri-heart-fill text-red-500' : 'ri-heart-line'}`}></i>
                </button>
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur rounded px-1.5 py-0.5 text-xs font-mono text-gray-300 flex items-center gap-1">
                    <i className="ri-eye-line text-gray-400 text-[10px]"></i>
                    {video.views ? parseInt(video.views).toLocaleString() : 'N/A'}
                </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
                <h3 onClick={() => onWatch(video)} className="text-white font-bold text-sm leading-snug line-clamp-2 cursor-pointer hover:text-red-400 transition mb-2" title={video.title}>{video.title}</h3>
                <div className="mt-auto flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        {video.channel_avatar ? <img src={video.channel_avatar} className="w-5 h-5 rounded-full" alt="" /> : <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-800"></div>}
                        <span className="truncate max-w-[100px]">{video.channel}</span>
                    </div>
                    <span>{video.published_at || 'Recently'}</span>
                </div>
            </div>
        </div>
    );
};

// NewsCard
const NewsCard = ({ article, onRead, isSaved, onToggleSave, t }) => {
    const videoId = getYoutubeId(article.url);
    const textContent = (article.snippet || article.title || "");
    const readTime = Math.max(1, Math.round(textContent.length / 20));
    const _t = t || ((k) => k);

    return (
        <div className="bg-[#1E1E1E] rounded-xl overflow-hidden hover:bg-[#252525] transition-all duration-300 group relative shadow-lg border border-white/5 hover:border-purple-500/30 w-full flex flex-col sm:flex-row h-auto sm:h-[180px]">
            <button onClick={(e) => { e.stopPropagation(); onToggleSave(article); }} className="absolute top-2 right-2 z-20 p-2 bg-black/50 hover:bg-purple-600/80 rounded-full backdrop-blur transition-colors" title={isSaved ? "Remove from Wishlist" : "Save to Wishlist"}>
                <i className={`${isSaved ? 'ri-heart-fill text-red-500' : 'ri-heart-line text-white'} text-lg`}></i>
            </button>
            <div className="relative w-full h-48 sm:h-full sm:w-[200px] shrink-0 overflow-hidden cursor-pointer bg-black" onClick={() => onRead && onRead(article)}>
                <img src={article.image || PLACEHOLDER_IMG} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100" onError={(e) => { e.target.onerror = null; if (e.target.src !== PLACEHOLDER_IMG) { e.target.src = PLACEHOLDER_IMG; } }} />
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs text-white font-medium sm:hidden">{article.source}</div>
            </div>
            <div className="p-4 flex flex-col flex-1 justify-between h-full overflow-hidden min-w-0">
                <div className="flex flex-col gap-1">
                    <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-400 mb-1">
                        <span className="font-semibold text-gray-300 truncate max-w-[120px]">{article.source}</span>
                        <span>• {article.published_at || _t('recently')}</span>
                    </div>
                    <h3 onClick={() => onRead && onRead(article)} className="text-gray-100 font-bold text-base sm:text-lg leading-tight line-clamp-2 cursor-pointer hover:text-cyan-400 transition-colors" title={article.title}>{article.title}</h3>
                    {article.snippet && <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mt-1 sm:mt-2 hidden sm:block">{article.snippet}</p>}
                </div>
                <div className="flex items-center justify-between text-gray-500 text-xs mt-3 pt-3 border-t border-white/5">
                    <span className="flex items-center gap-1"><i className="ri-time-line"></i> {readTime} {_t('min_read')}</span>
                    <span className="sm:hidden">{article.published_at || _t('recently')}</span>
                </div>
            </div>
        </div>
    );
};

// SearchSuggestions
const SearchSuggestions = ({ query, type, onSelect, onClose }) => {
    const [suggestions, setSuggestions] = useState([]);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!query || query.length < 2) { setSuggestions([]); return; }
        const timer = setTimeout(() => {
            fetch(`/api/suggestions?q=${encodeURIComponent(query)}&type=${type}`)
                .then(res => res.json())
                .then(data => { if (Array.isArray(data)) setSuggestions(data); })
                .catch(err => console.error(err));
        }, 300);
        return () => clearTimeout(timer);
    }, [query, type]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) { onClose(); }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!suggestions.length) return null;

    return (
        <div ref={wrapperRef} className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
            {suggestions.map((s, i) => (
                <div key={i} onClick={() => { onSelect(s); onClose(); }} className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 text-gray-300 transition-colors border-b border-white/5 last:border-0">
                    <i className="ri-search-line text-gray-500"></i>
                    <span dangerouslySetInnerHTML={{ __html: s.replace(new RegExp(`(${query})`, 'gi'), '<span class="text-white font-bold">$1</span>') }} />
                </div>
            ))}
        </div>
    );
};

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

// --- Sidebar (Matches Screenshot) ---
const Sidebar = ({ activeTab, onNavigate, onLogout, collapsed, setCollapsed, lang, setLang }) => {
    const t = TRANSLATIONS[lang];
    const menuItems = [
        { id: 'dashboard', icon: 'ri-dashboard-line', label: t.dashboard },
        { id: 'saved', icon: 'ri-heart-3-line', label: t.wishlist },
        { id: 'analytics', icon: 'ri-bar-chart-grouped-line', label: t.analytics },
        { id: 'legal', icon: 'ri-scales-3-line', label: t.legal },
        { id: 'admin', icon: 'ri-admin-line', label: t.admin_panel },
    ];

    return (
        <aside className={`${collapsed ? 'w-20' : 'w-64'} h-screen bg-[#050505] border-r border-white/5 flex flex-col transition-all duration-300 z-50`}>
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white to-gray-200 flex items-center justify-center shadow"><i className="ri-flashlight-fill text-black"></i></div>
                {!collapsed && <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">GyanBridge</span>}
                <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-gray-500 hover:text-white"><i className="ri-menu-fold-line"></i></button>
            </div>

            <nav className="flex-1 px-4 space-y-2 py-4">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-[#1A1A1A] text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-900/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <i className={`${item.icon} text-xl`}></i>
                        {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className={`p-6 border-t border-white/5 space-y-4 ${collapsed ? 'hidden' : 'block'}`}>
                <div>
                    <p className="text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider">Language</p>
                    <div className="flex bg-[#1A1A1A] rounded-lg p-1 border border-white/5">
                        {['en', 'hi', 'ta'].map(l => (
                            <button key={l} onClick={() => setLang(l)} className={`flex-1 py-1.5 text-xs rounded-md transition-all ${lang === l ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>{l.toUpperCase()}</button>
                        ))}
                    </div>
                </div>
                <button onClick={onLogout} className="flex items-center gap-3 text-red-500 hover:text-red-400 transition-colors text-sm font-medium w-full p-2 hover:bg-red-500/10 rounded-lg">
                    <i className="ri-logout-box-line"></i> {t.logout}
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
                const isMock = url && url.startsWith('#');
                if (isMock) {
                    setTimeout(() => {
                        setContent({
                            title: topic,
                            text: "<p>This is a simulated article view for demonstration purposes.</p>",
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
    const isYouTube = video.source_type === 'youtube' || (video.id && video.id.length > 5 && !video.id.includes(' '));
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

// --- Component: Legal Assistant Modal ---
const LegalAssistantModal = ({ onClose, lang }) => {
    const t = (key) => TRANSLATIONS[lang][key] || key;
    const [messages, setMessages] = useState([{ role: 'assistant', content: t('legal_intro') }]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [voiceMode, setVoiceMode] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [agentState, setAgentState] = useState('disconnected'); // disconnected, listening, thinking, speaking
    const roomRef = useRef(null);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) };
    useEffect(scrollToBottom, [messages]);

    const toggleVoiceMode = async () => {
        if (voiceMode) { roomRef.current?.disconnect(); setVoiceMode(false); setAgentState('disconnected'); return; }
        setIsConnecting(true);
        try {
            const res = await fetch(`/api/livekit/token?room=legal-${Date.now()}&lang=${lang}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            const room = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });
            roomRef.current = room;
            room.on(window.LivekitClient.RoomEvent.Connected, () => { setAgentState('listening'); setIsConnecting(false); setVoiceMode(true); });
            room.on(window.LivekitClient.RoomEvent.TrackSubscribed, (track) => { if (track.kind === window.LivekitClient.Track.Kind.Audio) { track.attach().play(); setAgentState('speaking'); } });
            await room.connect(data.url, data.token);
            await room.localParticipant.enableMicrophone(true);
        } catch (err) { alert("Voice Error"); setIsConnecting(false); }
    };

    const speakText = (text) => {
        if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
        setIsSpeaking(true);
        fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
            .then(res => res.blob()).then(blob => { const a = new Audio(URL.createObjectURL(blob)); a.onended = () => setIsSpeaking(false); a.play(); })
            .catch(() => { const u = new SpeechSynthesisUtterance(text); u.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN'; window.speechSynthesis.speak(u); setIsSpeaking(false); });
    };

    const handleSend = async (qOverride) => {
        const q = qOverride || query; if (!q.trim()) return;
        setMessages(p => [...p, { role: 'user', content: q }]); setQuery(''); setLoading(true);
        try {
            const res = await fetch('/api/legal/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, lang }) });
            const data = await res.json();
            setMessages(p => [...p, { role: 'assistant', content: data.answer, acts: data.acts, procedures: data.procedures, news: data.news }]);
        } catch (e) { setMessages(p => [...p, { role: 'assistant', content: 'Error occurred.' }]); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur flex items-center justify-center p-4">
            <div className="bg-[#121215] w-full max-w-5xl h-[90vh] rounded-3xl border border-white/10 flex flex-col relative overflow-hidden">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0a0a0c]">
                    <h3 className="text-xl font-bold">{t('legal')}</h3>
                    <div className="flex gap-2">
                        <button onClick={toggleVoiceMode} className={`px-4 py-2 rounded-full ${voiceMode ? 'bg-red-500' : 'bg-blue-600'}`}>{isConnecting ? '...' : (voiceMode ? 'End Voice' : 'Voice Mode')}</button>
                        <button onClick={onClose}><i className="ri-close-line text-2xl"></i></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((m, i) => (<div key={i} className={`p-4 rounded-xl ${m.role === 'user' ? 'bg-indigo-600 ml-auto' : 'bg-gray-800'}`} style={{ maxWidth: '85%' }}>
                        <div dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(m.content) : m.content }} />
                        {m.role === 'assistant' && <button onClick={() => speakText(m.content)} className="mt-2 text-xs bg-white/10 px-2 py-1 rounded"><i className="ri-volume-up-line"></i> Read</button>}
                        {m.acts?.map((a, j) => <div key={j} className="mt-2 bg-black/20 p-2 rounded text-sm"><a href={a.url} target="_blank" className="text-blue-300">{a.title}</a></div>)}
                    </div>))}
                    {loading && <div className="text-gray-500 animate-pulse">Thinking...</div>}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-white/10 flex gap-2">
                    <input className="flex-1 bg-black/50 border border-white/10 rounded px-4 py-3" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask legal questions..." />
                    <button onClick={() => handleSend()} className="px-6 bg-indigo-600 rounded font-bold">Send</button>
                </div>
            </div>
        </div>
    );
};

// Admin Dashboard
const AdminDashboard = () => {
    const [token, setToken] = useState(localStorage.getItem('admin_token'));
    const [creds, setCreds] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [content, setContent] = useState({ videos: [], news: [] });
    const [activeView, setActiveView] = useState('videos');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (token) {
            fetchContent();
            fetch('/api/admin/stats').then(r => r.json()).then(setStats);
        }
    }, [token]);

    const login = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const json = await res.json();
            if (json.success) {
                localStorage.setItem('admin_token', json.token);
                setToken(json.token);
                setError('');
            } else {
                setError(json.error);
            }
        } catch (e) { setError("Connection failed"); }
    };

    const fetchContent = () => {
        setLoading(true);
        fetch('/api/admin/content')
            .then(res => res.json())
            .then(data => {
                setContent({ videos: data.videos || [], news: data.news || [] });
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    };

    const handleToggle = (id, type, currentStatus) => {
        const key = type === 'video' ? 'videos' : 'news';
        setContent(prev => ({
            ...prev,
            [key]: prev[key].map(i => i.id === id ? { ...i, is_approved: !currentStatus ? 1 : 0 } : i)
        }));
        fetch('/api/admin/content/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, type, status: !currentStatus })
        }).catch(() => fetchContent());
    };

    if (!token) return (
        <div className="p-10 max-w-md mx-auto">
            <h2 className="text-2xl mb-4">Admin Login</h2>
            <form onSubmit={login} className="space-y-4">
                <input className="w-full bg-gray-800 p-2 rounded" placeholder="Username" value={creds.username} onChange={e => setCreds({ ...creds, username: e.target.value })} />
                <input className="w-full bg-gray-800 p-2 rounded" type="password" placeholder="Password" value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })} />
                {error && <p className="text-red-500">{error}</p>}
                <button className="bg-blue-600 px-4 py-2 rounded text-white w-full">Login</button>
            </form>
        </div>
    );

    const items = activeView === 'videos' ? content.videos : content.news;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <button onClick={() => { localStorage.removeItem('admin_token'); setToken(null); }} className="text-red-400 text-sm">Logout</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 p-4 rounded-xl border border-white/10">
                    <h3 className="text-gray-400">Total Views</h3>
                    <p className="text-2xl font-bold">{stats?.total_views || 0}</p>
                </div>
                {stats?.prediction && (
                    <div className="bg-gray-800 p-4 rounded-xl border border-blue-500/30">
                        <h3 className="text-blue-400">Growth Forecast</h3>
                        <p className="text-xl font-bold">{stats.prediction.growth}</p>
                    </div>
                )}
            </div>

            <div className="flex gap-4 border-b border-white/10 pb-4">
                <button onClick={() => setActiveView('videos')} className={`px-4 py-2 rounded ${activeView === 'videos' ? 'bg-purple-600' : 'bg-gray-800'} transition`}>Videos ({content.videos.length})</button>
                <button onClick={() => setActiveView('news')} className={`px-4 py-2 rounded ${activeView === 'news' ? 'bg-purple-600' : 'bg-gray-800'} transition`}>News ({content.news.length})</button>
            </div>

            <div className="bg-[#15151A] rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
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
                                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 truncate max-w-xs" title={item.title}>{item.title}</td>
                                    <td className="px-6 py-4">{item.source || item.channel}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${item.is_approved ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {item.is_approved ? 'Approved' : 'Hidden'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggle(item.id, activeView === 'videos' ? 'video' : 'news', item.is_approved)}
                                            className={`text-xs font-bold px-3 py-1 rounded ${item.is_approved ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'} hover:opacity-80`}
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

// Super Admin
const SuperAdminDashboard = () => {
    const [token, setToken] = useState(localStorage.getItem('super_token'));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [topics, setTopics] = useState({});

    useEffect(() => {
        if (token) fetch('/api/topics').then(r => r.json()).then(setTopics);
    }, [token]);

    const handleLogin = (e) => {
        e.preventDefault();
        fetch('/api/superadmin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                localStorage.setItem('super_token', data.token);
                setToken(data.token);
                setError('');
            } else { setError(data.error); }
        });
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
            <div className="flex items-center justify-center p-6">
                <form onSubmit={handleLogin} className="bg-[#15151A] p-8 rounded-2xl w-full max-w-md space-y-4">
                    <h2 className="text-2xl font-bold">Super Admin</h2>
                    {error && <div className="text-red-400 text-sm">{error}</div>}
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full bg-gray-800 px-4 py-2 rounded" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-800 px-4 py-2 rounded" />
                    <button type="submit" className="w-full bg-orange-600 font-bold py-2 rounded">Access Control</button>
                </form>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Topic Control</h1>
                <button onClick={() => { setToken(null); localStorage.removeItem('super_token'); }} className="text-gray-400">Logout</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(topics).map(([topic, active]) => (
                    <div key={topic} className={`p-6 rounded-xl border ${active ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">{topic}</h3>
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

// --- Dashboard Layout (Matches Screenshot Header) ---
const DashboardLayout = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [lang, setLang] = useState(() => localStorage.getItem('gyanbridge_lang') || 'en');
    useEffect(() => { localStorage.setItem('gyanbridge_lang', lang); }, [lang]);

    const t = (key) => TRANSLATIONS[lang][key] || key;

    const [liveNews, setLiveNews] = useState([]);
    const [liveVideos, setLiveVideos] = useState([]);
    const [readerUrl, setReaderUrl] = useState(null);
    const [activeVideo, setActiveVideo] = useState(null);
    const [legalOpen, setLegalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);

    useEffect(() => {
        const fetchDat = () => {
            fetch(`/api/news?lang=${lang}`).then(r => r.json()).then(setLiveNews).catch(console.error);
            fetch(`/api/videos?lang=${lang}`).then(r => r.json()).then(setLiveVideos).catch(console.error);
        };
        fetchDat();
        const i = setInterval(fetchDat, 60000);
        return () => clearInterval(i);
    }, [lang]);

    const toggleSave = () => { };

    const handleSearch = async (e, manualQuery = null) => {
        if (e) e.preventDefault();
        const q = manualQuery || searchQuery;
        if (!q || !q.trim()) return;
        setSearchResults(null);
        setActiveTab('dashboard'); // Show results on dashboard area
        try {
            // ... existing search logic ...
            const [newsRes, videoRes] = await Promise.all([
                fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: q, limit: 20, type: 'news', lang }) }),
                fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: q, limit: 20, type: 'video', lang }) })
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
        } catch (e) { console.error(e); }
    };

    return (
        <div className="bg-[#050505] text-white font-['Rajdhani'] h-screen flex overflow-hidden selection:bg-purple-500/30">
            {/* Sidebar (Full Width Screenshot Style) */}
            <Sidebar activeTab={activeTab} onNavigate={(tab) => tab === 'legal' ? setLegalOpen(true) : setActiveTab(tab)} onLogout={onLogout} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} lang={lang} setLang={setLang} />

            <div className="flex-1 flex flex-col h-full relative">
                {/* Header (Top Bar with Search) */}
                <header className="h-16 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md flex items-center justify-between px-6 z-40 sticky top-0">
                    {/* Left: Hidden on mobile triggers */}
                    <div className="flex items-center gap-3 lg:hidden">
                        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}><i className="ri-menu-line text-xl"></i></button>
                    </div>

                    {/* Center: Search (As shown in screenshot) */}
                    <div className="flex-1 max-w-2xl mx-auto relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <i className="ri-search-line text-gray-400 group-focus-within:text-purple-400 transition-colors"></i>
                        </div>
                        <input
                            className="w-full bg-[#15151A] hover:bg-[#1A1A20] focus:bg-[#1A1A20] border border-white/5 focus:border-purple-500/50 rounded-full py-2.5 pl-10 pr-10 text-sm text-gray-200 placeholder-gray-500 outline-none transition-all duration-300 shadow-inner"
                            placeholder={t('search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
                        />
                        <button className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white" onClick={() => handleSearch()}>
                            <i className="ri-mic-line"></i>
                        </button>
                        {/* Search Suggestions */}
                        {searchQuery.length > 1 && (
                            <div className="absolute top-12 left-0 right-0 z-50">
                                <SearchSuggestions query={searchQuery} type="web" onSelect={(s) => { setSearchQuery(s); handleSearch(null, s); }} onClose={() => setSearchQuery('')} />
                            </div>
                        )}
                    </div>

                    {/* Right: Actions (Icons based on screenshot) */}
                    <div className="flex items-center gap-4 ml-4">
                        <button onClick={() => setActiveTab('news')} className="flex flex-col items-center text-gray-400 hover:text-white">
                            <i className="ri-newspaper-line text-lg"></i>
                            <span className="text-[10px] hidden md:block">{t('news_btn')}</span>
                        </button>
                        <button onClick={() => setActiveTab('videos')} className="flex flex-col items-center text-gray-400 hover:text-white">
                            <i className="ri-youtube-line text-lg"></i>
                            <span className="text-[10px] hidden md:block">{t('videos_btn')}</span>
                        </button>

                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shadow-lg border border-white/10">
                            {user?.[0]?.toUpperCase()}
                        </div>
                        <button onClick={() => setActiveTab('super_admin')} className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-lg hover:scale-105" title="Super Admin">
                            <i className="ri-shield-user-line text-sm"></i>
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 max-w-[1600px] mx-auto">
                            {searchResults ? (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <i className="ri-search-eye-line text-purple-400"></i>
                                            {t('found_results')} <span className="text-purple-400">"{searchQuery}"</span>
                                        </h2>
                                        <button onClick={() => setSearchResults(null)} className="text-gray-400 hover:text-white flex items-center gap-1"><i className="ri-close-circle-line"></i> {t('clear')}</button>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {searchResults.length > 0 ? searchResults.map((item, idx) => (
                                            item.result_type === 'video' || item.source_type === 'youtube' ?
                                                <VideoCard key={item.id} video={item} onWatch={setActiveVideo} isSaved={false} onToggleSave={toggleSave} /> :
                                                <NewsCard key={item.id} article={item} onRead={setReaderUrl} isSaved={false} onToggleSave={toggleSave} t={t} />
                                        )) : <div className="p-10 text-center text-gray-500 border border-white/5 rounded-xl bg-white/5">{t('no_results')}</div>}
                                    </div>
                                </div>
                            ) : (
                                // Dashboard Home View
                                <div className="animate-fade-in space-y-10">
                                    {/* Videos Section */}
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                                <i className="ri-fire-fill text-orange-500"></i> {t('trending_title')}
                                            </h2>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {liveVideos.slice(0, 4).map(v => <VideoCard key={v.id} video={v} onWatch={setActiveVideo} isSaved={false} onToggleSave={toggleSave} />)}
                                        </div>
                                    </section>

                                    {/* News Section */}
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                                <i className="ri-global-line text-blue-500"></i> {t('news_title')}
                                            </h2>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {liveNews.slice(0, 4).map(n => <NewsCard key={n.id} article={n} onRead={setReaderUrl} isSaved={false} onToggleSave={toggleSave} t={t} />)}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'news' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6">{t('news_btn')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {liveNews.map(n => <NewsCard key={n.id} article={n} onRead={setReaderUrl} isSaved={false} onToggleSave={toggleSave} t={t} />)}
                            </div>
                        </div>
                    )}
                    {activeTab === 'videos' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6">{t('videos_btn')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {liveVideos.map(v => <VideoCard key={v.id} video={v} onWatch={setActiveVideo} isSaved={false} onToggleSave={toggleSave} />)}
                            </div>
                        </div>
                    )}
                    {activeTab === 'stats' && <div className="text-center text-2xl p-10">Analytics Section Placeholder</div>}
                    {activeTab === 'admin' && <AdminDashboard />}
                    {activeTab === 'super_admin' && <SuperAdminDashboard />}
            </div>
            {readerUrl && <ReaderModal url={readerUrl.url} topic={readerUrl.title} onClose={() => setReaderUrl(null)} />}
            {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
            {legalOpen && <LegalAssistantModal onClose={() => setLegalOpen(false)} lang={lang} />}
        </div>
    );
};

// --- App Root ---
const GyanBridgeApp = () => {
    const [user, setUser] = useState(() => localStorage.getItem('gb_user') || null);
    const handleLogin = (u) => { localStorage.setItem('gb_user', u); setUser(u); };
    const handleLogout = () => { localStorage.removeItem('gb_user'); setUser(null); };

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }`;
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
