
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const SearchSuggestions = ({ query, type, onSelect, onClose, setQuery }) => {
    const { t } = useTranslation();
    const [suggestions, setSuggestions] = useState([]);
    const [history, setHistory] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef(null);
    const recognitionRef = useRef(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US'; // Default to English, could be dynamic

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (setQuery) {
                    setQuery(transcript);
                    // Optionally auto-search
                    // onSelect(transcript); 
                }
            };
            recognitionRef.current = recognition;
        }
    }, [setQuery]);

    const toggleVoice = () => {
        if (!recognitionRef.current) {
            alert("Voice search not supported in this browser.");
            return;
        }
        if (isListening) recognitionRef.current.stop();
        else recognitionRef.current.start();
    };

    // Load History
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('gb_search_history') || '[]');
        setHistory(saved);
    }, []);

    // Fetch Suggestions
    useEffect(() => {
        if (!query) {
            // Show history if query is empty
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(() => {
            fetch(`/api/suggestions?q=${encodeURIComponent(query)}&type=${type}`)
                .then(res => res.json())
                .then(data => { if (Array.isArray(data)) setSuggestions(data); })
                .catch(err => console.error(err));
        }, 300);
        return () => clearTimeout(timer);
    }, [query, type]);

    // Handle Click Outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) { onClose(); }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleSelect = (text) => {
        // Save to History
        const newHistory = [text, ...history.filter(h => h !== text)].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('gb_search_history', JSON.stringify(newHistory));

        // Call parent onSelect with the search text
        onSelect(text);

        // Clear suggestions by resetting internal state
        setSuggestions([]);

        // Call onClose if provided
        if (onClose) onClose();
    };

    const clearHistory = (e) => {
        e.stopPropagation();
        setHistory([]);
        localStorage.removeItem('gb_search_history');
    };

    // Render Logic
    const showHistory = isFocused && !query && history.length > 0;
    const showSuggestions = isFocused && query && suggestions.length > 0;

    // We render the wrapper to include the mic button in the parent input context often, 
    // but here we are just the detailed dropdown. 
    // WAIT: The user wants a "common search bar". 
    // If this component is JUST the suggestions drop down, the Voice Button should probably be passed INTO the Input component
    // OR this component should render the Input + Suggestions.
    // Looking at previous usage: <SearchSuggestions onSearch={handleSearch} /> in DashboardLayout implies it MIGHT be the whole bar.
    // Let's check previous DashboardLayout... 
    // usage was: <SearchSuggestions onSearch={handleSearch} /> WITHOUT query prop?
    // Checking file... 
    // Previous file: `const SearchSuggestions = ({ query, type, onSelect, onClose }) => {`
    // Wait, DashboardLayout used: `<SearchSuggestions onSearch={handleSearch} />` 
    // THIS IS A MISMATCH. I need to make this component Self-Contained (Input + Dropdown) to be robust.

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full bg-[#0A0A0C] border border-white/10 rounded-full px-5 py-3 pr-12 text-white focus:border-purple-500 outline-none shadow-inner transition-all"
                    placeholder={t('search_placeholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 300)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && query.trim()) {
                            e.preventDefault();
                            handleSelect(query.trim());
                        }
                    }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {query && query.trim() && (
                        <button
                            onClick={() => handleSelect(query.trim())}
                            className="p-2 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 hover:text-white transition-colors"
                            title={t('search')}
                        >
                            <i className="ri-search-line"></i>
                        </button>
                    )}
                    <button
                        onClick={toggleVoice}
                        className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white'}`}
                        title="Voice Search"
                    >
                        <i className={`ri-mic-${isListening ? 'fill' : 'line'}`}></i>
                    </button>
                    {query && (
                        <button onClick={() => setQuery('')} className="text-gray-500 hover:text-white">
                            <i className="ri-close-line"></i>
                        </button>
                    )}
                </div>
            </div>

            {(showHistory || showSuggestions) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                    {showHistory && (
                        <div>
                            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between items-center">
                                <span>Recent Searches</span>
                                <button onClick={clearHistory} className="hover:text-red-400">Clear</button>
                            </div>
                            {history.map((h, i) => (
                                <div key={i} onMouseDown={() => handleSelect(h)} className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 text-gray-300 border-b border-white/5 last:border-0 transition-colors">
                                    <i className="ri-history-line text-gray-500"></i>
                                    <span>{h}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {showSuggestions && (
                        <div>
                            {showHistory && <div className="border-t border-white/10 my-1"></div>}
                            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Suggestions</div>
                            {suggestions.map((s, i) => (
                                <div key={i} onMouseDown={() => handleSelect(s)} className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 text-gray-300 border-b border-white/5 last:border-0 transition-colors">
                                    <i className="ri-search-line text-gray-500"></i>
                                    <span dangerouslySetInnerHTML={{ __html: s.replace(new RegExp(`(${query})`, 'gi'), '<span class="text-white font-bold">$1</span>') }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchSuggestions;
