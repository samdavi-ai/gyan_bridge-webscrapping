
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getTopicImage } from '../utils/helpers';

const ReaderModal = ({ url, topic, onClose, lang }) => {
    const { t } = useTranslation();
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
                        body: JSON.stringify({ url, topic, lang })
                    });
                    const data = await res.json();
                    setContent(data);
                    setLoading(false);
                }
            } catch (e) {
                setContent({ error: t('failed_load') });
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
                        <div className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">{t('reader_mode')}</div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                        <i className="ri-close-line text-xl text-gray-400"></i>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <i className="ri-loader-4-line text-4xl animate-spin mb-4"></i>
                            <p>{t('extracting_content')}</p>
                        </div>
                    ) : (content?.error ? (
                        <div className="text-red-400 text-center mt-20">
                            <p>{content.error}</p>
                            <a href={url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-blue-400 hover:underline">{t('open_original')}</a>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-lg max-w-none">
                            {(content.image && !content.image.includes('googleusercontent.com') && !content.image.includes('lh3.google')) && (
                                <img src={content.image} className="w-full h-64 object-cover rounded-lg mb-8 shadow-lg" alt={content.title} onError={(e) => { e.target.style.display = 'none'; }} />
                            )}
                            <h1 className="text-3xl font-bold text-white mb-6">{content.title}</h1>
                            <div className="text-gray-300 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(content.text) : content.text }}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReaderModal;
