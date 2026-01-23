import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const LegalAssistantModal = ({ onClose }) => {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState([
        { role: 'assistant', content: t('legal_intro', { defaultValue: "I am your AI Legal Assistant for minority rights in India." }) }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [voiceMode, setVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Update intro message if it's still the default one when language changes
        setMessages(prev => {
            if (prev.length === 1 && (prev[0].content === t('legal_intro') || prev[0].content.includes('AI Legal Assistant'))) {
                return [{ role: 'assistant', content: t('legal_intro') }];
            }
            return prev;
        });
    }, [i18n.language, t]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: userMsg.content,
                type: 'legal',
                lang: i18n.language
            })
        })
            .then(async r => {
                if (!r.ok) throw new Error("Legal service unavailable");
                return r.json();
            })
            .then(data => {
                let content = data.answer || "I couldn't find specific legal information on that.";

                // Format structured data if available
                if (data.acts && data.acts.length > 0) {
                    content += "\n\n**Relevant Acts:**\n" + data.acts.map(a => `- [${a.title}](${a.url})`).join('\n');
                }
                if (data.news && data.news.length > 0) {
                    content += "\n\n**Related News:**\n" + data.news.map(n => `- [${n.title}](${n.url})`).join('\n');
                }

                const aiMsg = { role: 'assistant', content: content };
                setMessages(prev => [...prev, aiMsg]);

                if (data.audio_base64) {
                    const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
                    audio.play().catch(e => console.log("Audio Play Error:", e));
                }
            })
            .catch(err => {
                console.error("Legal Error:", err);
                setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error. Please try again." }]);
            })
            .finally(() => setLoading(false));
    };

    const toggleVoice = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice recognition not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = i18n.language === 'hi' ? 'hi-IN' : (i18n.language === 'ta' ? 'ta-IN' : 'en-US');
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            setVoiceMode(true);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + (prev ? " " : "") + transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-4xl h-[85vh] bg-[#101014] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#15151A]/80 backdrop-blur">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
                            <i className="ri-scales-3-fill text-2xl text-white"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-none mb-1">{t('legal_assistant')}</h2>
                            <p className="text-sm text-gray-400">AI Powered Constitutional Guide</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleVoice}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition font-medium text-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                        >
                            <i className={`ri-mic-${isListening ? 'fill' : 'line'}`}></i>
                            {isListening ? t('listening') : t('voice_mode')}
                        </button>
                        <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition">
                            <i className="ri-close-line text-2xl text-gray-400"></i>
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-[#0A0A0C] p-6 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
                                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold shadow-lg ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                    {msg.role === 'user' ? 'U' : 'AI'}
                                </div>
                                <div className={`max-w-[85%] p-5 rounded-2xl shadow-md border border-white/5 ${msg.role === 'user' ? 'bg-blue-600/10 rounded-tr-none text-right' : 'bg-[#15151A] rounded-tl-none text-left'}`}>
                                    <div className="text-gray-200 leading-relaxed text-base whitespace-pre-wrap markdown-content">
                                        {msg.content.split('\n').map((line, i) => (
                                            <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{
                                                // Basic markdown-like link parsing
                                                __html: line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-400 hover:underline">$1</a>')
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            }}></p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-4 animate-pulse">
                                <div className="w-10 h-10 rounded-xl bg-purple-600/50 flex-shrink-0"></div>
                                <div className="bg-[#15151A] p-5 rounded-2xl rounded-tl-none border border-white/5 w-24">
                                    <div className="flex gap-1 justify-center">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-6 bg-[#15151A] border-t border-white/10">
                    <div className="max-w-3xl mx-auto relative flex items-center gap-3">
                        <div className="relative flex-1">
                            <textarea
                                className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl pl-5 pr-12 py-4 text-white focus:border-purple-500 outline-none shadow-inner transition-colors resize-none"
                                rows="1"
                                placeholder={t('legal_placeholder') || "Ask a legal question..."}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <button
                                onClick={toggleVoice}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <i className={`ri-mic-${isListening ? 'fill' : 'line'} text-lg`}></i>
                            </button>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className={`h-14 w-14 rounded-2xl flex items-center justify-center transition shadow-lg ${!input.trim() || loading ? 'bg-gray-700 cursor-not-allowed text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-600/20'}`}
                        >
                            <i className="ri-send-plane-fill text-xl"></i>
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-3">{t('legal_disclaimer')}</p>
                </div>
            </div>
        </div>
    );
};

export default LegalAssistantModal;
