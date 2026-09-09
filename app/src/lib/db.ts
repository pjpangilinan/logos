import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Item {
  id: string;
  type: 'news' | 'movie' | 'tv' | 'game';
  title: string;
  date: string | null;
  first_seen_at: string;
  source: string;
  url: string | null;
  image: string | null;
  tags: string[];
}

export type ItemType = Item['type'];
export type SortMode = 'newest' | 'release';

export interface QueryFilters {
  type?: ItemType | null;
  sort?: SortMode;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Internal state ─────────────────────────────────────────────────────────

let db: SqlJsDatabase | null = null;
let loadingPromise: Promise<SqlJsDatabase> | null = null;

// ─── Base URL helper ────────────────────────────────────────────────────────

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    // Handle GitHub Pages project site path (/logos/ or /logos)
    if (pathname.startsWith('/logos')) {
      return `${origin}/logos/`;
    }
    const dir = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    return `${origin}${dir || '/'}`;
  }
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

/**
 * Initialize sql.js WASM and load aggregator.db.
 * Caches the result — safe to call multiple times.
 */
export async function loadDb(): Promise<SqlJsDatabase> {
  if (db) return db;
  if (loadingPromise) return loadingPromise;

  const baseUrl = getBaseUrl();

  loadingPromise = Promise.race([
    (async () => {
      // Fetch WASM engine and aggregator.db in parallel to avoid serial waterfall
      const [SQL, dbBuffer] = await Promise.all([
        initSqlJs({
          locateFile: (file: string) => `${baseUrl}${file}`,
        }),
        fetch(`${baseUrl}aggregator.db`).then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch aggregator.db: HTTP ${response.status} ${response.statusText}`);
          }
          return response.arrayBuffer();
        }),
      ]);

      db = new SQL.Database(new Uint8Array(dbBuffer));
      return db;
    })(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Timed out initializing SQLite WASM database after 45s. Please reload or check your connection.')),
        45000
      )
    ),
  ]).catch((err) => {
    // Reset so user can retry without getting a permanently failed promise
    loadingPromise = null;
    throw err;
  });

  return loadingPromise;
}

// ─── Row mapper ─────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    type: row.type as Item['type'],
    title: row.title as string,
    date: (row.date as string) || null,
    first_seen_at: row.first_seen_at as string,
    source: row.source as string,
    url: (row.url as string) || null,
    image: (row.image as string) || null,
    tags: JSON.parse((row.tags as string) || '[]'),
  };
}

/**
 * Deduplicate items by type, normalized title (alphanumeric only), and release year.
 * Keeps the item with canonical punctuation or image/richer metadata.
 */
export function deduplicateItems(items: Item[]): Item[] {
  const seen = new Map<string, Item>();

  for (const item of items) {
    const cleanTitle = (item.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const year = (item.date || '').slice(0, 4);
    const key = `${item.type}:${cleanTitle}:${year}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
      continue;
    }

    const existingPunct = (existing.title.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const currentPunct = (item.title.match(/[^a-zA-Z0-9\s]/g) || []).length;

    if (currentPunct > existingPunct || (!existing.image && item.image)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}

/** Run a SELECT and return mapped Item[] */
function query(sql: string, params: Record<string, unknown> = {}): Item[] {
  if (!db) throw new Error('Database not loaded. Call loadDb() first.');

  const stmt = db.prepare(sql);
  stmt.bind(params as Record<string, number | string | Uint8Array | null>);
  const results: Item[] = [];
  while (stmt.step()) {
    results.push(mapRow(stmt.getAsObject()));
  }
  stmt.free();
  return deduplicateItems(results);
}

// ─── Public query functions ─────────────────────────────────────────────────

/**
 * Get items with optional filtering, sorting, and pagination.
 */
export function getItems(filters: QueryFilters = {}): Item[] {
  const { type, sort = 'newest', search, limit = 100, offset = 0 } = filters;
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (type) {
    conditions.push('type = $type');
    params.$type = type;
  }

  if (search) {
    conditions.push('title LIKE $search');
    params.$search = `%${search}%`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = sort === 'release' ? 'date DESC NULLS LAST' : 'first_seen_at DESC';

  return query(
    `SELECT * FROM items ${where} ORDER BY ${orderBy} LIMIT $limit OFFSET $offset`,
    { ...params, $limit: limit, $offset: offset }
  );
}

/**
 * Get items of a specific type.
 */
export function getItemsByType(type: ItemType): Item[] {
  return getItems({ type });
}

/**
 * Get the newest items (by first_seen_at) since a given ISO timestamp.
 */
export function getNewItemsSince(since: string): Item[] {
  return query(
    'SELECT * FROM items WHERE first_seen_at > $since ORDER BY first_seen_at DESC',
    { $since: since }
  );
}

/**
 * Get upcoming items (date in the future), sorted by release date ascending.
 */
export function getUpcoming(): Item[] {
  const today = new Date().toISOString().split('T')[0];
  return query(
    'SELECT * FROM items WHERE date > $today ORDER BY date ASC',
    { $today: today }
  );
}

/**
 * Get a count of items by type.
 */
export function getCountsByType(): Record<string, number> {
  if (!db) throw new Error('Database not loaded. Call loadDb() first.');

  const stmt = db.prepare('SELECT type, COUNT(*) as count FROM items GROUP BY type');
  const counts: Record<string, number> = {};
  while (stmt.step()) {
    const row = stmt.getAsObject();
    counts[row.type as string] = row.count as number;
  }
  stmt.free();
  return counts;
}

/**
 * Get total item count.
 */
export function getTotalCount(): number {
  if (!db) throw new Error('Database not loaded. Call loadDb() first.');

  const stmt = db.prepare('SELECT COUNT(*) as count FROM items');
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  return result.count as number;
}
