const { useState, useEffect, useRef, useCallback } = React;

// --- Helper: Extract YouTube ID ---

// --- i18n Dictionary ---
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
        // Legal Assistant
        legal_intro: "Hello! I am your Legal Assistant. I can help you find Acts, Procedures, and relevant Case Laws. Ask me anything!",
        legal_placeholder: "Ask about church bylaws, property disputes, or FCRA regulations...",
        constitutional_guide: "Constitutional & Minority Rights Guide",
        verified_ai_response: "Verified AI Response",
        read_aloud: "READ ALOUD",
        // Dynamic Topics
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
        // Legal Assistant
        legal_intro: "नमस्ते! मैं आपका कानूनी सहायक हूँ। मैं अधिनियम, प्रक्रियाएं और केस कानून खोजने में आपकी सहायता कर सकता हूँ।",
        legal_placeholder: "चर्च उपनियम, संपत्ति विवाद, या FCRA नियमों के बारे में पूछें...",
        constitutional_guide: "संवैधानिक और अल्पसंख्यक अधिकार गाइड",
        verified_ai_response: "सत्यापित एआई प्रतिक्रिया",
        read_aloud: "जोर से पढ़ें",
        // Dynamic Topics
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
        // Legal Assistant
        legal_intro: "வணக்கம்! நான் உங்கள் சட்ட உதவியாளர். சட்டங்கள், நடைமுறைகள் மற்றும் வழக்குத் தீர்ப்புகளைக் கண்டறிய நான் உதவ முடியும்.",
        legal_placeholder: "தேவாலய விதிகள், சொத்து தகராறுகள் அல்லது FCRA விதிமுறைகள் பற்றி கேட்கவும்...",
        constitutional_guide: "அரசியலமைப்பு மற்றும் சிறுபான்மை உரிமைகள் வழிகாட்டி",
        verified_ai_response: "சரிபார்க்கப்பட்ட AI பதில்",
        read_aloud: "உரக்கப் படியுங்கள்",
        // Dynamic Topics
        Sports: "விளையாட்டு",
        Technology: "தொழில்நுட்பம்",
        Science: "அறிவியல்",
        Business: "வணிகம்",
        Entertainment: "பொழுதுபோக்கு",
        Politics: "அரசியல்",
        Christianity: "கிறிஸ்தவம்"
    }
};

