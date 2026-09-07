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
 * Fetch a JSON endpoint from RAWG API.
 * @param {string} endpoint
 * @param {Record<string, string | number>} params
 * @returns {Promise<any>}
 */
async function fetchRawg(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('key', API_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'logos-aggregator/1.0',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `RAWG API request failed (${response.status} ${response.statusText}): ${errorText.slice(0, 200)}`
    );
  }

  return response.json();
}

/**
 * Normalize a RAWG game object into the aggregator item shape.
 * @param {object} game
 * @returns {object|null}
 */
function normalizeGame(game) {
  if (!game || !game.id) {
    return null;
  }

  return {
    id: `rawg:${game.id}`,
    type: 'game',
    title: game.name || 'Untitled Game',
    date: game.released || null,
    source: 'rawg',
    url: game.slug ? `https://rawg.io/games/${game.slug}` : null,
    image: game.background_image || null,
    tags: Array.isArray(game.genres)
      ? game.genres.map((genre) => genre.name).filter(Boolean)
      : [],
  };
}

async function main() {
  if (!API_KEY) {
    console.error('Fatal error: RAWG_API_KEY environment variable is not set.');
    process.exit(1);
  }

  console.log('Starting RAWG games fetch...');
  const gamesById = new Map();
  let totalFetched = 0;

  const queries = [
    // 1. Upcoming / new releases (pages 1 to 3)
    ...[1, 2, 3].map((page) => ({
      name: `Upcoming/new games (page ${page}/3)`,
      endpoint: '/games',
      params: {
        dates: getUpcomingDateRange(),
        ordering: '-added',
        page_size: 40,
        page,
      },
    })),
    // 2. Top rated recent (page 1)
    {
      name: 'Top rated games (page 1)',
      endpoint: '/games',
      params: {
        ordering: '-rating',
        page_size: 40,
        page: 1,
      },
    },
    // 3. Popular games (page 1)
    {
      name: 'Popular games (page 1)',
      endpoint: '/games',
      params: {
        ordering: '-relevance',
        page_size: 40,
        page: 1,
      },
    },
  ];

  for (const query of queries) {
    try {
      console.log(`Fetching ${query.name}...`);
      const data = await fetchRawg(query.endpoint, query.params);
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
      console.error(`  Error during query "${query.name}":`, err.message);
      throw err;
    }
  }

  const items = Array.from(gamesById.values());
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
