const JobsSaved = require('../models/jobsSaved');

async function isJobSavedByUser(user_id, job_id) {
    try {
        if (!user_id || !job_id) return { saved: false };

        const record = await JobsSaved.findOne({ where: { user_id, job_id } });

        return { saved: !!record };
    } catch (err) {
        console.error('Error checking saved job:', err);
        return { saved: false }; 
    }
}

function timeSince(datetime) {
    const now = new Date();
    const past = new Date(datetime);
    const diffMs = now - past;

    if (diffMs < 0) return 'In the future';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return years + (years === 1 ? ' year ago' : ' years ago');
    if (months > 0) return months + (months === 1 ? ' month ago' : ' months ago');
    if (days > 0) return days + (days === 1 ? ' day ago' : ' days ago');
    if (hours > 0) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    if (minutes > 0) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
    return 'Just now';
}

module.exports = {
    isJobSavedByUser,
    timeSince
};