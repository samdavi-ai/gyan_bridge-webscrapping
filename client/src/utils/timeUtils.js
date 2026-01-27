/**
 * Utility to format timestamps for news and video content
 */

export const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';

    try {
        let date;

        // Handle different timestamp formats
        if (typeof timestamp === 'number') {
            // Unix timestamp (seconds) - convert to milliseconds
            date = new Date(timestamp * 1000);
        } else if (typeof timestamp === 'string') {
            // If it's already a relative time string, return it as is
            if (timestamp.includes('ago') || timestamp.includes('now') || timestamp.includes('Just')) {
                return timestamp;
            }
            // ISO string or other date string format
            date = new Date(timestamp);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            return 'Recently';
        }

        // Validate the date
        if (isNaN(date.getTime())) {
            console.warn('Invalid date:', timestamp);
            return 'Recently';
        }

        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        // Handle future dates
        if (diffInSeconds < 0) {
            return 'Just now';
        }

        // Less than 1 minute
        if (diffInSeconds < 60) {
            return 'Just now';
        }

        // Less than 1 hour
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return diffInMinutes === 1 ? '1 min ago' : `${diffInMinutes} mins ago`;
        }

        // Less than 1 day
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
        }

        // Less than 1 week
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
        }

        // Less than 1 month
        const diffInWeeks = Math.floor(diffInDays / 7);
        if (diffInWeeks < 4) {
            return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
        }

        // Less than 1 year
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
            return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
        }

        // Over a year
        const diffInYears = Math.floor(diffInDays / 365);
        return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;

    } catch (error) {
        console.error('Error formatting timestamp:', error, timestamp);
        return 'Recently';
    }
};

export const formatFullDate = (timestamp) => {
    if (!timestamp) return '';

    try {
        let date;
        if (typeof timestamp === 'number') {
            date = new Date(timestamp * 1000);
        } else {
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) return '';

        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '';
    }
};
