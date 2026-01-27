import React from 'react';

/**
 * Smart Glass Transcript - Real-time glassmorphism speech display
 * Shows interim speech recognition results with beautiful glassmorphism design
 */
const SmartGlassTranscript = ({ text, isVisible }) => {
    if (!isVisible || !text) return null;

    return (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-6 py-4 shadow-2xl">
                <div className="flex items-center gap-3">
                    {/* Pulsing indicator */}
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>

                    {/* Transcript text */}
                    <p className="text-white font-medium text-sm tracking-wide">
                        {text}
                    </p>

                    {/* Sound wave icon */}
                    <i className="ri-sound-module-line text-purple-400 animate-pulse"></i>
                </div>
            </div>
        </div>
    );
};

export default SmartGlassTranscript;
