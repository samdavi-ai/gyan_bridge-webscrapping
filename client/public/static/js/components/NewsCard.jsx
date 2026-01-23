
import { getYoutubeId } from '../utils.js';
import { PLACEHOLDER_IMG } from '../constants.js';

const NewsCard = ({ article, onRead, isSaved, onToggleSave, t }) => {
    const videoId = getYoutubeId(article.url);
    const textContent = (article.snippet || article.title || "");
    const readTime = Math.max(1, Math.round(textContent.length / 20));
    const _t = t || ((k) => k); // Fallback if t serves undefined

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
                        <span>• {article.published_at || _t('recently')}</span>
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
                        <i className="ri-time-line"></i> {readTime} {_t('min_read')}
                    </span>
                    {/* Mobile Time */}
                    <span className="sm:hidden">{article.published_at || _t('recently')}</span>
                </div>
            </div>
        </div>
    );
};

export default NewsCard;
