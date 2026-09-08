import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStreamingProvider,
  isGamingPlatform,
  extractPlatformBadges,
  matchesPlatformFilter,
} from '../src/lib/platforms.ts';

describe('Frontend Platform & Streaming Matrix', () => {
  describe('isStreamingProvider', () => {
    it('identifies canonical and variant streaming service names', () => {
      assert.equal(isStreamingProvider('Apple TV+'), true);
      assert.equal(isStreamingProvider('apple tv'), true);
      assert.equal(isStreamingProvider('Netflix'), true);
      assert.equal(isStreamingProvider('Max'), true);
      assert.equal(isStreamingProvider('HBO'), true);
      assert.equal(isStreamingProvider('Prime Video'), true);
      assert.equal(isStreamingProvider('Disney+'), true);
      assert.equal(isStreamingProvider('Hulu'), true);
      assert.equal(isStreamingProvider('Sci-Fi'), false);
      assert.equal(isStreamingProvider('Action'), false);
    });
  });

  describe('isGamingPlatform', () => {
    it('identifies gaming platforms and stores', () => {
      assert.equal(isGamingPlatform('PC'), true);
      assert.equal(isGamingPlatform('PlayStation 5'), true);
      assert.equal(isGamingPlatform('PS5'), true);
      assert.equal(isGamingPlatform('Xbox Series X'), true);
      assert.equal(isGamingPlatform('Nintendo Switch'), true);
      assert.equal(isGamingPlatform('Steam'), true);
      assert.equal(isGamingPlatform('Epic Games'), true);
      assert.equal(isGamingPlatform('Adventure'), false);
    });
  });

  describe('extractPlatformBadges', () => {
    it('extracts streaming providers from movie/TV tags', () => {
      const item = {
        id: 'tmdb:movie:1',
        type: 'movie',
        title: 'Killers of the Flower Moon',
        date: '2023-10-20',
        first_seen_at: '2023-10-20T00:00:00Z',
        source: 'tmdb',
        url: null,
        image: null,
        tags: ['Apple TV+', 'Drama', 'Crime'],
      };

      const badges = extractPlatformBadges(item);
      assert.equal(badges.length, 1);
      assert.equal(badges[0].name, 'Apple TV+');
      assert.equal(badges[0].category, 'streaming');
    });

    it('extracts gaming platforms and stores from game tags', () => {
      const item = {
        id: 'rawg:2',
        type: 'game',
        title: 'Elden Ring',
        date: '2022-02-25',
        first_seen_at: '2022-02-25T00:00:00Z',
        source: 'rawg',
        url: null,
        image: null,
        tags: ['PC', 'PlayStation 5', 'Steam', 'RPG'],
      };

      const badges = extractPlatformBadges(item);
      const names = badges.map((b) => b.name);
      assert.ok(names.includes('PC'));
      assert.ok(names.includes('PlayStation 5'));
      assert.ok(names.includes('Steam'));
      assert.ok(!names.includes('RPG'));
    });
  });

  describe('matchesPlatformFilter', () => {
    const testItem = {
      id: 'rawg:3',
      type: 'game',
      title: 'Hades II',
      date: '2024-05-06',
      first_seen_at: '2024-05-06T00:00:00Z',
      source: 'rawg',
      url: null,
      image: null,
      tags: ['PC', 'Steam', 'Rogue-like'],
    };

    it('returns true when no filter is active', () => {
      assert.equal(matchesPlatformFilter(testItem, []), true);
    });

    it('returns true when matching platform is selected', () => {
      assert.equal(matchesPlatformFilter(testItem, ['Steam']), true);
      assert.equal(matchesPlatformFilter(testItem, ['steam']), true);
      assert.equal(matchesPlatformFilter(testItem, ['PlayStation 5', 'PC']), true);
    });

    it('returns false when selected platform is absent', () => {
      assert.equal(matchesPlatformFilter(testItem, ['PlayStation 5']), false);
      assert.equal(matchesPlatformFilter(testItem, ['Nintendo Switch']), false);
    });
  });
});
