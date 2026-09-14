import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPhtDateStr,
  getPhtDateOffset,
  formatPhtDateBadge,
  formatPhtRelativeTime,
  formatPhtCountdown,
} from '../src/lib/timezone.ts';

describe('Philippine Time (GMT+8) Engine', () => {
  it('correctly formats date string in Asia/Manila timezone across midnight UTC rollover', () => {
    // 2026-09-13 23:00 UTC = 2026-09-14 07:00 PHT
    const dateAtUtcNight = new Date('2026-09-13T23:00:00.000Z');
    assert.equal(getPhtDateStr(dateAtUtcNight), '2026-09-14');
  });

  it('calculates PHT date offsets without day drift', () => {
    const base = new Date('2026-09-14T02:00:00.000Z'); // 10:00 AM PHT
    assert.equal(getPhtDateOffset(1, base), '2026-09-15');
    assert.equal(getPhtDateOffset(-1, base), '2026-09-13');
    assert.equal(getPhtDateOffset(7, base), '2026-09-21');
    assert.equal(getPhtDateOffset(-30, base), '2026-08-15');
  });

  it('formats date badges consistently from YYYY-MM-DD', () => {
    assert.deepEqual(formatPhtDateBadge('2026-09-30'), { month: 'SEP', day: '30' });
    assert.deepEqual(formatPhtDateBadge('2026-12-16'), { month: 'DEC', day: '16' });
    assert.deepEqual(formatPhtDateBadge(null), { month: 'TBA', day: '--' });
  });

  it('computes accurate countdown labels in PHT day boundaries', () => {
    // Reference: Sept 14 2026 10:00 AM PHT
    const nowMs = new Date('2026-09-14T02:00:00.000Z').getTime();

    assert.equal(formatPhtCountdown('2026-09-14', nowMs), 'Today');
    assert.equal(formatPhtCountdown('2026-09-15', nowMs), 'Tomorrow');
    assert.equal(formatPhtCountdown('2026-09-16', nowMs), 'in 2d');
    assert.equal(formatPhtCountdown('2026-09-28', nowMs), 'in 2w');
    assert.equal(formatPhtCountdown('2026-09-13', nowMs), '1d ago');
    assert.equal(formatPhtCountdown(null, nowMs), 'TBA');
  });

  it('formats relative release time accurately', () => {
    const nowMs = new Date('2026-09-14T10:00:00.000Z').getTime();

    // Released 4 hours ago
    const fourHoursAgo = new Date('2026-09-14T06:00:00.000Z').toISOString();
    assert.equal(formatPhtRelativeTime(fourHoursAgo, nowMs), '4h ago');

    // Released yesterday
    const yesterday = new Date('2026-09-13T02:00:00.000Z').toISOString();
    assert.equal(formatPhtRelativeTime(yesterday, nowMs), 'Yesterday');
  });
});
