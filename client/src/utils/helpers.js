
// Helper to extract YouTube ID
export const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// Helper for dynamic topic images
export const getTopicImage = (title) => {
    if (!title) return "https://images.unsplash.com/photo-1507643179173-617d6540d696?auto=format&fit=crop&q=80&w=800"; // default
    const t = title.toLowerCase();
    if (t.includes('cross') || t.includes('jesus')) return "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800";
    if (t.includes('bible') || t.includes('scripture')) return "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&q=80&w=800";
    if (t.includes('church') || t.includes('worship')) return "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=800";
    return "https://images.unsplash.com/photo-1507643179173-617d6540d696?auto=format&fit=crop&q=80&w=800";
};
