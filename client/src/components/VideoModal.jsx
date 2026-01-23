
import React from 'react';

const VideoModal = ({ video, onClose }) => {
    const isYouTube = video.source_type === 'youtube' || (video.id && video.id.length > 5 && !video.id.includes(' '));
    const videoId = video.id;

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-6xl flex justify-end mb-4">
                <button onClick={onClose} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                    <i className="ri-logout-box-r-line"></i> EXIT PLAYER
                </button>
            </div>

            <div className="w-full max-w-6xl bg-[#121212] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col h-[80vh]">
                <div className="flex items-center justify-between p-4 bg-black/40 border-b border-white/5 shrink-0">
                    <h3 className="text-white font-bold truncate">{video.title}</h3>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="aspect-video w-full bg-black relative flex items-center justify-center shrink-0">
                        {isYouTube ? (
                            <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                                title={video.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="text-center p-10">
                                <i className="ri-error-warning-line text-4xl text-gray-500 mb-2"></i>
                                <p className="text-gray-400">External playback not supported for this source.</p>
                                <a href={video.url} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline mt-2 inline-block">Watch on {video.source}</a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoModal;
