import type { Item } from './db';

export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Format a Date into YYYY-MM-DD local string.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate calendar grid cells (typically 35 or 42 cells) for a given year and 0-indexed month.
 * Starts on Monday.
 */
export function getCalendarGrid(year: number, monthIndex: number, referenceDate: Date = new Date()): CalendarDay[] {
  const todayStr = formatLocalDate(referenceDate);

  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  // Day of week for 1st of month: 0 = Sun, 1 = Mon, ..., 6 = Sat
  // We want Monday = 0, ..., Sunday = 6
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

  const days: CalendarDay[] = [];

  // Previous month trailing days
  const prevMonthLastDate = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = prevMonthLastDate - i;
    const d = new Date(year, monthIndex - 1, dayNumber);
    const dateStr = formatLocalDate(d);
    days.push({
      dateStr,
      dayNumber,
      inCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  const currentMonthDays = lastDayOfMonth.getDate();
  for (let i = 1; i <= currentMonthDays; i++) {
    const d = new Date(year, monthIndex, i);
    const dateStr = formatLocalDate(d);
    days.push({
      dateStr,
      dayNumber: i,
      inCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month leading days to complete grid (multiples of 7: 35 or 42)
  const remaining = (7 - (days.length % 7)) % 7;
  const targetTotal = days.length + remaining < 35 ? 35 : days.length + remaining;
  const neededTrailing = targetTotal - days.length;

  for (let i = 1; i <= neededTrailing; i++) {
    const d = new Date(year, monthIndex + 1, i);
    const dateStr = formatLocalDate(d);
    days.push({
      dateStr,
      dayNumber: i,
      inCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

/**
 * Group items by their exact release/publish date (YYYY-MM-DD prefix).
 */
export function groupItemsByDate(items: Item[]): Map<string, Item[]> {
  const map = new Map<string, Item[]>();

  for (const item of items) {
    if (!item.date) continue;
    // Extract YYYY-MM-DD
    const match = item.date.match(/^\d{4}-\d{2}-\d{2}/);
    if (!match) continue;
    const dateKey = match[0];

    const list = map.get(dateKey);
    if (list) {
      list.push(item);
    } else {
      map.set(dateKey, [item]);
    }
  }

  return map;
}

/**
 * Format a Date to human-readable month and year (e.g. "October 2026").
 */
export function formatMonthHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
