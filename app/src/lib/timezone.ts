/**
 * Timezone utilities for Philippine Standard Time (PST / PHT, GMT+8).
 * Ensures all dates, countdowns, relative timestamps, and calendar
 * computations adhere to Asia/Manila (UTC+8).
 */

export const PHT_TIMEZONE = 'Asia/Manila';

/**
 * Returns YYYY-MM-DD in Philippine Standard Time.
 */
export function getPhtDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PHT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns YYYY-MM-DD relative to a base date in PHT.
 */
export function getPhtDateOffset(daysOffset: number, baseDate: Date = new Date()): string {
  const phtDateStr = getPhtDateStr(baseDate);
  const targetMs = new Date(`${phtDateStr}T00:00:00+08:00`).getTime() + daysOffset * 86400000;
  return getPhtDateStr(new Date(targetMs));
}

/**
 * Parses YYYY-MM-DD into month short name and 2-digit day for badges.
 */
export function formatPhtDateBadge(dateStr: string | null): { month: string; day: string } {
  if (!dateStr) return { month: 'TBA', day: '--' };
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, monthIndex, day);
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return { month, day: String(day).padStart(2, '0') };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: 'TBA', day: '--' };
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: PHT_TIMEZONE }).toUpperCase();
  const day = d.getDate().toString().padStart(2, '0');
  return { month, day };
}

/**
 * Formats relative release time in PHT (e.g. "Just now", "6h ago", "Yesterday", "3d ago").
 */
export function formatPhtRelativeTime(dateStr: string, nowMs: number = Date.now()): string {
  const targetTime = dateStr.includes('T')
    ? new Date(dateStr).getTime()
    : new Date(`${dateStr.slice(0, 10)}T00:00:00+08:00`).getTime();

  const diffMs = nowMs - targetTime;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Formats countdown strictly aligned with Philippine Time days.
 * Returns: "Today", "Tomorrow", "in 2d", "in 2w", "in 3mo", etc.
 */
export function formatPhtCountdown(dateStr: string | null, nowMs: number = Date.now()): string {
  if (!dateStr) return 'TBA';
  const today = getPhtDateStr(new Date(nowMs));
  const targetDate = dateStr.slice(0, 10);

  if (targetDate === today) return 'Today';

  const todayMidnight = new Date(`${today}T00:00:00+08:00`).getTime();
  const targetMidnight = new Date(`${targetDate}T00:00:00+08:00`).getTime();
  const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 14) return `in ${diffDays}d`;
  const weeks = Math.round(diffDays / 7);
  if (weeks < 8) return `in ${weeks}w`;
  const months = Math.round(diffDays / 30);
  return `in ${months}mo`;
}
