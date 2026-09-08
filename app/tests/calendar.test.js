import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLocalDate,
  getCalendarGrid,
  groupItemsByDate,
  formatMonthHeader,
} from '../src/lib/calendar.ts';

describe('Calendar Utilities', () => {
  describe('formatLocalDate', () => {
    it('formats year, month, and day with leading zeros', () => {
      const d = new Date(2026, 8, 8); // Sept 8 2026
      assert.equal(formatLocalDate(d), '2026-09-08');
    });
  });

  describe('getCalendarGrid', () => {
    it('generates a multiple of 7 grid cells covering the month', () => {
      // September 2026: starts on Tuesday (Sept 1), 30 days
      const refDate = new Date(2026, 8, 8);
      const grid = getCalendarGrid(2026, 8, refDate);

      assert.equal(grid.length % 7, 0);
      assert.ok(grid.length >= 35);

      // Check today indicator
      const todayCell = grid.find((c) => c.dateStr === '2026-09-08');
      assert.ok(todayCell);
      assert.equal(todayCell.isToday, true);
      assert.equal(todayCell.inCurrentMonth, true);

      // Check trailing day from August
      const augDay = grid.find((c) => c.dateStr === '2026-08-31');
      assert.ok(augDay);
      assert.equal(augDay.inCurrentMonth, false);

      // Check current month days count
      const currentMonthDays = grid.filter((c) => c.inCurrentMonth);
      assert.equal(currentMonthDays.length, 30);
    });

    it('correctly handles leap year February', () => {
      const grid = getCalendarGrid(2024, 1, new Date(2024, 1, 15));
      const febDays = grid.filter((c) => c.inCurrentMonth);
      assert.equal(febDays.length, 29);
    });
  });

  describe('groupItemsByDate', () => {
    it('groups items by their YYYY-MM-DD date key', () => {
      const items = [
        { id: '1', title: 'Movie A', date: '2026-09-15', tags: [] },
        { id: '2', title: 'Game B', date: '2026-09-15T12:00:00Z', tags: [] },
        { id: '3', title: 'Movie C', date: '2026-09-20', tags: [] },
        { id: '4', title: 'No Date', date: null, tags: [] },
      ];

      const grouped = groupItemsByDate(items);
      assert.equal(grouped.size, 2);

      const day15 = grouped.get('2026-09-15');
      assert.ok(day15);
      assert.equal(day15.length, 2);
      assert.equal(day15[0].title, 'Movie A');
      assert.equal(day15[1].title, 'Game B');

      const day20 = grouped.get('2026-09-20');
      assert.ok(day20);
      assert.equal(day20.length, 1);
      assert.equal(day20[0].title, 'Movie C');
    });
  });

  describe('formatMonthHeader', () => {
    it('formats month and year', () => {
      const d = new Date(2026, 9, 1); // October 2026
      assert.equal(formatMonthHeader(d), 'October 2026');
    });
  });
});
