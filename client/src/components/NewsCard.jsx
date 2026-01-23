
import React from 'react';
import { PLACEHOLDER_IMG } from '../utils/constants';
import ContextMenu from './ContextMenu';

import { useTranslation } from 'react-i18next';

// Fixed logic errors: Remove unused getYoutubeId
const NewsCard = ({ article, onRead, isSaved, onToggleSave, isLiked, onToggleLike, onNotInterested }) => {
    const { t } = useTranslation();
    const textContent = (article.snippet || article.title || "");
    const readTime = Math.max(1, Math.round(textContent.length / 20));

    return (
        <div className="bg-[#1E1E1E] rounded-xl overflow-hidden hover:bg-[#252525] transition-all duration-300 group relative shadow-lg border border-white/5 hover:border-purple-500/30 w-full flex flex-col sm:flex-row h-auto sm:h-[180px]">
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                <ContextMenu
                    item={article}
                    onLike={onToggleLike}
                    onSave={onToggleSave}
                    onNotInterested={onNotInterested}
                    isLiked={isLiked}
                    isSaved={isSaved}
                />
            </div>
            <div className="relative w-full h-48 sm:h-full sm:w-[200px] shrink-0 overflow-hidden cursor-pointer bg-[#151515]" onClick={() => onRead && onRead(article)}>
                {article.image ? (
                    <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                        onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-800 to-black text-gray-500">
                        <i className="ri-newspaper-line text-3xl mb-2 opacity-50"></i>
                        <span className="text-xs font-bold uppercase tracking-widest text-center opacity-40">{article.source}</span>
                    </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs text-white font-medium sm:hidden">{article.source}</div>
            </div>
            <div className="p-4 flex flex-col flex-1 justify-between h-full overflow-hidden min-w-0">
                <div className="flex flex-col gap-1">
                    <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-400 mb-1">
                        <span className="font-semibold text-gray-300 truncate max-w-[120px]">{article.source}</span>
                        <span>• {article.published_at || t('recently')}</span>
                    </div>
                    <h3 onClick={() => onRead && onRead(article)} className="text-gray-100 font-bold text-base sm:text-lg leading-tight line-clamp-2 cursor-pointer hover:text-cyan-400 transition-colors" title={article.title}>{article.title}</h3>
                    {article.snippet && <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mt-1 sm:mt-2">{article.snippet}</p>}
                </div>
                <div className="flex items-center justify-between text-gray-500 text-xs mt-3 pt-3 border-t border-white/5">
                    <span className="flex items-center gap-1"><i className="ri-time-line"></i> {readTime} {t('min_read')}</span>
                    <span className="sm:hidden">{article.published_at || t('recently')}</span>
                </div>
            </div>
        </div>
    );
};

export default NewsCard;
