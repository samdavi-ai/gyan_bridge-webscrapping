
const { useState, useEffect, useRef } = React;

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
        <div ref={wrapperRef} className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
            {suggestions.map((s, i) => (
                <div
                    key={i}
                    onClick={() => { onSelect(s); onClose(); }}
                    className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 text-gray-300 transition-colors border-b border-white/5 last:border-0"
                >
                    <i className="ri-search-line text-gray-500"></i>
                    <spandangerouslySetInnerHTML={{ __html: s.replace(new RegExp(`(${query})`, 'gi'), '<span class="text-white font-bold">$1</span>') }} />
                </div>
            ))}
        </div>
    );
};

export default SearchSuggestions;
