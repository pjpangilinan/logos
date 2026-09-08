// scripts/lib/normalization-helpers.js
// Shared normalization logic for TMDB and RAWG with streaming providers and platforms.

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Normalize provider names to canonical brand names.
 * @param {string} name
 * @returns {string|null}
 */
export function cleanProviderName(name) {
  if (!name || typeof name !== 'string') return null;
  const lower = name.toLowerCase().trim();

  if (lower.includes('apple tv')) return 'Apple TV+';
  if (lower.includes('netflix')) return 'Netflix';
  if (lower === 'max' || lower.includes('hbo max') || lower === 'hbo') return 'Max';
  if (lower.includes('prime video') || lower.includes('amazon prime') || lower === 'amazon') return 'Prime Video';
  if (lower.includes('disney')) return 'Disney+';
  if (lower.includes('hulu')) return 'Hulu';
  if (lower.includes('paramount')) return 'Paramount+';
  if (lower.includes('peacock')) return 'Peacock';
  if (lower.includes('crunchyroll')) return 'Crunchyroll';

  return name.trim();
}

/**
 * Normalize gaming platform and store names to canonical labels.
 * @param {string} name
 * @returns {string|null}
 */
export function cleanPlatformName(name) {
  if (!name || typeof name !== 'string') return null;
  const lower = name.toLowerCase().trim();

  if (lower === 'pc') return 'PC';
  if (lower.includes('playstation 5') || lower === 'ps5') return 'PlayStation 5';
  if (lower.includes('playstation 4') || lower === 'ps4') return 'PlayStation 4';
  if (lower.includes('series s/x') || lower.includes('series x') || lower.includes('series x/s')) return 'Xbox Series X';
  if (lower.includes('xbox one')) return 'Xbox One';
  if (lower.includes('switch') || lower.includes('nintendo switch')) return 'Nintendo Switch';
  if (lower.includes('steam')) return 'Steam';
  if (lower.includes('epic games')) return 'Epic Games';
  if (lower.includes('gog')) return 'GOG';
  if (lower.includes('game pass')) return 'Game Pass';

  return name.trim();
}

/**
 * Extract streaming provider names from TMDB watch providers response.
 * @param {object|null} watchProvidersData
 * @param {string} countryCode
 * @returns {string[]}
 */
export function extractWatchProviders(watchProvidersData, countryCode = 'US') {
  if (!watchProvidersData?.results) return [];
  const country = watchProvidersData.results[countryCode] || watchProvidersData.results['US'] || Object.values(watchProvidersData.results)[0];
  if (!country) return [];

  const providers = [];
  const flatrate = country.flatrate || [];
  const free = country.free || [];
  const ads = country.ads || [];

  for (const item of [...flatrate, ...free, ...ads]) {
    const cleaned = cleanProviderName(item.provider_name);
    if (cleaned) providers.push(cleaned);
  }

  return [...new Set(providers)];
}

/**
 * Normalize TMDB movie item to aggregator schema.
 * @param {object} item
 * @param {Map<number, string>} movieGenres
 * @param {Map<number, string>} tvGenres
 * @param {object|null} watchProviders
 * @returns {object}
 */
export function normalizeMovie(item, movieGenres = new Map(), tvGenres = new Map(), watchProviders = null) {
  const poster = item.poster_path
    ? `${IMAGE_BASE_URL}${item.poster_path.startsWith('/') ? item.poster_path : `/${item.poster_path}`}`
    : null;

  const genres = (item.genre_ids || [])
    .map((id) => movieGenres.get(id) || tvGenres.get(id))
    .filter(Boolean);

  const providers = extractWatchProviders(watchProviders);

  // Providers first, then genres
  const allTags = [...providers, ...genres];

  return {
    id: `tmdb:movie:${item.id}`,
    type: 'movie',
    title: item.title || item.original_title || 'Untitled',
    date: item.release_date || null,
    source: 'tmdb',
    url: `https://www.themoviedb.org/movie/${item.id}`,
    image: poster,
    tags: [...new Set(allTags)],
  };
}

