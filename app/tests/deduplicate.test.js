import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateItems } from '../src/lib/db.ts';

describe('deduplicateItems', () => {
  it('deduplicates games with slight punctuation differences like Silent Hill', () => {
    const rawItems = [
      {
        id: 'rawg:868088',
        type: 'game',
        title: 'Silent Hill Townfall',
        date: '2026-09-24',
        first_seen_at: '2026-09-08T01:00:00Z',
        source: 'rawg',
        url: 'https://rawg.io/games/silent-hill-townfall',
        image: null,
        tags: ['horror'],
      },
      {
        id: 'rawg:1018062',
        type: 'game',
        title: 'Silent Hill: Townfall',
        date: '2026-09-24',
        first_seen_at: '2026-09-08T01:05:00Z',
        source: 'rawg',
        url: 'https://rawg.io/games/silent-hill-townfall-2',
        image: 'https://media.rawg.io/media/games/townfall.jpg',
        tags: ['horror', 'action'],
      },
    ];

    const deduplicated = deduplicateItems(rawItems);
    assert.equal(deduplicated.length, 1);
    assert.equal(deduplicated[0].title, 'Silent Hill: Townfall');
    assert.equal(deduplicated[0].image, 'https://media.rawg.io/media/games/townfall.jpg');
  });

  it('keeps distinct items separate', () => {
    const rawItems = [
      {
        id: 'rawg:1',
        type: 'game',
        title: 'Game One',
        date: '2026-10-01',
        first_seen_at: '2026-09-08T01:00:00Z',
        source: 'rawg',
        url: null,
        image: null,
        tags: [],
      },
      {
        id: 'rawg:2',
        type: 'game',
        title: 'Game Two',
        date: '2026-10-01',
        first_seen_at: '2026-09-08T01:00:00Z',
        source: 'rawg',
        url: null,
        image: null,
        tags: [],
      },
    ];

    const deduplicated = deduplicateItems(rawItems);
    assert.equal(deduplicated.length, 2);
  });
});
