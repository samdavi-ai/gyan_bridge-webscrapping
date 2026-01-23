
import { useTranslation } from '../hooks/useTranslation.js';
const { useState, useEffect, useRef } = React;

const LegalAssistantModal = ({ onClose, lang }) => {
    const t = useTranslation(lang);
    const [messages, setMessages] = useState([{ role: 'assistant', content: t('legal_intro') }]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [voiceMode, setVoiceMode] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [agentState, setAgentState] = useState('disconnected'); // disconnected, connecting, listening, speaking
    const [isSpeaking, setIsSpeaking] = useState(false);
    const messagesEndRef = useRef(null);

    // LiveKit References
    const roomRef = useRef(null);
    const audioTrackRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (roomRef.current) {
                roomRef.current.disconnect();
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    const toggleVoiceMode = async () => {
        if (voiceMode) {
            // Disconnect
            if (roomRef.current) {
                roomRef.current.disconnect();
                roomRef.current = null;
            }
            setVoiceMode(false);
            setAgentState('disconnected');
            return;
        }

        // Connect
        setIsConnecting(true);
        try {
            // Get Token
            const res = await fetch(`/api/livekit/token?room=legal-session-${Date.now()}&lang=${lang}`);
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            const room = new window.LivekitClient.Room({
                adaptiveStream: true,
                dynacast: true,
            });

            roomRef.current = room;

            // Event Listeners
            room.on(window.LivekitClient.RoomEvent.Connected, () => {
                setAgentState('listening');
                setIsConnecting(false);
                setVoiceMode(true);
            });

            room.on(window.LivekitClient.RoomEvent.Disconnected, () => {
                setAgentState('disconnected');
                setVoiceMode(false);
            });

            room.on(window.LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === window.LivekitClient.Track.Kind.Audio) {
                    audioTrackRef.current = track;
                    const element = track.attach();
                    document.body.appendChild(element);
                    setAgentState('speaking');
                }
            });

            room.on(window.LivekitClient.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                track.detach().forEach(el => el.remove());
                setAgentState('listening');
            });

            room.on(window.LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
                if (speakers.length > 0) {
                    // Check if agent is speaking? 
                    // Simplified: If any remote speaker, assume agent
                    const isAgent = speakers.some(s => s.identity !== room.localParticipant.identity);
                    if (isAgent) setAgentState('speaking');
                    else setAgentState('listening');
                } else {
                    setAgentState('listening');
                }
            });

            await room.connect(data.url, data.token);
            console.log("Connected to LiveKit Room:", room.name);

            // Publish Local Mic
            await room.localParticipant.enableMicrophone(true);

        } catch (err) {
            console.error("LiveKit Connect Error:", err);
            alert("Could not connect to Voice Assistant. Please try again.");
            setIsConnecting(false);
        }
    };

    const speakText = (text) => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        // Use Server-side High Quality TTS (OpenAI/LiveKit)
        setIsSpeaking(true);
        fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        })
            .then(res => res.blob())
            .then(blob => {
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);
                audio.onended = () => setIsSpeaking(false);
                audio.play();
            })
            .catch(err => {
                console.error("TTS Error:", err);
                setIsSpeaking(false);
                // Fallback to browser
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
                window.speechSynthesis.speak(utterance);
            });
    };

    const handleVoiceSearch = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice search is not supported in this browser.");
            return;
        }
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
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
                            <h3 className="text-white font-bold text-xl tracking-wide font-['Rajdhani']">{t('legal')}</h3>
                            <p className="text-sm text-gray-400 font-medium tracking-wide">{t('constitutional_guide')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* LiveKit Voice Toggle */}
                        <button
                            onClick={toggleVoiceMode}
                            disabled={isConnecting}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${voiceMode
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 animate-pulse'
                                : 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white border border-white/20 hover:scale-105'
                                }`}
                        >
                            {isConnecting ? (
                                <i className="ri-loader-4-line animate-spin text-lg"></i>
                            ) : (
                                <i className={`ri-${voiceMode ? 'mic-off-line' : 'mic-fill'} text-lg`}></i>
                            )}
                            {voiceMode ? 'End Call' : 'Voice Mode'}
                        </button>

                        <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-full transition-colors group">
                            <i className="ri-close-line text-2xl text-gray-400 group-hover:text-white"></i>
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gradient-to-b from-[#0f0f12] to-[#0a0a0c] relative">
                    {/* Voice Mode Overlay */}
                    {voiceMode && (
                        <div className="sticky top-0 z-20 w-full mb-6">
                            <div className={`w-full p-4 rounded-xl border backdrop-blur-xl flex items-center justify-between transition-all duration-500 ${agentState === 'speaking'
                                ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                                : 'bg-black/40 border-white/10'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${agentState === 'disconnected' ? 'bg-red-500' : 'bg-green-500'} shadow-[0_0_10px_currentColor]`}></div>
                                    <span className="text-sm font-medium text-gray-300 uppercase tracking-widest">
                                        {agentState === 'speaking' ? 'Agent Speaking...' : agentState === 'listening' ? 'Listening...' : 'Connected'}
                                    </span>
                                </div>
                                <div className="flex gap-1 items-center h-6">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i}
                                            className={`w-1 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-full transition-all duration-100 ${agentState === 'speaking' ? 'animate-pulse' : 'h-1 opacity-20'
                                                }`}
                                            style={{ height: agentState === 'speaking' ? `${Math.random() * 24 + 4}px` : '4px' }}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-4'}`}>

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
                                            <div className="prose prose-invert prose-lg max-w-none leading-relaxed text-gray-200"
                                                dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(msg.content) : msg.content }}>
                                            </div>

                                            <button
                                                onClick={() => speakText(msg.content)}
                                                className={`mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${isSpeaking ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                            >
                                                <i className={`ri-${isSpeaking ? 'stop-circle-line' : 'volume-up-line'} text-lg`}></i>
                                                {isSpeaking ? 'Stop Reading' : t('read_aloud')}
                                            </button>

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
                                        <span>{t('verified_ai_response')}</span>
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
                                placeholder={t('legal_placeholder')}
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
                        {t('legal_disclaimer')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LegalAssistantModal;
