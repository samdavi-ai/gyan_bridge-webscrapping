import React, { useState, useRef, useEffect } from 'react';

const ContextMenu = ({ item, onLike, onSave, onNotInterested, isLiked, isSaved }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="More options"
            >
                <i className="ri-more-2-fill text-gray-400"></i>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-2xl z-50 py-2 animate-fade-in">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLike(item);
                            setIsOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-gray-300 transition-colors"
                    >
                        <i className={`${isLiked ? 'ri-thumb-up-fill text-blue-400' : 'ri-thumb-up-line'}`}></i>
                        <span>{isLiked ? 'Unlike' : 'Like'}</span>
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSave(item);
                            setIsOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-gray-300 transition-colors"
                    >
                        <i className={`${isSaved ? 'ri-bookmark-fill text-purple-400' : 'ri-bookmark-line'}`}></i>
                        <span>{isSaved ? 'Unsave' : 'Save'}</span>
                    </button>

                    <div className="border-t border-white/10 my-2"></div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onNotInterested(item);
                            setIsOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-red-500/10 flex items-center gap-3 text-red-400 transition-colors"
                    >
                        <i className="ri-eye-off-line"></i>
                        <span>Not Interested</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ContextMenu;
