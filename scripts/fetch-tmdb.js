// scripts/fetch-tmdb.js
// Fetches upcoming + trending movies and TV shows from TMDB and upserts into SQLite.

import { openDb } from './lib/db-helpers.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const apiKey = process.env.TMDB_API_KEY?.trim();
if (!apiKey) {
  console.error('Error: TMDB_API_KEY environment variable is required.');
  process.exit(1);
}

/**
 * Build URL and request options for TMDB API.
 * Supports both standard v3 API keys and v4 Read Access (Bearer) tokens.
 */
function buildRequest(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  const isBearerToken = apiKey.startsWith('ey') || apiKey.startsWith('Bearer ');
  const cleanKey = apiKey.startsWith('Bearer ') ? apiKey.slice(7).trim() : apiKey;

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    Accept: 'application/json',
  };

  if (isBearerToken) {
    headers.Authorization = `Bearer ${cleanKey}`;
  } else {
    url.searchParams.set('api_key', cleanKey);
  }

  return { url: url.toString(), headers };
}

/**
 * Fetch with retry logic for rate limits (HTTP 429) and transient network errors.
 */
async function fetchJson(endpoint, params = {}, retries = 3, backoffMs = 1000) {
  const { url, headers } = buildRequest(endpoint, params);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { headers });

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoffMs * attempt;
        console.warn(`[TMDB] Rate limited (429) on ${endpoint}. Retrying after ${waitMs}ms (attempt ${attempt}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} on ${endpoint}: ${errorText}`);
      }

      return await response.json();
    } catch (err) {
      if (attempt >= retries) {
        throw err;
      }
      console.warn(`[TMDB] Request to ${endpoint} failed (attempt ${attempt}/${retries}): ${err.message}. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
    }
  }
}

/**
 * Fetch genre mapping for movies and TV shows.
 */
async function fetchGenreMaps() {
  console.log('[TMDB] Fetching genre maps...');
  const movieGenres = new Map();
  const tvGenres = new Map();

  try {
    const [movieData, tvData] = await Promise.all([
      fetchJson('/genre/movie/list'),
      fetchJson('/genre/tv/list'),
    ]);

    for (const g of movieData?.genres || []) {
      movieGenres.set(g.id, g.name);
    }
    for (const g of tvData?.genres || []) {
      tvGenres.set(g.id, g.name);
    }
    console.log(`[TMDB] Loaded ${movieGenres.size} movie genres and ${tvGenres.size} TV genres.`);
  } catch (err) {
    console.error(`[TMDB] Failed to fetch genre maps: ${err.message}`);
    throw err;
  }

  return { movieGenres, tvGenres };
}

import { normalizeMovie, normalizeTv } from './lib/normalization-helpers.js';


async function main() {
  console.log('[TMDB] Starting TMDB fetch job...');
  const startTime = Date.now();

  const { movieGenres, tvGenres } = await fetchGenreMaps();
  const itemsMap = new Map();

  // 1. Movie: Upcoming (pages 1-3)
  console.log('[TMDB] Fetching upcoming movies (pages 1-3)...');
  for (let page = 1; page <= 3; page++) {
    try {
      const data = await fetchJson('/movie/upcoming', { page });
      const results = data?.results || [];
      for (const item of results) {
        if (!item.id) continue;
        const normalized = normalizeMovie(item, movieGenres, tvGenres);
        itemsMap.set(normalized.id, normalized);
      }
      console.log(`  - /movie/upcoming page ${page}: got ${results.length} items`);
      if (data?.total_pages && page >= data.total_pages) break;
    } catch (err) {
      console.error(`  - Failed /movie/upcoming page ${page}: ${err.message}`);
      throw err;
    }
  }

  // 2. Movie: Trending Week (page 1)
  console.log('[TMDB] Fetching trending movies this week...');
  try {
    const data = await fetchJson('/trending/movie/week', { page: 1 });
    const results = data?.results || [];
    for (const item of results) {
      if (!item.id) continue;
      const normalized = normalizeMovie(item, movieGenres, tvGenres);
      itemsMap.set(normalized.id, normalized);
    }
    console.log(`  - /trending/movie/week: got ${results.length} items`);
  } catch (err) {
    console.error(`  - Failed /trending/movie/week: ${err.message}`);
    throw err;
  }

  // 3. TV Shows: Collect raw items from On The Air + Trending
  console.log('[TMDB] Fetching on-the-air TV shows (pages 1-3)...');
  const rawTvShows = new Map();

  for (let page = 1; page <= 3; page++) {
    try {
      const data = await fetchJson('/tv/on_the_air', { page });
      const results = data?.results || [];
      for (const item of results) {
        if (item.id) rawTvShows.set(item.id, item);
      }
      console.log(`  - /tv/on_the_air page ${page}: got ${results.length} items`);
      if (data?.total_pages && page >= data.total_pages) break;
    } catch (err) {
      console.error(`  - Failed /tv/on_the_air page ${page}: ${err.message}`);
      throw err;
    }
  }

  // 4. TV: Trending Week (page 1)
  console.log('[TMDB] Fetching trending TV shows this week...');
  try {
    const data = await fetchJson('/trending/tv/week', { page: 1 });
    const results = data?.results || [];
    for (const item of results) {
      if (item.id) rawTvShows.set(item.id, item);
    }
    console.log(`  - /trending/tv/week: got ${results.length} items`);
  } catch (err) {
    console.error(`  - Failed /trending/tv/week: ${err.message}`);
    throw err;
  }

  // 5. Enrich TV shows with next/last episode release dates and watch providers
  console.log(`[TMDB] Enriching ${rawTvShows.size} TV shows with air dates & streaming providers...`);
  const tvArray = Array.from(rawTvShows.values());
  const BATCH_SIZE = 4;

  for (let i = 0; i < tvArray.length; i += BATCH_SIZE) {
    const batch = tvArray.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (rawShow) => {
        let episodeDetail = null;
        try {
          episodeDetail = await fetchJson(`/tv/${rawShow.id}`, { append_to_response: 'watch/providers' });
        } catch {
          // Fallback gracefully to basic show info
        }
        const normalized = normalizeTv(
          rawShow,
          movieGenres,
          tvGenres,
          episodeDetail,
          episodeDetail?.['watch/providers']
        );
        itemsMap.set(normalized.id, normalized);
      })
    );
    // Rate limit pacing: 250ms polite pause between batches to protect free tier limit
    if (i + BATCH_SIZE < tvArray.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  const items = Array.from(itemsMap.values());
  console.log(`[TMDB] Total unique items collected: ${items.length}`);

  if (items.length === 0) {
    console.warn('[TMDB] No items collected to upsert.');
    return;
  }

  console.log(`[TMDB] Upserting ${items.length} items into database...`);
  const { upsertMany, close } = openDb();
  try {
    upsertMany(items);
    console.log(`✓ [TMDB] Successfully upserted ${items.length} items.`);
  } finally {
    close();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[TMDB] Done in ${elapsed}s.`);
}

main().catch((err) => {
  console.error('[TMDB] Fatal error during fetch job:', err);
  process.exit(1);
});
