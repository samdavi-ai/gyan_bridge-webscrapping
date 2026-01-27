import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SmartGlassTranscript from './SmartGlassTranscript';
import CitationSidebar from './CitationSidebar';
import VoiceEngine from '../utils/VoiceEngine';
import { useAuth } from '../context/AuthContext';

const LegalAssistantModal = ({ onClose }) => {
    const { t, i18n } = useTranslation();
    const { getLegalConversations, createLegalConversation, getLegalMessages, addLegalMessage } = useAuth();

    // Core Chat State
    const [messages, setMessages] = useState([
        { role: 'assistant', content: t('legal_intro', { defaultValue: "I am your AI Legal Assistant for minority rights in India." }) }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Conversation History State
    const [conversations, setConversations] = useState([]);
    const [currentConvId, setCurrentConvId] = useState(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(true);

    // Voice & UI State
    const [voiceMode, setVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [readingMessageIndex, setReadingMessageIndex] = useState(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [showCitationSidebar, setShowCitationSidebar] = useState(false);
    const [currentCitations, setCurrentCitations] = useState({ acts: [], procedures: [] });
    const [isMaximized, setIsMaximized] = useState(false);

    // Refs
    const voiceModeRef = useRef(false);
    const isListeningRef = useRef(false);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const validAudioRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const voiceEngine = useRef(null);

    useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
    useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

    useEffect(() => {
        voiceEngine.current = new VoiceEngine(i18n);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }

        // Fetch History on Mount
        fetchHistory();
    }, [i18n]);

    const fetchHistory = async () => {
        const history = await getLegalConversations();
        setConversations(history || []);
    };

    const loadConversation = async (convId) => {
        if (convId === currentConvId) return;
        setLoading(true);
        try {
            const msgs = await getLegalMessages(convId);
            const formatted = msgs.map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.message
            }));

            // Should prompt be included? Maybe check length.
            if (formatted.length === 0) {
                formatted.push({ role: 'assistant', content: t('legal_intro') });
            }

            setMessages(formatted);
            setCurrentConvId(convId);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setCurrentConvId(null);
        setMessages([{ role: 'assistant', content: t('legal_intro') }]);
    };

    const stopAudio = () => {
        if (validAudioRef.current) {
            validAudioRef.current.onended = null;
            validAudioRef.current.pause();
            validAudioRef.current.currentTime = 0;
            validAudioRef.current = null;
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        clearTimeout(silenceTimerRef.current);
        setIsListening(false);
        setIsPlaying(false);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => { return () => stopAudio(); }, []);
    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSend = async (overrideText = null) => {
        const textToSend = typeof overrideText === 'string' ? overrideText : input;
        if (!textToSend || !textToSend.trim()) return;

        stopAudio();
        const userMsg = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // 1. Ensure Conversation Exists
            let convId = currentConvId;
            if (!convId) {
                // Create new conversation
                const title = textToSend.substring(0, 30) + (textToSend.length > 30 ? '...' : '');
                const newConv = await createLegalConversation(title);
                if (newConv) {
                    convId = newConv.id;
                    setCurrentConvId(convId);
                    setConversations(prev => [newConv, ...prev]);
                }
            }

            // 2. Save User Message
            if (convId) {
                await addLegalMessage(convId, 'user', textToSend);
            }

            // 3. Get AI Response
            const r = await fetch('/api/legal/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userMsg.content,
                    lang: i18n.language,
                    generate_audio: false
                })
            });

            if (!r.ok) throw new Error("Legal service unavailable");
            const data = await r.json();

            let content = data.answer || "I couldn't find specific legal information on that.";

            if (content.includes('[UI:SHOW_CITATION_CARD]')) {
                setShowCitationSidebar(true);
                setCurrentCitations({ acts: data.acts || [], procedures: data.procedures || [] });
                content = content.replace('[UI:SHOW_CITATION_CARD]', '');
            }
            content = content.replace(/\[UI:[A-Z_]+\]/g, '').trim();

            if (data.acts?.length > 0) content += "\n\n**Relevant Acts:**\n" + data.acts.map(a => `- [${a.title}](${a.url})`).join('\n');
            if (data.news?.length > 0) content += "\n\n**Related News:**\n" + data.news.map(n => `- [${n.title}](${n.url})`).join('\n');

            const aiMsg = { role: 'assistant', content };
            setMessages(prev => [...prev, aiMsg]);

            // 4. Save AI Message
            if (convId) {
                await addLegalMessage(convId, 'ai', content);
            }

        } catch (err) {
            console.error("Legal Error:", err);
            setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleReadAloud = async (messageContent, messageIndex) => {
        if (validAudioRef.current) {
            validAudioRef.current.pause();
            validAudioRef.current.currentTime = 0;
            validAudioRef.current = null;
        }
        setReadingMessageIndex(null);

        try {
            setReadingMessageIndex(messageIndex);
            const response = await fetch('/api/legal/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: messageContent, lang: i18n.language, generate_audio: true })
            });

            if (!response.ok) throw new Error('TTS generation failed');
            const data = await response.json();

            if (data.audio_base64) {
                const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
                validAudioRef.current = audio;
                audio.play();
                audio.onended = () => {
                    validAudioRef.current = null;
                    setReadingMessageIndex(null);
                };
            }
        } catch (error) {
            console.error('Read Aloud Error:', error);
            setReadingMessageIndex(null);
        }
    };

    const toggleVoice = () => {
        if (!('webkitSpeechRecognition' in window)) return alert("Voice recognition not supported.");

        if (isListening) {
            stopAudio();
        } else {
            const greeting = new SpeechSynthesisUtterance("I'm listening...");
            greeting.lang = 'en-US';
            window.speechSynthesis.speak(greeting);

            const recognition = new window.webkitSpeechRecognition();
            recognition.lang = i18n.language === 'hi' ? 'hi-IN' : (i18n.language === 'ta' ? 'ta-IN' : 'en-US');
            recognition.continuous = false;
            recognition.interimResults = true;

            recognition.onstart = () => { setIsListening(true); setVoiceMode(true); };
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (e) => {
                const t = Array.from(e.results).map(r => r[0].transcript).join('');
                setInput(t);
                if (!e.results[0].isFinal) setInterimTranscript(t);
                else setInterimTranscript('');
            };

            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
            <div className={`${isMaximized ? 'w-screen h-screen rounded-none' : 'w-full max-w-6xl h-[85vh] rounded-3xl'} bg-[#101014] border border-white/10 shadow-2xl flex overflow-hidden relative transition-all duration-300`}>

                {/* History Sidebar */}
                <div className={`${isHistoryOpen ? 'w-64' : 'w-0'} bg-[#15151A] border-r border-white/10 transition-all duration-300 flex flex-col overflow-hidden`}>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#15151A]">
                        <span className="font-bold text-gray-400 text-sm uppercase tracking-wider">History</span>
                        <button onClick={handleNewChat} className="p-2 hover:bg-white/10 rounded-lg text-purple-400 hover:text-white" title="New Chat">
                            <i className="ri-add-line text-lg"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {conversations.map(c => (
                            <button
                                key={c.id}
                                onClick={() => loadConversation(c.id)}
                                className={`w-full text-left p-3 rounded-lg text-sm truncate transition-colors ${currentConvId === c.id ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {c.title}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full min-w-0 relative">

                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#15151A]/80 backdrop-blur z-20">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                                <i className={`ri-side-bar-${isHistoryOpen ? 'fill' : 'line'} text-xl`}></i>
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
                                <i className="ri-scales-3-fill text-xl text-white"></i>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white leading-none mb-1">{t('legal_assistant')}</h2>
                                <p className="text-xs text-gray-400">AI Powered Constitutional Guide</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsMaximized(!isMaximized)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white">
                                <i className={`ri-${isMaximized ? 'fullscreen-exit' : 'fullscreen'}-line text-xl`}></i>
                            </button>
                            <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white">
                                <i className="ri-close-line text-2xl"></i>
                            </button>
                        </div>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 bg-[#0A0A0C] p-6 overflow-y-auto custom-scrollbar relative">
                        <div className="max-w-3xl mx-auto space-y-6 pb-24">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in group`}>
                                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold shadow-lg ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                        {msg.role === 'user' ? 'U' : 'AI'}
                                    </div>
                                    <div className={`max-w-[85%] relative p-4 rounded-2xl shadow-md border border-white/5 ${msg.role === 'user' ? 'bg-blue-600/10 rounded-tr-none text-right' : 'bg-[#15151A] rounded-tl-none text-left'}`}>
                                        <div className="text-gray-200 leading-relaxed text-sm whitespace-pre-wrap markdown-content">
                                            {msg.content.split('\n').map((line, i) => (
                                                <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{
                                                    __html: line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-400 hover:underline">$1</a>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                }}></p>
                                            ))}
                                        </div>
                                        {msg.role === 'assistant' && (
                                            <button
                                                onClick={() => readingMessageIndex === idx ? stopAudio() : handleReadAloud(msg.content, idx)}
                                                className={`absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-full hover:bg-white/10 ${readingMessageIndex === idx ? 'text-blue-400 opacity-100' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                <i className={readingMessageIndex === idx ? "ri-stop-circle-line animate-pulse" : "ri-volume-up-line"}></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-8 h-8 rounded-lg bg-purple-600/50 flex-shrink-0"></div>
                                    <div className="bg-[#15151A] p-4 rounded-2xl rounded-tl-none border border-white/5 w-24 flex gap-1 justify-center">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-[#15151A] border-t border-white/10 absolute bottom-0 w-full z-30">
                        <div className="max-w-3xl mx-auto relative flex items-center gap-3">
                            <div className="relative flex-1">
                                <textarea
                                    className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl pl-5 pr-12 py-4 text-white focus:border-purple-500 outline-none shadow-inner transition-colors resize-none"
                                    rows="1"
                                    placeholder={t('legal_placeholder')}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                />
                                <button onClick={toggleVoice} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    <i className={`ri-mic-${isListening ? 'fill' : 'line'} text-lg`}></i>
                                </button>
                            </div>
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || loading}
                                className={`h-14 w-14 rounded-2xl flex items-center justify-center transition shadow-lg ${!input.trim() || loading ? 'bg-gray-700 cursor-not-allowed text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-600/20'}`}
                            >
                                <i className="ri-send-plane-fill text-xl"></i>
                            </button>
                        </div>
                    </div>

                    {/* Overlays */}
                    <SmartGlassTranscript text={interimTranscript} isVisible={isListening && interimTranscript.length > 0} />
                    <CitationSidebar isOpen={showCitationSidebar} acts={currentCitations.acts} procedures={currentCitations.procedures} onClose={() => setShowCitationSidebar(false)} />
                </div>

            </div>
        </div>
    );
};

export default LegalAssistantModal;
