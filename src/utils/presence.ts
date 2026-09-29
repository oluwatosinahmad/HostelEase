/**
 * Presence formatting utilities for HostelEase chat & messaging
 * Formats real online presence and last-seen activity in WhatsApp / iMessage style.
 */

export function formatPresence(isOnline?: boolean, lastSeenAt?: string | null): string {
  if (isOnline) {
    return 'Online';
  }

  if (!lastSeenAt) {
    return 'Offline';
  }

  try {
    // SQLite datetime('now') returns 'YYYY-MM-DD HH:MM:SS' in UTC
    const dateStr = lastSeenAt.endsWith('Z') 
      ? lastSeenAt 
      : lastSeenAt.replace(' ', 'T') + 'Z';
    const seenDate = new Date(dateStr);
    const now = new Date();

    if (isNaN(seenDate.getTime())) {
      return 'Offline';
    }

    const diffMs = now.getTime() - seenDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffMin < 2) {
      return 'Last seen just now';
    }

    if (diffMin < 60) {
      return `Last seen ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    }

    const timeStr = seenDate.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });

    // Check if same calendar day
    const isToday = 
      now.getFullYear() === seenDate.getFullYear() &&
      now.getMonth() === seenDate.getMonth() &&
      now.getDate() === seenDate.getDate();

    if (isToday) {
      return `Last seen today at ${timeStr}`;
    }

    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = 
      yesterday.getFullYear() === seenDate.getFullYear() &&
      yesterday.getMonth() === seenDate.getMonth() &&
      yesterday.getDate() === seenDate.getDate();

    if (isYesterday) {
      return `Last seen yesterday at ${timeStr}`;
    }

    const dateFormatted = seenDate.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    });

    return `Last seen ${dateFormatted} at ${timeStr}`;
  } catch (err) {
    return 'Offline';
  }
}

export function getPresenceInfo(isOnline?: boolean, lastSeenAt?: string | null): {
  isOnline: boolean;
  statusText: string;
} {
  const status = formatPresence(isOnline, lastSeenAt);
  return {
    isOnline: !!isOnline,
    statusText: status
  };
}
