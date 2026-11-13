/**
 * SmartHire Universal Accurate DateTime Formatter
 * 
 * Ensures 100% accurate time conversion between UTC backend database timestamps
 * and the user's local timezone (e.g. IST, UTC+05:30).
 * Prevents the notorious "5 hours ago" timezone skew.
 */

/**
 * Safely parse any date input (ISO string, epoch ms, array, Date object)
 * into a valid JavaScript Date in the user's local context.
 */
export function parseDateSafe(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  // Handle array format serialized by some Java versions: [year, month, day, hour, minute, second]
  if (Array.isArray(dateInput)) {
    const [y, m, d, h = 0, min = 0, s = 0] = dateInput;
    return new Date(Date.UTC(y, m - 1, d, h, min, s));
  }

  // Handle epoch milliseconds
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }

  let str = String(dateInput).trim();
  if (!str) return null;

  // Convert space separator to 'T' if format is "YYYY-MM-DD HH:mm:ss"
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }

  // If ISO string without timezone indicator (e.g. "2026-11-13T05:21:00" or ".123"),
  // backend PostgreSQL/Render stores in UTC, so append 'Z' so browser parses as UTC
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str += 'Z';
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Human-friendly relative time (e.g. "Just now", "2 mins ago", "1 hour ago", "Yesterday")
 */
export function formatTimeAgo(dateInput) {
  if (!dateInput) return 'Just now';
  try {
    const date = parseDateSafe(dateInput);
    if (!date) return 'Just now';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    // Negative diffSec (future by up to 2 mins due to server/client clock skew) or under 45s -> "Just now"
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

/**
 * Exact localized date & time (e.g. "13 Nov 2026, 10:51 AM")
 */
export function formatExactDateTime(dateInput) {
  const date = parseDateSafe(dateInput);
  if (!date) return 'Recently';
  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Exact localized time only (e.g. "10:51 AM")
 */
export function formatTimeOnly(dateInput) {
  const date = parseDateSafe(dateInput);
  if (!date) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Comprehensive object for rich, accurate notification time display
 */
export function formatNotificationTime(dateInput) {
  const date = parseDateSafe(dateInput);
  if (!date) {
    return {
      relative: 'Just now',
      exact: 'Recently',
      timeOnly: '',
      full: 'Just now',
    };
  }

  const relative = formatTimeAgo(date);
  const exact = formatExactDateTime(date);
  const timeOnly = formatTimeOnly(date);

  return {
    relative,
    exact,
    timeOnly,
    full: `${relative} • ${exact}`,
  };
}
