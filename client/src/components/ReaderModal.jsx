
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getTopicImage } from '../utils/helpers';

const ReaderModal = ({ url, topic, onClose, lang, article }) => {
    const { t } = useTranslation();
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0); // [FIX] Force re-fetch

    useEffect(() => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased to 45s

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
                        body: JSON.stringify({
                            url,
                            topic,
                            lang,
                            article: article || {} // Pass metadata if available
                        }),
                        signal: controller.signal
                    });
                    const data = await res.json();

                    if (data.error && !data.text) {
                        setContent({ error: data.error });
                    } else {
                        setContent(data);
                    }
                    setLoading(false);
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    setContent({ error: t('request_timed_out') || "Request timed out. The server took too long to respond." });
                } else {
                    setContent({ error: t('failed_load') || "An error occurred while loading content." });
                }
                setLoading(false);
            } finally {
                clearTimeout(timeoutId);
            }
        };
        if (url) fetchContent();

        return () => {
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [url, topic, retryCount]); // [FIX] Re-run on retryCount change

    if (!url) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#121212] w-full max-w-3xl h-[90vh] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col relative animate-fade-in">
                {/* Header Actions */}
                <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                    <div className="pointer-events-auto">
                        <div className="px-3 py-1 bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest rounded-full backdrop-blur-md border border-white/5 shadow-lg">
                            Reader Mode
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="pointer-events-auto w-10 h-10 rounded-full bg-black/50 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-300 group border border-white/10 hover:rotate-90"
                    >
                        <i className="ri-close-line text-xl text-white/70 group-hover:text-white"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                            <div className="relative">
                                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <i className="ri-article-line text-purple-500 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-sm font-medium tracking-wide animate-pulse">{t('extracting_content') || 'Generating Reader View...'}</p>
                        </div>
                    ) : (content?.error ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-12">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                                <i className="ri-error-warning-line text-3xl text-red-500"></i>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Unable to Load Article</h3>
                            <p className="text-gray-400 mb-8 max-w-md">{content.error}</p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => { setLoading(true); setContent(null); setRetryCount(c => c + 1); }}
                                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium text-white border border-white/10 transition-all"
                                >
                                    Retry
                                </button>
                                <a href={url} target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-blue-900/20">
                                    Open Original
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Hero Image */}
                            {(content.image && !content.image.includes('googleusercontent.com') && !content.image.includes('lh3.google')) && (
                                <div className="w-full h-80 relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent z-10"></div>
                                    <img src={content.image} className="w-full h-full object-cover" alt={content.title} onError={(e) => { e.target.style.display = 'none'; }} />
                                </div>
                            )}

                            <div className={`px-8 md:px-16 lg:px-24 pb-20 ${!content.image ? 'pt-20' : '-mt-20 relative z-20'}`}>
                                {/* Title & Meta */}
                                <h1 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight font-['Merriweather'] md:leading-snug">
                                    {content.title}
                                </h1>

                                <div className="flex items-center gap-4 text-sm text-gray-400 mb-12 border-b border-white/10 pb-8">
                                    {content.authors && content.authors.length > 0 && (
                                        <span className="flex items-center gap-2">
                                            <i className="ri-user-3-line"></i> {content.authors[0]}
                                        </span>
                                    )}
                                    {content.publish_date && (
                                        <span className="flex items-center gap-2">
                                            <i className="ri-calendar-line"></i> {new Date(content.publish_date).toLocaleDateString()}
                                        </span>
                                    )}
                                    <a href={url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-blue-400 hover:text-blue-300 transition">
                                        Source <i className="ri-external-link-line"></i>
                                    </a>
                                </div>

                                {/* Content Body */}
                                {content.extraction_failed ? (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                                        <div className="flex items-start gap-4 mb-6">
                                            <i className="ri-file-list-3-line text-2xl text-yellow-500 mt-1"></i>
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-2">Article Summary</h3>
                                                <p className="text-gray-300 italic leading-relaxed text-lg">
                                                    "{content.summary || content.text}"
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center pt-6 border-t border-white/5">
                                            <p className="text-gray-400 text-sm mb-4">Read the full story on the publisher's website</p>
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-full font-bold transition-transform hover:scale-105 shadow-xl"
                                            >
                                                Read Full Article <i className="ri-arrow-right-line"></i>
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="prose prose-invert prose-lg max-w-none font-['Merriweather'] text-gray-300 leading-8 prose-headings:font-sans prose-headings:font-bold prose-a:text-blue-400 prose-blockquote:border-l-purple-500 prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:my-6 prose-img:rounded-xl"
                                        dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(content.text || '') : (content.text || '') }}
                                    ></div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReaderModal;
