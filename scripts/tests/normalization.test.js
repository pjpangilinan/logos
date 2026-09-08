import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanProviderName,
  cleanPlatformName,
  extractWatchProviders,
  normalizeMovie,
  normalizeTv,
  normalizeGame,
} from '../lib/normalization-helpers.js';
import { openDb } from '../lib/db-helpers.js';

describe('TMDB & RAWG Normalization & Platform Matrix', () => {
  describe('cleanProviderName', () => {
    it('normalizes streaming provider names to canonical labels', () => {
      assert.equal(cleanProviderName('Apple TV Plus'), 'Apple TV+');
      assert.equal(cleanProviderName('Apple TV+'), 'Apple TV+');
      assert.equal(cleanProviderName('Netflix'), 'Netflix');
      assert.equal(cleanProviderName('HBO Max'), 'Max');
      assert.equal(cleanProviderName('Max'), 'Max');
      assert.equal(cleanProviderName('Amazon Prime Video'), 'Prime Video');
      assert.equal(cleanProviderName('Disney Plus'), 'Disney+');
      assert.equal(cleanProviderName('Hulu'), 'Hulu');
      assert.equal(cleanProviderName('Paramount Plus'), 'Paramount+');
      assert.equal(cleanProviderName('Peacock Premium'), 'Peacock');
    });

    it('handles null, undefined, or empty values safely', () => {
      assert.equal(cleanProviderName(null), null);
      assert.equal(cleanProviderName(undefined), null);
      assert.equal(cleanProviderName(''), null);
    });
  });

  describe('cleanPlatformName', () => {
    it('normalizes gaming platform and store names', () => {
      assert.equal(cleanPlatformName('PC'), 'PC');
      assert.equal(cleanPlatformName('PlayStation 5'), 'PlayStation 5');
      assert.equal(cleanPlatformName('PS5'), 'PlayStation 5');
      assert.equal(cleanPlatformName('Xbox Series S/X'), 'Xbox Series X');
      assert.equal(cleanPlatformName('Nintendo Switch'), 'Nintendo Switch');
      assert.equal(cleanPlatformName('Steam'), 'Steam');
      assert.equal(cleanPlatformName('Epic Games'), 'Epic Games');
      assert.equal(cleanPlatformName('Xbox Game Pass'), 'Game Pass');
    });
  });

  describe('extractWatchProviders', () => {
    it('extracts flatrate and free providers from US region', () => {
      const mockWatchProviders = {
        results: {
          US: {
            flatrate: [
              { provider_name: 'Netflix', provider_id: 8 },
              { provider_name: 'Apple TV Plus', provider_id: 350 },
            ],
            free: [{ provider_name: 'Peacock', provider_id: 386 }],
          },
        },
      };

      const providers = extractWatchProviders(mockWatchProviders, 'US');
      assert.deepEqual(providers, ['Netflix', 'Apple TV+', 'Peacock']);
    });

    it('returns empty array when results missing or empty', () => {
      assert.deepEqual(extractWatchProviders(null), []);
      assert.deepEqual(extractWatchProviders({}), []);
      assert.deepEqual(extractWatchProviders({ results: {} }), []);
    });
  });

  describe('normalizeMovie', () => {
    it('creates compliant item with genres and watch providers', () => {
      const movieGenres = new Map([
        [28, 'Action'],
        [878, 'Sci-Fi'],
      ]);
      const rawMovie = {
        id: 101,
        title: 'Cyberpunk Odyssey',
        release_date: '2026-11-20',
        poster_path: '/poster.jpg',
        genre_ids: [28, 878],
      };
      const rawProviders = {
        results: {
          US: {
            flatrate: [{ provider_name: 'Apple TV Plus' }],
          },
        },
      };

      const normalized = normalizeMovie(rawMovie, movieGenres, new Map(), rawProviders);

      assert.equal(normalized.id, 'tmdb:movie:101');
      assert.equal(normalized.type, 'movie');
      assert.equal(normalized.title, 'Cyberpunk Odyssey');
      assert.equal(normalized.date, '2026-11-20');
      assert.equal(normalized.source, 'tmdb');
      assert.equal(normalized.image, 'https://image.tmdb.org/t/p/w500/poster.jpg');
      assert.deepEqual(normalized.tags, ['Apple TV+', 'Action', 'Sci-Fi']);
    });
  });

  describe('normalizeTv', () => {
    it('enriches TV show with next episode code, air date, and network tags', () => {
      const tvGenres = new Map([[18, 'Drama']]);
      const rawTv = {
        id: 202,
        name: 'Severance',
        first_air_date: '2022-02-18',
        poster_path: '/severance.jpg',
        genre_ids: [18],
      };
      const episodeDetail = {
        networks: [{ name: 'Apple TV+' }],
        next_episode_to_air: {
          season_number: 2,
          episode_number: 1,
          name: 'Hello Kier',
          air_date: '2026-10-15',
        },
      };

      const normalized = normalizeTv(rawTv, new Map(), tvGenres, episodeDetail);

      assert.equal(normalized.id, 'tmdb:tv:202');
      assert.equal(normalized.type, 'tv');
      assert.equal(normalized.title, 'Severance (S02E01: Hello Kier)');
      assert.equal(normalized.date, '2026-10-15');
      assert.deepEqual(normalized.tags, ['S02E01', 'Apple TV+', 'Drama']);
    });
  });

  describe('normalizeGame', () => {
    it('extracts platforms, stores, and genres into tags', () => {
      const rawGame = {
        id: 303,
        name: 'Voidfall',
        released: '2026-12-01',
        slug: 'voidfall',
        background_image: 'https://media.rawg.io/games/voidfall.jpg',
        genres: [{ name: 'Action' }, { name: 'RPG' }],
        platforms: [
          { platform: { name: 'PC' } },
          { platform: { name: 'PlayStation 5' } },
        ],
        stores: [{ store: { name: 'Steam' } }],
      };

      const normalized = normalizeGame(rawGame);

      assert.equal(normalized.id, 'rawg:303');
      assert.equal(normalized.type, 'game');
      assert.equal(normalized.title, 'Voidfall');
      assert.equal(normalized.date, '2026-12-01');
      assert.equal(normalized.source, 'rawg');
      assert.deepEqual(normalized.tags, ['PC', 'PlayStation 5', 'Steam', 'Action', 'RPG']);
    });

    it('handles null/invalid game objects gracefully', () => {
      assert.equal(normalizeGame(null), null);
      assert.equal(normalizeGame({}), null);
    });
  });

  describe('Database Upsert & Preservation (In-Memory SQLite)', () => {
    it('preserves first_seen_at on re-upsert and updates metadata', () => {
      const { db, upsert, close } = openDb(':memory:');
      try {
        // First insert
        const originalFirstSeen = '2026-01-01T00:00:00.000Z';
        db.prepare(`
          INSERT INTO items (id, type, title, date, first_seen_at, source, url, image, tags)
          VALUES ('tmdb:movie:999', 'movie', 'Original Title', '2026-05-01', ?, 'tmdb', 'https://example.com', NULL, '["Action"]')
        `).run(originalFirstSeen);

        // Re-upsert with updated title, new release date, and new watch provider tags
        upsert({
          id: 'tmdb:movie:999',
          type: 'movie',
          title: 'Updated Title',
          date: '2026-06-15',
          source: 'tmdb',
          url: 'https://example.com/updated',
          image: 'https://example.com/poster.jpg',
          tags: ['Apple TV+', 'Action', 'Sci-Fi'],
        });

        const row = db.prepare('SELECT * FROM items WHERE id = ?').get('tmdb:movie:999');

        assert.equal(row.title, 'Updated Title');
        assert.equal(row.date, '2026-06-15');
        assert.equal(row.first_seen_at, originalFirstSeen, 'first_seen_at MUST NOT be overwritten on upsert');
        assert.deepEqual(JSON.parse(row.tags), ['Apple TV+', 'Action', 'Sci-Fi']);
      } finally {
        close();
      }
    });
  });
});
