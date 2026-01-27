import React from 'react';
import ContextMenu from './ContextMenu';
import { PLACEHOLDER_IMG } from '../utils/constants';
import { useTranslation } from 'react-i18next';
import { formatTimeAgo } from '../utils/timeUtils';

const VideoCard = ({ video, isSaved, onToggleSave, isLiked, onToggleLike, onNotInterested, onWatch }) => {
    const { t } = useTranslation();
    const getBadge = (type) => {
        switch (type) {
            case 'youtube': return <span className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1 shadow-md z-10"><i className="ri-youtube-fill"></i> YouTube</span>;
            case 'instagram': return <span className="absolute top-2 left-2 px-2 py-1 bg-pink-600 text-white text-xs font-bold rounded flex items-center gap-1 shadow-md z-10"><i className="ri-instagram-fill"></i> Instagram</span>;
            default: return <span className="absolute top-2 left-2 px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded flex items-center gap-1 shadow-md z-10"><i className="ri-video-fill"></i> Web</span>;
        }
    };

    return (
        <div className="bg-[#1E1E1E] rounded-xl overflow-hidden hover:bg-[#252525] transition-all duration-300 group relative shadow-lg border border-white/5 hover:border-purple-500/30 w-full flex flex-col">
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                <ContextMenu
                    item={video}
                    onLike={onToggleLike}
                    onSave={onToggleSave}
                    onNotInterested={onNotInterested}
                    isLiked={isLiked}
                    isSaved={isSaved}
                />
            </div>
            <div className="relative aspect-video overflow-hidden cursor-pointer bg-[#151515]" onClick={() => onWatch(video)}>
                {getBadge(video.source_type)}
                {(video.thumbnail || video.image) ? (
                    <img
                        src={video.thumbnail || video.image}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                        onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                        <i className="ri-video-line text-4xl text-gray-700"></i>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
                        <i className="ri-play-fill text-2xl text-white ml-1"></i>
                    </div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white font-mono">{video.duration || "00:00"}</div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <h3 onClick={() => onWatch(video)} className="text-gray-100 font-bold text-base leading-tight line-clamp-2 cursor-pointer hover:text-purple-400 transition-colors" title={video.title}>{video.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span className="truncate max-w-[150px]">{video.channel || video.source}</span>
                        <span>• {formatTimeAgo(video.published || video.timestamp)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoCard;