/**
 * Normalize TMDB TV item to aggregator schema with episode release dates and network/provider tags.
 * @param {object} item
 * @param {Map<number, string>} movieGenres
 * @param {Map<number, string>} tvGenres
 * @param {object|null} episodeDetail
 * @param {object|null} watchProviders
 * @returns {object}
 */
export function normalizeTv(item, movieGenres = new Map(), tvGenres = new Map(), episodeDetail = null, watchProviders = null) {
  const poster = item.poster_path
    ? `${IMAGE_BASE_URL}${item.poster_path.startsWith('/') ? item.poster_path : `/${item.poster_path}`}`
    : null;

  const genres = (item.genre_ids || [])
    .map((id) => tvGenres.get(id) || movieGenres.get(id))
    .filter(Boolean);

  let releaseDate = item.first_air_date || null;
  const showTitle = item.name || item.original_name || 'Untitled';
  let displayTitle = showTitle;
  const prefixes = [];

  // Networks from episode details (e.g. Apple TV+, HBO, Netflix)
  const networkTags = (episodeDetail?.networks || [])
    .map((n) => cleanProviderName(n.name))
    .filter(Boolean);

  const providers = extractWatchProviders(watchProviders);

  if (episodeDetail?.next_episode_to_air) {
    const nextEp = episodeDetail.next_episode_to_air;
    releaseDate = nextEp.air_date || releaseDate;
    const epCode = `S${String(nextEp.season_number).padStart(2, '0')}E${String(nextEp.episode_number).padStart(2, '0')}`;
    prefixes.push(epCode);
    if (nextEp.name && nextEp.name !== `Episode ${nextEp.episode_number}`) {
      displayTitle = `${showTitle} (${epCode}: ${nextEp.name})`;
    } else {
      displayTitle = `${showTitle} (${epCode})`;
    }
  } else if (episodeDetail?.last_episode_to_air) {
    const lastEp = episodeDetail.last_episode_to_air;
    releaseDate = lastEp.air_date || releaseDate;
    const epCode = `S${String(lastEp.season_number).padStart(2, '0')}E${String(lastEp.episode_number).padStart(2, '0')}`;
    prefixes.push(epCode);
  }

  const allTags = [...prefixes, ...networkTags, ...providers, ...genres];

  return {
    id: `tmdb:tv:${item.id}`,
    type: 'tv',
    title: displayTitle,
    date: releaseDate,
    source: 'tmdb',
    url: `https://www.themoviedb.org/tv/${item.id}`,
    image: poster,
    tags: [...new Set(allTags)],
  };
}

/**
 * Normalize a RAWG game object into the aggregator item shape with platforms and stores.
 * @param {object} game
 * @returns {object|null}
 */
export function normalizeGame(game) {
  if (!game || !game.id) {
    return null;
  }

  // Extract platforms
  const platforms = Array.isArray(game.platforms)
    ? game.platforms
        .map((p) => cleanPlatformName(p.platform?.name))
        .filter(Boolean)
    : [];

  // Extract stores
  const stores = Array.isArray(game.stores)
    ? game.stores
        .map((s) => cleanPlatformName(s.store?.name))
        .filter(Boolean)
    : [];

  // Extract genres
  const genres = Array.isArray(game.genres)
    ? game.genres.map((g) => g.name).filter(Boolean)
    : [];

  const allTags = [...platforms, ...stores, ...genres];

  return {
    id: `rawg:${game.id}`,
    type: 'game',
    title: game.name || 'Untitled Game',
    date: game.released || null,
    source: 'rawg',
    url: game.slug ? `https://rawg.io/games/${game.slug}` : null,
    image: game.background_image || null,
    tags: [...new Set(allTags)],
  };
}
