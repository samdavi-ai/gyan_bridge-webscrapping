import React from 'react';

/**
 * Citation Sidebar - Sliding drawer for legal act citations
 * Triggered by [UI:SHOW_CITATION_CARD] token in AI responses
 */
const CitationSidebar = ({ isOpen, acts, procedures, onClose }) => {
    const allCitations = [
        ...(acts || []).map(item => ({ ...item, type: 'act' })),
        ...(procedures || []).map(item => ({ ...item, type: 'procedure' }))
    ];

    if (!isOpen || allCitations.length === 0) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={`fixed right-0 top-0 h-full w-96 bg-[#15151A] border-l border-white/10 shadow-2xl transform transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#15151A] z-10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <i className="ri-file-list-3-line text-purple-500"></i>
                        Legal Citations
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                    >
                        <i className="ri-close-line text-xl"></i>
                    </button>
                </div>

                {/* Citations List */}
                <div className="overflow-y-auto h-[calc(100%-80px)] p-6 space-y-4 custom-scrollbar">
                    {allCitations.map((citation, idx) => (
                        <div
                            key={idx}
                            className="bg-[#0A0A0C] border border-white/5 rounded-xl p-4 hover:border-purple-500/30 transition animate-fade-in"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            {/* Type badge */}
                            <div className="flex items-start justify-between mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${citation.type === 'act'
                                        ? 'bg-purple-600/20 text-purple-400'
                                        : 'bg-blue-600/20 text-blue-400'
                                    }`}>
                                    {citation.type === 'act' ? 'Legal Act' : 'Procedure'}
                                </span>
                            </div>

                            {/* Title */}
                            <h4 className="font-semibold text-white mb-2 flex items-start gap-2">
                                <span className="text-purple-500 text-lg mt-0.5">§</span>
                                <span className="flex-1">{citation.title}</span>
                            </h4>

                            {/* Snippet */}
                            {citation.snippet && (
                                <p className="text-gray-400 text-sm mb-3 line-clamp-4 leading-relaxed">
                                    {citation.snippet}
                                </p>
                            )}

                            {/* Link */}
                            <a
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-medium transition"
                            >
                                <i className="ri-external-link-line"></i>
                                View Full Text
                            </a>
                        </div>
                    ))}

                    {/* Empty state (shouldn't happen but just in case) */}
                    {allCitations.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            <i className="ri-file-search-line text-4xl mb-2"></i>
                            <p>No citations available</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default CitationSidebar;