const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- Search Suggestions Component ---
const SearchSuggestions = ({ query, type, onSelect, onClose }) => {
    const [suggestions, setSuggestions] = useState([]);
    const wrapperRef = useRef(null);

    useEffect(() => {
        // Debounce Fetch
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(() => {
            fetch(`/api/suggestions?q=${encodeURIComponent(query)}&type=${type}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setSuggestions(data);
                })
                .catch(err => console.error(err));
        }, 300);

        return () => clearTimeout(timer);
    }, [query, type]);

    // Click Outside listener
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!suggestions.length) return null;

    return (
        <div ref={wrapperRef} className="absolute top-full left-0 right-0 bg-[#0a0a12] border border-white/10 rounded-xl mt-2 z-50 shadow-2xl overflow-hidden animate-fade-in">
            {suggestions.map((s, i) => (
                <div
                    key={i}
                    className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 text-gray-300 hover:text-white transition-colors border-b border-white/5 last:border-0"
                    onClick={() => { onSelect(s); onClose(); }}
                >
                    <i className="ri-search-line text-xs text-gray-500"></i>
                    <span dangerouslySetInnerHTML={{ __html: s.replace(new RegExp(`(${query})`, 'gi'), '<span class="text-white font-semibold">$1</span>') }}></span>
                </div>
            ))}
        </div>
    );
};

// --- Mock Data: Christian News (Expanded) ---
const MOCK_NEWS = [
    {
        id: 'n1',
        title: "Vatican Announces New Global Youth Initiative",
        source: "Vatican News",
        published_at: "2h ago",
        snippet: "Pope Francis launches a worldwide program to engage youth in local community service and digital evangelism.",
        image: "https://images.unsplash.com/photo-1551817958-c1b017772740?w=800&q=80",
        url: "#vatican-youth"
    },
    {
        id: 'n2',
        title: "Missionaries Expand Clean Water Projects in Africa",
        source: "Global Mission Net",
        published_at: "5h ago",
        snippet: "Christian aid groups have successfully installed 50 new solar-powered wells in drought-stricken regions.",
        image: "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&q=80",
        url: "#mission-water"
    },
    {
        id: 'n3',
        title: "Upcoming Easter Worship Concert in Sydney",
        source: "Worship Weekly",
        published_at: "1d ago",
        snippet: "Hillsong and Planetshakers set to collaborate for a massive outdoor worship event this Easter.",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
        url: "#easter-concert"
    },
    {
        id: 'n4',
        title: "Archaeologists Uncover Ancient Church Site in Turkey",
        source: "Biblical Archaeology",
        published_at: "2d ago",
        snippet: "Ruins dating back to the 4th century reveal well-preserved mosaics and early Christian symbols.",
        image: "https://images.unsplash.com/photo-1548625361-bd8bdccc5d30?w=800&q=80",
        url: "#ancient-church"
    },
    {
        id: 'n5',
        title: "Revival in Asbury: Thousands Gather for Prayer",
        source: "Christian Post",
        published_at: "3d ago",
        snippet: "A spontaneous outlawing of prayer has turned into a week-long revival service at Asbury University.",
        image: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80",
        url: "#asbury-revival"
    },
    {
        id: 'n6',
        title: "New Translation of the Bible Released for Gen Z",
        source: "Bible Society",
        published_at: "4d ago",
        snippet: "Translators aim to make the scripture more accessible while retaining its original theological depth.",
        image: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?w=800&q=80",
        url: "#bible-genz"
    },
    {
        id: 'n7',
        title: "Church Attendance Rises Post-Pandemic",
        source: "Pew Research",
        published_at: "1w ago",
        snippet: "New studies show a significant uptick in physical church attendance across North America and Europe.",
        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
        url: "#church-stats"
    },
    {
        id: 'n8',
        title: "Digital Evangelism Summit 2025 Announced",
        source: "Tech & Faith",
        published_at: "1w ago",
        snippet: "Leaders to discuss the role of AI and social media in spreading the Gospel efficiently.",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
        url: "#tech-faith"
    }
];

// --- Mock Data: Christian Videos (Curated: Trending, Songs, News, Testimonials) ---
const MOCK_VIDEOS = [
    // Trending Worship Songs
    {
        id: 'v1',
        title: "Gratitude - Brandon Lake (Live)",
        source: "Bethel Music",
        source_type: "youtube",
        views: "5.2M",
        image: "https://images.unsplash.com/photo-1514525253440-b393452e2347?w=800&q=80",
        url: "#"
    },
    {
        id: 'v2',
        title: "I Speak Jesus - Charity Gayle",
        source: "Charity Gayle",
        source_type: "youtube",
        views: "32M",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
        url: "#"
    },
    {
        id: 'v3',
        title: "Jireh | Elevation Worship & Maverick City",
        source: "Elevation Worship",
        source_type: "youtube",
        views: "15M",
        image: "https://images.unsplash.com/photo-1459749411177-0473ef716175?w=800&q=80",
        url: "#"
    },
    {
        id: 'v3b',
        title: "Way Maker - Sinach (Live)",
        source: "Sinach",
        source_type: "youtube",
        views: "200M+",
        image: "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=800&q=80",
        url: "#"
    },
    {
        id: 'v3c',
        title: "The Blessing - Kari Jobe & Cody Carnes",
        source: "Elevation Worship",
        source_type: "youtube",
        views: "80M",
        image: "https://images.unsplash.com/photo-1514525253440-b393452e2347?w=800&q=80",
        url: "#"
    },

    // Video News Updates
    {
        id: 'v4',
        title: "Christian World News: Revival in Europe?",
        source: "CBN News",
        source_type: "facebook",
        views: "890K",
        image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
        url: "#"
    },
    {
        id: 'v5',
        title: "Persecution Watch: Update from Nigeria",
        source: "Open Doors",
        source_type: "youtube",
        views: "120K",
        image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80",
        url: "#"
    },

    // Powerful Testimonials
    {
        id: 'v6',
        title: "From Atheist to Believer: A Scientist's Journey",
        source: "I Am Second",
        source_type: "vimeo",
        views: "2.5M",
        image: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80",
        url: "#"
    },
    {
        id: 'v7',
        title: "Healed from Addiction: My Testimony",
        source: "700 Club",
        source_type: "facebook",
        views: "3.2M",
        image: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80",
        url: "#"
    },

    // Impactful Short Messages
    {
        id: 'v8',
        title: "Stop Worrying - 2 Minute Encouragement",
        source: "Joyce Meyer",
        source_type: "instagram",
        views: "450K",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80",
        url: "#"
    },
    {
        id: 'v9',
        title: "The Power of Silence",
        source: "The Bible Project",
        source_type: "youtube",
        views: "1.2M",
        image: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?w=800&q=80",
        url: "#"
    },

    // Youth & Culture
    {
        id: 'v10',
        title: "Christian Dating in 2025: Real Talk",
        source: "RelationShip Goals",
        source_type: "tiktok",
        views: "8M",
        image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
        url: "#"
    },
    {
        id: 'v11',
        title: "Spoken Word: The Cross",
        source: "P4CM",
        source_type: "youtube",
        views: "900K",
        image: "https://images.unsplash.com/photo-1453396450673-3fe83d2db2c4?w=800&q=80",
        url: "#"
    },
    {
        id: 'v12',
        title: "Sunday Highlight: Bishop TD Jakes",
        source: "Potter's House",
        source_type: "instagram",
        views: "1.1M",
        image: "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=800&q=80",
        url: "#"
    }
];

// --- Mock Data: Top Search Keywords ---
const MOCK_TOP_SEARCHES = [
    { keyword: "Prevention of Persecution", count: 850 },
    { keyword: "Worship Songs 2025", count: 720 },
    { keyword: "Bible Study Guides", count: 640 },
    { keyword: "Church Events Near Me", count: 510 },
    { keyword: "Daily Prayer", count: 480 }
];

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
                            text: "<p>This is a simulated article view for demonstration purposes. In a live environment, this would content extracted from the source URL.</p><p><strong>Mock Content:</strong> " + topic + " details would appear here, formatted for easy reading.</p>",
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
            <div className="bg-[#1A1A1A] w-full max-w-4xl h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
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
                            <div className="text-gray-300 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: marked.parse(content.text) }}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Component: Video Modal (Advanced Player with Scroll) ---
const VideoModal = ({ video, onClose }) => {
    const [language, setLanguage] = useState("Off");

    // Determine Playback Source
    const isYouTube = video.source_type === 'youtube' || (video.url && video.url.includes('youtu'));
    const videoId = video.id; // Backend provides clean ID

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
            {/* Prominent External Exit Button */}
            <div className="w-full max-w-6xl flex justify-end mb-4">
                <button onClick={onClose} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                    <i className="ri-logout-box-r-line"></i> EXIT PLAYER
                </button>
            </div>

            <div className="w-full max-w-6xl bg-[#121212] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col h-[80vh]">
                <div className="flex items-center justify-between p-4 bg-black/40 border-b border-white/5 shrink-0">
                    <h3 className="text-white font-bold truncate">{video.title}</h3>
                </div>

                {/* Scrollable Container */}
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
                            // Fallback for non-YouTube / Mocks
                            <div className="text-center p-10">
                                <i className="ri-error-warning-line text-4xl text-gray-500 mb-2"></i>
                                <p className="text-gray-400">External playback not supported for this source.</p>
                                <a href={video.url} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline mt-2 inline-block">Watch on {video.source}</a>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-[#181818]">
                        <div className="flex items-center gap-4 mb-6">
                            <img src={video.image} className="w-12 h-12 rounded-full object-cover border border-purple-500/30" />
                            <div>
                                <p className="text-gray-400 text-xs uppercase font-bold text-purple-400">{video.source}</p>
                                <p className="text-gray-500 text-xs">Simulated Stream • {video.views} views</p>
                            </div>
                        </div>
                        <div className="prose prose-invert max-w-none">
                            <h4 className="text-white font-bold mb-2">About this Video</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                This is a simulated playback experience for the GyanBridge demonstration. In a real-world scenario, this area would contain the full video description, timestamps, and related links. You can scroll this section indefinitely to read comments, related videos, and transcriptions.
                                <br /><br />
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Component: Legal Assistant Modal ---
// --- Component: Legal Assistant Modal ---
// --- Component: Legal Assistant Modal ---
const LegalAssistantModal = ({ onClose, lang }) => {
    const [messages, setMessages] = useState([{ role: 'assistant', content: "Hello! I am your Legal Assistant. I can help you find Acts, Procedures, and relevant Case Laws. Ask me anything!" }]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const speakText = (text) => {
        if (!window.speechSynthesis) return;
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        // Clean text (remove markdown symbols for better speech)
        const cleanText = text.replace(/[*#_`]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-IN'; // Indian accent preference
        utterance.rate = 1.0;

        utterance.onend = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    const handleVoiceSearch = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice search is not supported in this browser.");
            return;
        }
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.onstart = () => console.log("Legal Voice Listening...");
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setQuery(transcript);
            handleSend(transcript); // Auto-send
        };
        recognition.start();
    };

    const handleSend = async (manualQuery = null) => {
        const q = manualQuery || query;
        if (!q.trim()) return;

        // User Message
        const newMessages = [...messages, { role: 'user', content: q }];
        setMessages(newMessages);
        setQuery('');
        setLoading(true);
        window.speechSynthesis.cancel(); // Stop any previous speech

        try {
            const res = await fetch('/api/legal/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q, lang: lang || 'en' })
            });
            const data = await res.json();

            // Assistant Answer
            const botMsg = {
                role: 'assistant',
                content: data.answer,
                acts: data.acts,
                procedures: data.procedures,
                news: data.news
            };
            setMessages([...newMessages, botMsg]);

            // Auto-speak the answer on arrival (Optional, maybe annoying? Let's add a button instead)
            // speakText(data.answer); 

        } catch (err) {
            console.error(err);
            setMessages([...newMessages, { role: 'assistant', content: "Sorry, I encountered an error researching that legal topic." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#121215]/95 w-full max-w-5xl h-[90vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden ring-1 ring-white/5">

                {/* Header */}
                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#0a0a0c]/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                            <i className="ri-scales-3-fill text-indigo-400 text-2xl drop-shadow-md"></i>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-xl tracking-wide font-['Rajdhani']">Legal Assistant</h3>
                            <p className="text-sm text-gray-400 font-medium tracking-wide">Constitutional & Minority Rights Guide</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-full transition-colors group">
                        <i className="ri-close-line text-2xl text-gray-400 group-hover:text-white"></i>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gradient-to-b from-[#0f0f12] to-[#0a0a0c]">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-4'}`}>

                            {/* Avatar for Assistant */}
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0 flex items-center justify-center mt-1">
                                    <i className="ri-robot-2-line text-indigo-400 text-sm"></i>
                                </div>
                            )}

                            <div className={`${msg.role === 'user' ? 'max-w-[75%]' : 'max-w-[85%]'} shadow-xl transition-all duration-300`}>
                                <div className={`p-6 rounded-2xl ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-br-none border border-indigo-400/30'
                                    : 'bg-[#1a1a20] border border-white/5 text-gray-100 rounded-tl-none hover:border-white/10'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <>
                                            {/* Main Answer with Enhanced Typography */}
                                            <div className="prose prose-invert prose-lg max-w-none leading-relaxed text-gray-200"
                                                dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(msg.content) : msg.content }}>
                                            </div>

                                            {/* Speak Button */}
                                            <button
                                                onClick={() => speakText(msg.content)}
                                                className={`mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${isSpeaking ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                            >
                                                <i className={`ri-${isSpeaking ? 'stop-circle-line' : 'volume-up-line'} text-lg`}></i>
                                                {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
                                            </button>

                                            {/* Section: Acts */}
                                            {msg.acts && msg.acts.length > 0 && (
                                                <div className="mt-8">
                                                    <h4 className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 opacity-80">
                                                        <i className="ri-book-2-fill"></i> Relevant Acts
                                                    </h4>
                                                    <div className="grid gap-3">
                                                        {msg.acts.map((act, i) => (
                                                            <a key={i} href={act.url} target="_blank" rel="noopener noreferrer"
                                                                className="group bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 p-4 rounded-xl transition-all flex items-start gap-3">
                                                                <i className="ri-article-line text-amber-500 mt-0.5 group-hover:scale-110 transition-transform"></i>
                                                                <div>
                                                                    <div className="text-amber-200 font-semibold group-hover:text-amber-100 text-base">{act.title}</div>
                                                                    {act.snippet && <p className="text-gray-400 text-sm mt-1 leading-snug line-clamp-2">{act.snippet}</p>}
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section: Procedures */}
                                            {msg.procedures && msg.procedures.length > 0 && (
                                                <div className="mt-8">
                                                    <h4 className="text-cyan-400 text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 opacity-80">
                                                        <i className="ri-file-list-3-fill"></i> Procedures & Checklists
                                                    </h4>
                                                    <div className="grid gap-3">
                                                        {msg.procedures.map((proc, i) => (
                                                            <a key={i} href={proc.url} target="_blank" rel="noopener noreferrer"
                                                                className="group bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 p-4 rounded-xl transition-all flex items-start gap-3">
                                                                <i className="ri-checkbox-circle-line text-cyan-500 mt-0.5 group-hover:scale-110 transition-transform"></i>
                                                                <div>
                                                                    <div className="text-cyan-200 font-semibold group-hover:text-cyan-100 text-base">{proc.title}</div>
                                                                    {proc.snippet && <p className="text-gray-400 text-sm mt-1 leading-snug line-clamp-2">{proc.snippet}</p>}
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section: News */}
                                            {msg.news && msg.news.length > 0 && (
                                                <div className="mt-8">
                                                    <h4 className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 opacity-80">
                                                        <i className="ri-newspaper-fill"></i> Related News
                                                    </h4>
                                                    <div className="grid gap-3">
                                                        {msg.news.map((article, i) => (
                                                            <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                                                                className="group bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 p-4 rounded-xl transition-all flex items-start gap-3">
                                                                <i className="ri-global-line text-emerald-500 mt-0.5 group-hover:scale-110 transition-transform"></i>
                                                                <div>
                                                                    <div className="text-emerald-200 font-semibold group-hover:text-emerald-100 text-base">{article.title}</div>
                                                                    {article.snippet && <p className="text-gray-400 text-sm mt-1 leading-snug line-clamp-2">{article.snippet}</p>}
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-lg font-medium">{msg.content}</div>
                                    )}
                                </div>
                                {msg.role === 'assistant' && (
                                    <div className="text-xs text-gray-600 mt-2 ml-2 flex items-center gap-2">
                                        <span>Verified AI Response</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start items-center gap-4 pl-14">
                            <div className="flex space-x-2">
                                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-300"></div>
                            </div>
                            <span className="text-sm text-indigo-400/80 font-medium animate-pulse">Researching Legal Precedents...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-[#0a0a0c]/80 backdrop-blur-xl border-t border-white/5">
                    <div className="relative group max-w-4xl mx-auto">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-md"></div>
                        <div className="relative flex items-center bg-[#18181b] rounded-2xl border border-white/10 focus-within:border-indigo-500/50 shadow-2xl transition-all">
                            <input
                                type="text"
                                className="w-full bg-transparent border-none rounded-2xl py-5 pl-6 pr-24 text-white text-lg placeholder-gray-500 focus:ring-0"
                                placeholder="Ask about church bylaws, property disputes, or FCRA regulations..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                autoFocus
                            />
                            <div className="absolute right-3 flex items-center gap-2">
                                <button
                                    onClick={handleVoiceSearch}
                                    className="p-3 text-gray-400 hover:text-white rounded-xl transition-colors hover:bg-white/5"
                                    title="Voice Input"
                                >
                                    <i className="ri-mic-fill text-xl"></i>
                                </button>
                                <button
                                    onClick={() => handleSend()}
                                    disabled={loading || !query.trim()}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-all transform active:scale-95 shadow-lg shadow-indigo-900/20"
                                >
                                    <i className="ri-send-plane-2-fill text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-xs text-gray-600 mt-4">
                        AI can make mistakes. Please consult with a qualified legal professional for official advice.
                    </p>
                </div>
            </div>
        </div>
    );
};


// --- Component: News Card ---
// --- Component: News Card ---
const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800"; // Abstract Dark Gradient

const NewsCard = ({ article, onRead, isSaved, onToggleSave }) => {
    const videoId = getYoutubeId(article.url);
    const textContent = (article.snippet || article.title || "");
    const readTime = Math.max(1, Math.round(textContent.length / 20));

    return (
        <div className="bg-[#1E1E1E] rounded-xl overflow-hidden hover:bg-[#252525] transition-all duration-300 group relative shadow-lg border border-white/5 hover:border-purple-500/30 w-full flex flex-col sm:flex-row h-auto sm:h-[180px]">
            {/* Save Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onToggleSave(article); }}
                className="absolute top-2 right-2 z-20 p-2 bg-black/50 hover:bg-purple-600/80 rounded-full backdrop-blur transition-colors"
                title={isSaved ? "Remove from Wishlist" : "Save to Wishlist"}
            >
                <i className={`${isSaved ? 'ri-heart-fill text-red-500' : 'ri-heart-line text-white'} text-lg`}></i>
            </button>

            {/* Image Section - Flex Sizing */}
            <div className="relative w-full h-48 sm:h-full sm:w-[200px] shrink-0 overflow-hidden cursor-pointer bg-black" onClick={() => onRead && onRead(article)}>
                <img
                    src={article.image || PLACEHOLDER_IMG}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    onError={(e) => {
                        e.target.onerror = null;
                        if (e.target.src !== PLACEHOLDER_IMG) {
                            e.target.src = PLACEHOLDER_IMG;
                        }
                    }}
                />

                {/* Source Badge (Mobile Over Image) */}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs text-white font-medium sm:hidden">
                    {article.source}
                </div>
            </div>

            {/* Content Section - Flex Grow */}
            <div className="p-4 flex flex-col flex-1 justify-between h-full overflow-hidden min-w-0">
                <div className="flex flex-col gap-1">
                    {/* Meta Row */}
                    <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-400 mb-1">
                        <span className="font-semibold text-gray-300 truncate max-w-[120px]">{article.source}</span>
                        <span>• {article.published_at || 'Recently'}</span>
                    </div>

                    {/* Title - Max 2 lines */}
                    <h3 onClick={() => onRead && onRead(article)}
                        className="text-gray-100 font-bold text-base sm:text-lg leading-tight line-clamp-2 cursor-pointer hover:text-cyan-400 transition-colors"
                        title={article.title}
                    >
                        {article.title}
                    </h3>

                    {/* Snippet - Max 2 lines */}
                    {article.snippet && (
                        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mt-1 sm:mt-2 hidden sm:block">
                            {article.snippet}
                        </p>
                    )}
                </div>

                {/* Footer Row */}
                <div className="flex items-center justify-between text-gray-500 text-xs mt-3 pt-3 border-t border-white/5">
                    <span className="flex items-center gap-1">
                        <i className="ri-time-line"></i> {readTime} min read
                    </span>
                    {/* Mobile Time */}
                    <span className="sm:hidden">{article.published_at || 'Recently'}</span>
                </div>
            </div>
        </div>
    );
};

// --- Component: Video Card ---
const VideoCard = ({ video, isSaved, onToggleSave, onWatch }) => {
    const getBadge = (type) => {
        if (type === 'youtube') return { color: 'text-red-500', icon: 'ri-youtube-fill', name: 'YouTube' };
        if (type === 'instagram') return { color: 'text-pink-500', icon: 'ri-instagram-fill', name: 'Instagram' };
        if (type === 'facebook') return { color: 'text-blue-500', icon: 'ri-facebook-fill', name: 'Facebook' };
        if (type === 'vimeo') return { color: 'text-sky-400', icon: 'ri-vimeo-fill', name: 'Vimeo' };
        if (type === 'dailymotion') return { color: 'text-zinc-400', icon: 'ri-video-fill', name: 'DailyMotion' };
        if (type === 'tiktok') return { color: 'text-purple-400', icon: 'ri-music-2-fill', name: 'TikTok' };
        return { color: 'text-gray-400', icon: 'ri-video-fill', name: 'Video' };
    };
    const badge = getBadge(video.source_type);

    // Generate fallback thumbnail URLs
    const videoId = video.id;
    const fallbackThumbnails = videoId ? [
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        PLACEHOLDER_IMG
    ] : [PLACEHOLDER_IMG];

    const handleImageError = (e) => {
        const currentSrc = e.target.src;
        const fallbackIndex = fallbackThumbnails.findIndex(url => url === currentSrc);
        const nextFallback = fallbackThumbnails[fallbackIndex + 1] || PLACEHOLDER_IMG;
        if (currentSrc !== nextFallback) {
            e.target.src = nextFallback;
        }
    };

    return (
        <div className="bg-[#1E1E1E] rounded-xl overflow-hidden hover:bg-[#252525] transition-all border border-white/5 hover:border-cyan-500/30 group relative">
            <div className="relative aspect-video bg-black/50 cursor-pointer" onClick={() => onWatch(video)}>
                <img
                    src={video.image || video.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : PLACEHOLDER_IMG)}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    onError={handleImageError}
                    alt={video.title}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform shadow-xl">
                        <i className="ri-play-fill text-2xl text-white"></i>
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleSave(video); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70 backdrop-blur z-20"
                >
                    <i className={`${isSaved ? 'ri-heart-fill text-red-500' : 'ri-heart-line text-white'} text-lg`}></i>
                </button>
            </div>
            <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] uppercase font-bold flex items-center gap-1.5 ${badge.color} bg-white/5 px-2 py-0.5 rounded`}>
                        <i className={badge.icon}></i> {badge.name}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1"><i className="ri-eye-line"></i> {video.views}</span>
                </div>
                <h3 className="text-white font-bold text-sm leading-tight line-clamp-2 mt-1">{video.title}</h3>
                <p className="text-[10px] text-gray-400 mt-1 truncate">{video.source}</p>
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
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-cyan-500"></div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                            <i className="ri-lock-2-fill text-2xl text-purple-400"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Admin Access</h2>
                        <p className="text-gray-400 text-sm mt-1">Restricted Area. Please authenticate.</p>
                    </div>
                    {error && <div className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded border border-red-500/20"><i className="ri-error-warning-line mr-1"></i>{error}</div>}
                    <div className="space-y-4">
                        <input type="text" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} placeholder="Username" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-600" autoFocus />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-600" />
                        <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-purple-900/20">Unlock Dashboard</button>
                    </div>
                </form>
            </div>
        );
    }

    if (loading) return <div className="text-center py-20"><i className="ri-loader-4-line animate-spin text-4xl text-purple-500"></i></div>;

    const items = activeView === 'videos' ? content.videos : content.news;

    return (
        <div className="space-y-6 animate-fade-in p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-purple-400">
                    <i className="ri-shield-user-fill mr-2"></i>Content Moderation
                </h1>
                <div className="flex items-center gap-3 bg-[#15151A] p-1 rounded-lg border border-white/10">
                    <button onClick={() => setActiveView('videos')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'videos' ? 'bg-white/10 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Videos</button>
                    <button onClick={() => setActiveView('news')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeView === 'news' ? 'bg-white/10 text-white shadow' : 'text-gray-400 hover:text-white'}`}>News</button>
                </div>
            </div>

            <div className="bg-[#15151A] rounded-xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/2">
                    <h2 className="text-lg font-semibold text-white capitalize">{activeView} Database</h2>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{items.length} items</span>
                        <button onClick={() => { localStorage.removeItem('admin_token'); setToken(null); }} className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-2 py-1 rounded hover:bg-red-500/10">Logout</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-black/20 uppercase text-xs font-medium text-gray-500">
                            <tr>
                                <th className="p-4 w-24">Media</th>
                                <th className="p-4">Content Details</th>
                                <th className="p-4 w-32">Status</th>
                                <th className="p-4 w-24 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {items.map(item => (
                                <tr key={item.id} className="hover:bg-white/5 transition group">
                                    <td className="p-4 align-top">
                                        <div className="w-20 h-14 rounded-md overflow-hidden bg-white/5 relative">
                                            <img src={item.thumbnail || item.image} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="font-semibold text-white line-clamp-2 leading-tight mb-1" title={item.title}>{item.title}</div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{item.source || item.channel}</span>
                                            <span>• {new Date(item.timestamp * 1000).toLocaleDateString()}</span>
                                            {item.views && <span>• {item.views}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.is_approved ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_approved ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                            {item.is_approved ? 'Live' : 'Hidden'}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <button
                                            onClick={() => handleToggle(item.id, activeView === 'videos' ? 'video' : 'news', item.is_approved)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ml-auto ${item.is_approved ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white'}`}
                                            title={item.is_approved ? "Block Content" : "Approve Content"}
                                        >
                                            <i className={item.is_approved ? "ri-eye-off-line" : "ri-check-line"}></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-500 italic">No content found in this category.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Component: Super Admin Dashboard (Topic Control) ---
const SuperAdminDashboard = () => {
    const [token, setToken] = useState(localStorage.getItem('super_token'));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [topics, setTopics] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token) fetchTopics();
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
            } else {
                setError(data.error);
            }
        });
    };

    const fetchTopics = () => {
        setLoading(true);
        fetch('/api/superadmin/topics')
            .then(res => res.json())
            .then(data => {
                setTopics(data);
                setLoading(false);
            });
    };

    const toggleTopic = (topic, currentStatus) => {
        // Optimistic UI update
        setTopics(prev => ({ ...prev, [topic]: !currentStatus }));

        fetch('/api/superadmin/topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, status: !currentStatus })
        });
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center h-full animate-fade-in p-6 bg-[#0a0a0c]">
                <form onSubmit={handleLogin} className="bg-[#15151A] p-8 rounded-2xl border border-white/10 w-full max-w-md space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                            <i className="ri-shield-keyhole-fill text-2xl text-orange-400"></i>
                        </div>
                        <h2 className="2xl font-bold text-white">Super Admin</h2>
                        <p className="text-gray-400 text-sm mt-1">Manage platform content topics.</p>
                    </div>
                    {error && <div className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded border border-red-500/20"><i className="ri-error-warning-line mr-1"></i>{error}</div>}
                    <div className="space-y-4">
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none transition-all placeholder:text-gray-600" />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none transition-all placeholder:text-gray-600" />
                        <button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-orange-900/20">Access Control</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="p-8 h-full overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Topic Control</h1>
                    <p className="text-gray-400">Enable or disable content categories across the platform.</p>
                </div>
                <button onClick={() => { setToken(null); localStorage.removeItem('super_token'); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors">
                    Logout
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(topics).map(([topic, active]) => (
                    <div key={topic} className={`p-6 rounded-xl border transition-all ${active ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">{topic}</h3>
                            <button
                                onClick={() => toggleTopic(topic, active)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? 'bg-green-500' : 'bg-gray-600'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <p className={`text-sm ${active ? 'text-green-400' : 'text-red-400'}`}>
                            {active ? 'Active on Platform' : 'Disabled (Hidden)'}
                        </p>
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
    const [lang, setLang] = useState('en');
    const [activeTopics, setActiveTopics] = useState([]);

    // Fetch Active Topics
    useEffect(() => {
        fetch('/api/topics/active').then(r => r.json()).then(d => setActiveTopics(d.topics || []));
    }, []);

    // Helper for Dynamic Titles
    const getDynamicTitle = (baseTitle, type) => {
        if (!activeTopics || activeTopics.length === 0 || activeTopics.includes("Christianity") || activeTopics.includes("Christian")) return baseTitle;
        const rawTopic = activeTopics[0]; // Simple logic: take primary non-christian topic
        const topic = t(rawTopic) || rawTopic; // Translate

        if (type === 'news') {
            // Basic localized construction (Naive but works for Hi/Ta)
            if (lang === 'hi') return `${topic} समाचार फ़ीड`; // Topic News Feed
            if (lang === 'ta') return `${topic} செய்திகள்`;   // Topic News
            return `${topic} News Feed`;
        }
        if (type === 'video') {
            if (lang === 'hi') return `ट्रेंडिंग ${topic} वीडियो`;
            if (lang === 'ta') return `பிரபலமான ${topic} வீடியோக்கள்`;
            return `Trending ${topic} Videos`;
        }
        return baseTitle;
    };

    // Helper for Translation
    const t = (key) => TRANSLATIONS[lang][key] || key;

    // Search State
    const [query, setQuery] = useState("");
    const [savedItems, setSavedItems] = useState([]);
    const [liveNews, setLiveNews] = useState(null); // Start null to show loader
    const [liveVideos, setLiveVideos] = useState(null); // Start null to show loader
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(null); // Combined results for dashboard
    const [analyticsReport, setAnalyticsReport] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Separate search states for News and Videos tabs
    const [newsQuery, setNewsQuery] = useState("");
    const [videoQuery, setVideoQuery] = useState("");
    const [newsSearchResults, setNewsSearchResults] = useState(null);
    const [videoSearchResults, setVideoSearchResults] = useState(null);
    const [newsSearching, setNewsSearching] = useState(false);
    const [videoSearching, setVideoSearching] = useState(false);

    // Modal States
    const [readerUrl, setReaderUrl] = useState(null);
    const [activeVideo, setActiveVideo] = useState(null);
    const [legalOpen, setLegalOpen] = useState(false);

    // Suggestions Visibility State
    const [showMainSuggestions, setShowMainSuggestions] = useState(false);
    const [showNewsSuggestions, setShowNewsSuggestions] = useState(false);
    const [showVideoSuggestions, setShowVideoSuggestions] = useState(false);

    // Fetch News Function (useCallback for reuse)
    const fetchNews = useCallback(() => {
        fetch(`/api/news?lang=${lang}`).then(res => res.json()).then(data => {
            if (Array.isArray(data)) {
                const cleanData = data.map((item, idx) => ({ ...item, id: item.id || `news_${idx}` }));
                setLiveNews(prev => {
                    // Force update if language changed (simple logic: just update)
                    return cleanData;
                });
            } else {
                setLiveNews([]);
            }
        }).catch(err => {
            console.error("News fetch error:", err);
            setLiveNews([]);
        });
    }, [lang]);

    // Fetch Videos Function (useCallback for reuse)
    const fetchVideos = useCallback(() => {
        fetch(`/api/videos?lang=${lang}`).then(res => res.json()).then(data => {
            if (Array.isArray(data)) {
                const cleanVideos = data.map((item, idx) => ({ ...item, id: item.id || `vid_${idx}` }));
                setLiveVideos(prev => {
                    return cleanVideos;
                });
            } else {
                setLiveVideos([]);
            }
        }).catch(err => {
            console.error("Videos fetch error:", err);
            setLiveVideos([]);
        });
    }, [lang]);

    // Manual Refresh Handler
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Promise.all([fetchNews(), fetchVideos()]);
        setTimeout(() => setIsRefreshing(false), 500); // Brief delay for visual feedback
    }, [fetchNews, fetchVideos]);

    // Initial Load - Enforce Unique IDs + Auto-Refresh
    useEffect(() => {
        const saved = localStorage.getItem('gb_wishlist');
        if (saved) setSavedItems(JSON.parse(saved));

        // Initial fetch
        fetchNews();
        fetchVideos();

        // Auto-refresh every 60 seconds
        const newsInterval = setInterval(fetchNews, 60000);
        const videosInterval = setInterval(fetchVideos, 60000);

        // Cleanup on unmount
        return () => {
            clearInterval(newsInterval);
            clearInterval(videosInterval);
        };
    }, [fetchNews, fetchVideos]);

    const toggleSave = (item) => {
        let newItems;
        // Robust check: Match by ID (preferred) or URL
        // We use 'url' because that's our consistent key. 
        // Note: item from NewsFeeder has 'url', others might have 'link' if not standardized, check both.
        const itemUrl = item.url || item.link; // Ensure we get the URL

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
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice search is not supported in this browser.");
            return;
        }
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            // Visual feedback could go here (e.g. changing icon color)
            console.log("Voice Listening...");
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setQuery(transcript);
            handleSearch(null, transcript); // Trigger search immediately with transcript
        };

        recognition.onerror = (event) => { console.error("Voice Error", event); };
        recognition.start();
    };

    // Main Search - Fetches BOTH News and Videos for unified results
    const handleSearch = async (e, manualQuery = null) => {
        if (e) e.preventDefault();
        const q = manualQuery || query;
        if (!q.trim()) return;

        setLoading(true);
        setAnalyticsLoading(true);
        setActiveTab('dashboard');
        setSearchResults(null);
        setAnalyticsReport(null);

        try {
            // Fetch News and Videos concurrently
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

            // Combine and tag results
            const newsResults = (newsData.results || []).map((item, idx) => ({
                ...item,
                id: item.id || `news_${Date.now()}_${idx}`,
                result_type: 'news'
            }));
            const videoResults = (videoData.results || []).map((item, idx) => ({
                ...item,
                id: item.id || `video_${Date.now()}_${idx}`,
                result_type: 'video',
                source_type: 'youtube'
            }));

            // Interleave results for mixed display
            const combined = [];
            const maxLen = Math.max(newsResults.length, videoResults.length);
            for (let i = 0; i < maxLen; i++) {
                if (videoResults[i]) combined.push(videoResults[i]);
                if (newsResults[i]) combined.push(newsResults[i]);
            }

            setSearchResults(combined);

            // Fetch Analytics Report
            fetch('/api/analytics/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q, lang })
            })
                .then(res => res.json())
                .then(data => {
                    if (!data.error) {
                        setAnalyticsReport(data);
                    } else {
                        setAnalyticsReport({
                            title: "Analysis Failed",
                            insight: "We couldn't generate a report for this topic. Error: " + data.error,
                            data: [],
                            error: true
                        });
                    }
                    setAnalyticsLoading(false);
                })
                .catch(err => {
                    console.error("Analytics fetch failed", err);
                    setAnalyticsLoading(false);
                });

        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // News-specific search
    const handleNewsSearch = async (e, manualQuery = null) => {
        if (e) e.preventDefault();
        const q = manualQuery || newsQuery;
        if (!q.trim()) {
            setNewsSearchResults(null);
            return;
        }

        setNewsSearching(true);
        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: q, limit: 30, type: 'news', lang })
            });
            const data = await res.json();
            const results = (data.results || []).map((item, idx) => ({
                ...item,
                id: item.id || `news_search_${Date.now()}_${idx}`
            }));
            setNewsSearchResults(results);
        } catch (err) {
            console.error(err);
            setNewsSearchResults([]);
        }
        finally { setNewsSearching(false); }
    };

    // Video-specific search
    const handleVideoSearch = async (e, manualQuery = null) => {
        if (e) e.preventDefault();
        const q = manualQuery || videoQuery;
        if (!q.trim()) {
            setVideoSearchResults(null);
            return;
        }

        setVideoSearching(true);
        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: q, limit: 30, type: 'video', lang })
            });
            const data = await res.json();
            const results = (data.results || []).map((item, idx) => ({
                ...item,
                id: item.id || `video_search_${Date.now()}_${idx}`,
                source_type: 'youtube'
            }));
            setVideoSearchResults(results);
        } catch (err) {
            console.error(err);
            setVideoSearchResults([]);
        }
        finally { setVideoSearching(false); }
    };

    // Clear news search
    const clearNewsSearch = () => {
        setNewsQuery("");
        setNewsSearchResults(null);
    };

    // Clear video search
    const clearVideoSearch = () => {
        setVideoQuery("");
        setVideoSearchResults(null);
    };
    return (
        <div className="bg-[#0a0a12] text-white font-['Rajdhani'] h-screen flex flex-col md:flex-row overflow-hidden">
            <Sidebar
                activeTab={activeTab}
                onNavigate={(tab) => tab === 'legal' ? setLegalOpen(true) : setActiveTab(tab)} // Intercept 'legal' to open modal
                onLogout={onLogout}
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                lang={lang}
                setLang={setLang}
            />

            {/* Main Content Wrapper - No margin needed as Sidebar is relative on desktop */}
            <div className={`flex-1 flex flex-col h-full relative transition-all duration-300`}>
                <header className="shrink-0 bg-[#0a0a12]/95 backdrop-blur border-b border-white/5 h-[70px] flex items-center justify-between px-6 z-40">
                    <div className="flex items-center gap-4 w-full max-w-xl">
                        <div className="flex items-center mr-4 shrink-0">
                            <button className="text-gray-400 mr-2 md:hidden"><i className="ri-menu-line text-2xl"></i></button>

                            <div className="flex items-center gap-2">
                                <img src="/static/logo.png" alt="Logo" className="w-10 h-10 rounded-full" />
                                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">GyanBridge</span>
                            </div>
                        </div>
                        {/* Hide main search when on News or Videos tabs - they have their own search bars */}
                        {activeTab !== 'news' && activeTab !== 'videos' && (
                            <form onSubmit={handleSearch} className="flex-1 relative">
                                <i className="ri-search-line absolute left-3 top-2.5 text-gray-500"></i>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => { setQuery(e.target.value); setShowMainSuggestions(true); }}
                                    onFocus={() => setShowMainSuggestions(true)}
                                    placeholder="Search sermons, news..."
                                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-12 text-sm focus:border-purple-500 outline-none text-white transition-all"
                                />
                                <button type="button" onClick={handleVoiceSearch} className="absolute right-2 top-1.5 p-1 rounded-full bg-white/5 hover:bg-purple-600/50 text-gray-400 hover:text-white transition-all" title="Voice Search">
                                    <i className="ri-mic-fill"></i>
                                </button>
                                {showMainSuggestions && <SearchSuggestions query={query} type="web" onSelect={(s) => { setQuery(s); handleSearch(null, s); setShowMainSuggestions(false); }} onClose={() => setShowMainSuggestions(false)} />}
                            </form>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={() => setActiveTab('news')} className={`flex flex-col items-center group ${activeTab === 'news' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}><i className="ri-newspaper-fill text-xl"></i><span className="text-[10px] mt-0.5">News</span></button>
                        <button onClick={() => setActiveTab('videos')} className={`flex flex-col items-center group ${activeTab === 'videos' ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}><i className="ri-youtube-fill text-xl"></i><span className="text-[10px] mt-0.5">Videos</span></button>
                        <button onClick={() => setActiveTab('admin')} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold shadow-lg border border-white/20 hover:scale-110 transition-transform cursor-pointer" title="Admin Panel">
                            {user.charAt(0).toUpperCase()}
                        </button>
                        <button onClick={() => setActiveTab('superadmin')} className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-xs font-bold shadow-lg border border-white/20 hover:scale-110 transition-transform cursor-pointer" title="Super Admin">
                            <i className="ri-shield-star-fill"></i>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar relative">

                    {/* View: Dashboard (Mixed Feed) */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in pb-12">
                            {searchResults && (
                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                    <i className="ri-search-eye-line text-purple-500"></i> Results for "{query}"
                                </h1>
                            )}
                            {loading && <div className="text-center py-10"><i className="ri-loader-4-line animate-spin text-4xl text-purple-500"></i></div>}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {searchResults && searchResults.length > 0 ? (
                                    searchResults.map((item, idx) => (
                                        item.result_type === 'video' || item.source_type === 'youtube' ? (
                                            <VideoCard
                                                key={item.id || idx}
                                                video={item}
                                                onWatch={setActiveVideo}
                                                isSaved={!!savedItems.find(i => (item.id && i.id === item.id) || i.url === item.url)}
                                                onToggleSave={toggleSave}
                                            />
                                        ) : (
                                            <NewsCard
                                                key={item.id || idx}
                                                article={item}
                                                onRead={setReaderUrl}
                                                isSaved={!!savedItems.find(i => i.url === item.url)}
                                                onToggleSave={toggleSave}
                                            />
                                        )
                                    ))
                                ) : searchResults && searchResults.length === 0 ? (
                                    <div className="col-span-full text-center py-10 text-gray-500">
                                        {t('no_results')} for "{query}"
                                    </div>
                                ) : null}
                            </div>

                            {/* Default View (No Search Results) */}
                            {!searchResults && (
                                <div className="space-y-12">
                                    {/* Trending Videos Section */}
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                                    <i className="ri-fire-fill text-orange-500"></i> {getDynamicTitle(t('trending_title'), 'video')}
                                                </h2>
                                                <p className="text-gray-400 text-sm mt-1">{t('trending_desc')}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {liveVideos ? (
                                                liveVideos.length > 0 ? (
                                                    liveVideos.slice(0, 4).map(video => (
                                                        <VideoCard key={video.id} video={video} onWatch={setActiveVideo} isSaved={!!savedItems.find(i => (video.id && i.id === video.id) || i.url === video.url)} onToggleSave={toggleSave} />
                                                    ))
                                                ) : (
                                                    <div className="col-span-4 text-center py-10 text-gray-500">{t('no_results')}</div>
                                                )
                                            ) : (
                                                [...Array(4)].map((_, i) => (
                                                    <div key={i} className="animate-pulse bg-[#1E1E1E] rounded-xl h-64 border border-white/5"></div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* News Section */}
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                                    <i className="ri-global-line text-blue-500"></i> {getDynamicTitle(t('news_title'), 'news')}
                                                </h2>
                                                <p className="text-gray-400 text-sm mt-1">{t('news_desc')}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {liveNews ? (
                                                liveNews.length > 0 ? (
                                                    liveNews.slice(0, 4).map(article => (
                                                        <NewsCard key={article.id} article={article} onRead={setReaderUrl} isSaved={!!savedItems.find(i => (article.id && i.id === article.id) || i.url === article.url)} onToggleSave={toggleSave} />
                                                    ))
                                                ) : (
                                                    <div className="col-span-full text-center py-10 text-gray-500">{t('no_results')}</div>
                                                )
                                            ) : (
                                                [...Array(4)].map((_, i) => (
                                                    <div key={i} className="animate-pulse bg-[#1E1E1E] rounded-xl h-48 border border-white/5"></div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* View: News */}
                    {activeTab === 'news' && (
                        <div className="space-y-6 animate-fade-in pb-12">
                            <div className="bg-gradient-to-r from-purple-900/40 to-black p-6 rounded-2xl border border-white/10">
                                <h1 className="text-3xl font-bold text-white mb-2">{getDynamicTitle("Christian News Feed", "news")}</h1>
                                <p className="text-gray-400 mb-4">Updates from the Global Church.</p>

                                {/* News Search Bar */}
                                <form onSubmit={handleNewsSearch} className="relative max-w-xl">
                                    <i className="ri-search-line absolute left-3 top-3 text-gray-500"></i>
                                    <input
                                        type="text"
                                        value={newsQuery}
                                        onChange={(e) => { setNewsQuery(e.target.value); setShowNewsSuggestions(true); }}
                                        onFocus={() => setShowNewsSuggestions(true)}
                                        placeholder="Search news articles..."
                                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-20 text-sm focus:border-purple-500 outline-none text-white"
                                    />
                                    {newsQuery && (
                                        <button type="button" onClick={clearNewsSearch} className="absolute right-12 top-2 p-1 text-gray-400 hover:text-white">
                                            <i className="ri-close-line"></i>
                                        </button>
                                    )}
                                    <button type="submit" disabled={newsSearching} className="absolute right-2 top-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm font-medium disabled:opacity-50">
                                        {newsSearching ? <i className="ri-loader-4-line animate-spin"></i> : 'Search'}
                                    </button>
                                    {showNewsSuggestions && <SearchSuggestions query={newsQuery} type="news" onSelect={(s) => { setNewsQuery(s); handleNewsSearch(null, s); setShowNewsSuggestions(false); }} onClose={() => setShowNewsSuggestions(false)} />}
                                </form>
                            </div>

                            {newsSearchResults && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span>Found {newsSearchResults.length} results for "{newsQuery}"</span>
                                    <button onClick={clearNewsSearch} className="text-purple-400 hover:underline">Clear</button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {newsSearching ? (
                                    <div className="col-span-full text-center py-10"><i className="ri-loader-4-line animate-spin text-4xl text-purple-500"></i></div>
                                ) : newsSearchResults ? (
                                    newsSearchResults.length > 0 ? newsSearchResults.map((item, idx) => (
                                        <NewsCard key={item.id || idx} article={item} onRead={setReaderUrl} isSaved={!!savedItems.find(i => (item.id && i.id === item.id) || i.url === item.url)} onToggleSave={toggleSave} />
                                    )) : (
                                        <div className="col-span-full text-center py-10 text-gray-500">No news found for "{newsQuery}"</div>
                                    )
                                ) : liveNews === null ? (
                                    <div className="col-span-full text-center py-10"><i className="ri-loader-4-line animate-spin text-4xl text-purple-500"></i></div>
                                ) : (
                                    (liveNews.length > 0 ? liveNews : []).map((item, idx) => (
                                        <NewsCard key={item.id || idx} article={item} onRead={setReaderUrl} isSaved={!!savedItems.find(i => (item.id && i.id === item.id) || i.url === item.url)} onToggleSave={toggleSave} />
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* View: Admin Dashboard */}
                    {activeTab === 'admin' && <AdminDashboard />}

                    {/* View: Super Admin Dashboard */}
                    {activeTab === 'superadmin' && <SuperAdminDashboard />}

                    {/* View: Videos */}
                    {activeTab === 'videos' && (
                        <div className="space-y-6 animate-fade-in pb-12">
                            <div className="bg-gradient-to-r from-red-900/40 to-black p-6 rounded-2xl border border-white/10">
                                <h1 className="text-3xl font-bold text-white mb-2">{getDynamicTitle("Trending Gospel Videos", "video")}</h1>
                                <p className="text-gray-400 mb-4">Curated trending video content from YouTube.</p>

                                {/* Video Search Bar */}
                                <form onSubmit={handleVideoSearch} className="relative max-w-xl">
                                    <i className="ri-search-line absolute left-3 top-3 text-gray-500"></i>
                                    <input
                                        type="text"
                                        value={videoQuery}
                                        onChange={(e) => { setVideoQuery(e.target.value); setShowVideoSuggestions(true); }}
                                        onFocus={() => setShowVideoSuggestions(true)}
                                        placeholder="Search videos..."
                                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-20 text-sm focus:border-red-500 outline-none text-white"
                                    />
                                    {videoQuery && (
                                        <button type="button" onClick={clearVideoSearch} className="absolute right-12 top-2 p-1 text-gray-400 hover:text-white">
                                            <i className="ri-close-line"></i>
                                        </button>
                                    )}
                                    <button type="submit" disabled={videoSearching} className="absolute right-2 top-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-medium disabled:opacity-50">
                                        {videoSearching ? <i className="ri-loader-4-line animate-spin"></i> : 'Search'}
                                    </button>
                                    {showVideoSuggestions && <SearchSuggestions query={videoQuery} type="video" onSelect={(s) => { setVideoQuery(s); handleVideoSearch(null, s); setShowVideoSuggestions(false); }} onClose={() => setShowVideoSuggestions(false)} />}
                                </form>
                            </div>

                            {videoSearchResults && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span>Found {videoSearchResults.length} results for "{videoQuery}"</span>
                                    <button onClick={clearVideoSearch} className="text-red-400 hover:underline">Clear</button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {videoSearching ? (
                                    <div className="col-span-full text-center py-10"><i className="ri-loader-4-line animate-spin text-4xl text-red-500"></i></div>
                                ) : videoSearchResults ? (
                                    videoSearchResults.length > 0 ? videoSearchResults.map((video, idx) => (
                                        <VideoCard
                                            key={video.id || idx}
                                            video={video}
                                            onWatch={setActiveVideo}
                                            isSaved={!!savedItems.find(i => (video.id && i.id === video.id) || i.url === video.url)}
                                            onToggleSave={toggleSave}
                                        />
                                    )) : (
                                        <div className="col-span-full text-center py-10 text-gray-500">No videos found for "{videoQuery}"</div>
                                    )
                                ) : liveVideos === null ? (
                                    <div className="col-span-full text-center py-10"><i className="ri-loader-4-line animate-spin text-4xl text-red-500"></i></div>
                                ) : (
                                    (liveVideos.length > 0 ? liveVideos : []).map((video, idx) => (
                                        <VideoCard
                                            key={video.id || idx}
                                            video={video}
                                            onWatch={setActiveVideo}
                                            isSaved={!!savedItems.find(i => (video.id && i.id === video.id) || i.url === video.url)}
                                            onToggleSave={toggleSave}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}


                    {/* View: Saved */}
                    {activeTab === 'saved' && (
                        <div className="space-y-8 animate-fade-in pb-12">
                            <h1 className="text-2xl font-bold flex items-center gap-2"><i className="ri-heart-fill text-red-500"></i> My Wishlist</h1>
                            {savedItems.length === 0 ? <p className="text-center text-gray-500 py-10">Wishlist empty.</p> : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {savedItems.map((item) => (
                                        item.source_type ? <VideoCard key={item.id} video={item} onWatch={setActiveVideo} isSaved={true} onToggleSave={toggleSave} /> : <NewsCard key={item.id} article={item} onRead={setReaderUrl} isSaved={true} onToggleSave={toggleSave} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* View: Analytics (Visual Reports) */}
                    {/* View: Analytics (Visual Reports) */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-8 animate-fade-in pb-12 max-w-6xl mx-auto">
                            <h1 className="text-2xl font-bold flex items-center gap-2 mb-6"><i className="ri-bar-chart-2-fill text-cyan-400"></i> Search Insight Reports</h1>

                            {analyticsLoading && (
                                <div className="text-center py-10">
                                    <i className="ri-loader-4-line animate-spin text-4xl text-purple-500"></i>
                                    <p className="text-gray-400 mt-2">Generating report for "{query}"...</p>
                                </div>
                            )}

                            {analyticsReport && !analyticsLoading ? (
                                <div className="bg-[#1A1A1A] p-8 rounded-2xl border border-white/10 mb-8 animate-fade-in relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10"><i className="ri-brain-line text-9xl text-cyan-500"></i></div>
                                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mb-2">{analyticsReport.title}</h2>
                                    <p className="text-gray-300 text-lg mb-6 leading-relaxed max-w-3xl">{analyticsReport.insight}</p>

                                    {/* Dynamic Chart Rendering */}
                                    {analyticsReport.data && analyticsReport.data.length > 0 && (
                                        <div className="mt-8 h-64 w-full flex items-end gap-4 p-4 border-l border-b border-white/10 relative">
                                            {analyticsReport.data.map((point, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center justify-end group h-full relative">
                                                    <div
                                                        className="w-full max-w-[60px] bg-gradient-to-t from-cyan-600 to-purple-500 rounded-t hover:opacity-100 opacity-80 transition-all relative"
                                                        style={{ height: `${Math.min(100, (point.y / 10) * 100)}%` }}
                                                    >
                                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-cyan-300 opacity-0 group-hover:opacity-100 transition">{point.y}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 mt-2 rotate-0 truncate w-full text-center">{point.x}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-4 flex justify-between text-xs text-gray-500">
                                        <span>{analyticsReport.xaxis_label || 'Timeline'}</span>
                                        <span>{analyticsReport.yaxis_label || 'Intensity / Volume'}</span>
                                    </div>
                                </div>
                            ) : (
                                !analyticsLoading && (
                                    <div className="p-8 text-center border-dashed border-2 border-white/10 rounded-2xl mb-8">
                                        <p className="text-gray-500">Search for a topic (e.g., "Church Growth") to generate a real-time analytic report.</p>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </main >
            </div >

            {/* Overlays */}
            {readerUrl && <ReaderModal url={readerUrl.url} topic={readerUrl.title} onClose={() => setReaderUrl(null)} />}
            {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
            {/* Legal Assistant Modal */}
            {legalOpen && <LegalAssistantModal onClose={() => setLegalOpen(false)} lang={lang} />}
        </div >
    );
};

// --- Root Application ---
const GyanBridgeApp = () => {
    // Initialize user from localStorage for session persistence
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('gb_user');
        return savedUser || null;
    });

    // Handle login - save to localStorage
    const handleLogin = (username) => {
        localStorage.setItem('gb_user', username);
        setUser(username);
    };

    // Handle logout - clear localStorage
    const handleLogout = () => {
        localStorage.removeItem('gb_user');
        setUser(null);
    };

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 20px; }
        `;
        document.head.appendChild(style);
    }, []);

    return (
        <>
            {!user ? <LoginEntry onLogin={handleLogin} /> : <DashboardLayout user={user} onLogout={handleLogout} />}
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<GyanBridgeApp />);
