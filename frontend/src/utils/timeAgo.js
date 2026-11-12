/**
 * Utility to format ISO or timestamp dates into human-friendly relative time
 * (e.g. "Just now", "2 mins ago", "1 hour ago", "Yesterday", "3 days ago")
 */
export function formatTimeAgo(dateInput) {
  if (!dateInput) return 'Just now';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Just now';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 90) return '1 min ago';

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mins ago`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour === 1) return '1 hour ago';
    if (diffHour < 24) return `${diffHour} hours ago`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (_) {
    return 'Just now';
  }
}
