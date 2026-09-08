// scripts/fetch-rawg.js
// Fetches upcoming, top-rated, and popular games from the RAWG API
// and upserts them into data/aggregator.db.

import { openDb } from './lib/db-helpers.js';

const BASE_URL = 'https://api.rawg.io/api';
const API_KEY = process.env.RAWG_API_KEY;

/**
 * Formats a Date object to YYYY-MM-DD.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Returns date range string "<today>,<today+6months>" in YYYY-MM-DD format.
 * @returns {string}
 */
function getUpcomingDateRange() {
  const today = new Date();
  const future = new Date(today);
  future.setMonth(future.getMonth() + 6);
  return `${formatDate(today)},${formatDate(future)}`;
}

/**
 * Fetch a JSON endpoint from RAWG API with retry and rate limit pacing.
 * @param {string} endpoint
 * @param {Record<string, string | number>} params
 * @param {number} retries
 * @param {number} backoffMs
 * @returns {Promise<any>}
 */
async function fetchRawg(endpoint, params = {}, retries = 3, backoffMs = 1500) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('key', API_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  // Rate limit pacing: 300ms polite pause before request
  await new Promise((resolve) => setTimeout(resolve, 300));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'logos-aggregator/1.0',
        },
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoffMs * attempt;
        console.warn(`[RAWG] Rate limited (429) on ${endpoint}. Retrying after ${waitMs}ms (attempt ${attempt}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `RAWG API request failed (${response.status} ${response.statusText}): ${errorText.slice(0, 200)}`
        );
      }

      return await response.json();
    } catch (err) {
      if (attempt >= retries || err.message.includes('404')) {
        throw err;
      }
      console.warn(`[RAWG] Request to ${endpoint} failed (attempt ${attempt}/${retries}): ${err.message}. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
    }
  }
}

import { normalizeGame } from './lib/normalization-helpers.js';


async function main() {
  if (!API_KEY) {
    console.error('Fatal error: RAWG_API_KEY environment variable is not set.');
    process.exit(1);
  }

  console.log('Starting RAWG games fetch...');
  const gamesById = new Map();
  let totalFetched = 0;

  // 1. Upcoming / new releases (up to 3 pages)
  for (let page = 1; page <= 3; page++) {
    try {
      console.log(`Fetching Upcoming/new games (page ${page}/3)...`);
      const data = await fetchRawg('/games', {
        dates: getUpcomingDateRange(),
        ordering: '-added',
        page_size: 40,
        page,
      });
      const results = Array.isArray(data?.results) ? data.results : [];
      totalFetched += results.length;
      console.log(`  Received ${results.length} items.`);

      for (const game of results) {
        const normalized = normalizeGame(game);
        if (normalized) {
          gamesById.set(normalized.id, normalized);
        }
      }

      if (!data?.next || results.length < 40) {
        break;
      }
    } catch (err) {
      if (err.message.includes('404')) {
        console.log(`  No further pages available for upcoming games.`);
        break;
      }
      console.error(`  Error during upcoming games fetch page ${page}:`, err.message);
      throw err;
    }
  }

  // 2. Top rated recent (page 1)
  try {
    console.log(`Fetching Top rated games (page 1)...`);
    const data = await fetchRawg('/games', {
      ordering: '-rating',
      page_size: 40,
      page: 1,
    });
    const results = Array.isArray(data?.results) ? data.results : [];
    totalFetched += results.length;
    console.log(`  Received ${results.length} items.`);
    for (const game of results) {
      const normalized = normalizeGame(game);
      if (normalized) {
        gamesById.set(normalized.id, normalized);
      }
    }
  } catch (err) {
    console.error(`  Error during top rated games fetch:`, err.message);
    throw err;
  }

  // 3. Popular games (page 1)
  try {
    console.log(`Fetching Popular games (page 1)...`);
    const data = await fetchRawg('/games', {
      ordering: '-relevance',
      page_size: 40,
      page: 1,
    });
    const results = Array.isArray(data?.results) ? data.results : [];
    totalFetched += results.length;
    console.log(`  Received ${results.length} items.`);
    for (const game of results) {
      const normalized = normalizeGame(game);
      if (normalized) {
        gamesById.set(normalized.id, normalized);
      }
    }
  } catch (err) {
    console.error(`  Error during popular games fetch:`, err.message);
    throw err;
  }

  // Deduplicate items by normalized title + release year to catch duplicate RAWG entries (e.g. "Silent Hill Townfall" vs "Silent Hill: Townfall")
  const titleMap = new Map();
  for (const game of gamesById.values()) {
    const cleanTitle = game.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const year = game.date ? game.date.slice(0, 4) : '';
    const key = `${cleanTitle}:${year}`;
    if (!titleMap.has(key)) {
      titleMap.set(key, game);
    } else {
      const existing = titleMap.get(key);
      // Prefer canonical title with punctuation or richer tags
      if (game.title.includes(':') || game.tags.length > existing.tags.length) {
        titleMap.set(key, game);
      }
    }
  }

  const items = Array.from(titleMap.values());
  console.log(
    `Fetched ${totalFetched} total results; ${items.length} unique games after deduplication.`
  );

  if (items.length === 0) {
    console.warn('Warning: No games were retrieved.');
    return;
  }

  console.log(`Upserting ${items.length} items into database...`);
  const { upsertMany, close } = openDb();

  try {
    upsertMany(items);
    console.log(`✓ Successfully processed and upserted ${items.length} games.`);
  } finally {
    close();
  }
}

main().catch((err) => {
  console.error('Fatal error in fetch-rawg script:', err);
  process.exit(1);
});
