
const VideoCard = ({ video, isSaved, onToggleSave, onWatch }) => {
    const getBadge = (type) => {
        if (type === 'youtube') return { color: 'text-red-500', icon: 'ri-youtube-fill', name: 'YouTube' };
        if (type === 'instagram') return { color: 'text-pink-500', icon: 'ri-instagram-fill', name: 'Instagram' };
        if (type === 'facebook') return { color: 'text-blue-500', icon: 'ri-facebook-fill', name: 'Facebook' };
        if (type === 'vimeo') return { color: 'text-sky-400', icon: 'ri-vimeo-fill', name: 'Vimeo' };
        return { color: 'text-gray-400', icon: 'ri-video-fill', name: 'Video' };
    };
    const badge = getBadge(video.source_type);

    return (
        <div className="bg-[#1E1E1E] rounded-xl overflow-hidden hover:bg-[#252525] transition-all duration-300 group border border-white/5 hover:border-red-500/30 flex flex-col">
            <div className="relative aspect-video bg-black cursor-pointer overflow-hidden" onClick={() => onWatch(video)}>
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-14 h-14 bg-red-600/90 rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl shadow-red-500/30 transform scale-75 group-hover:scale-100 transition-all">
                        <i className="ri-play-fill text-2xl text-white ml-1"></i>
                    </div>
                </div>

                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border border-white/10">
                    <i className={`${badge.icon} ${badge.color}`}></i> {badge.name}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onToggleSave(video); }}
                    className="absolute top-2 right-2 p-2 hover:bg-black/50 rounded-full transition text-white"
                >
                    <i className={`${isSaved ? 'ri-heart-fill text-red-500' : 'ri-heart-line'}`}></i>
                </button>

                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur rounded px-1.5 py-0.5 text-xs font-mono text-gray-300 flex items-center gap-1">
                    <i className="ri-eye-line text-gray-400 text-[10px]"></i>
                    {video.views ? parseInt(video.views).toLocaleString() : 'N/A'}
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <h3 onClick={() => onWatch(video)} className="text-white font-bold text-sm leading-snug line-clamp-2 cursor-pointer hover:text-red-400 transition mb-2" title={video.title}>
                    {video.title}
                </h3>

                <div className="mt-auto flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        {video.channel_avatar ? (
                            <img src={video.channel_avatar} className="w-5 h-5 rounded-full" alt="" />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-800"></div>
                        )}
                        <span className="truncate max-w-[100px]">{video.channel}</span>
                    </div>
                    <span>{video.published_at || 'Recently'}</span>
                </div>
            </div>
        </div>
    );
};

export default VideoCard;
