// scripts/lib/db-helpers.js
// Shared database helpers for all fetch scripts.
// Centralizes the upsert logic so every script handles first_seen_at consistently.

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', '..', 'data', 'aggregator.db');

/**
 * Open the database and return { db, upsert, close }.
 *
 * upsert(item) inserts a new row or updates an existing one,
 * but NEVER overwrites first_seen_at on existing rows.
 */
export function openDb(dbPath = DB_PATH) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id            TEXT PRIMARY KEY,
      type          TEXT,
      title         TEXT,
      date          TEXT,
      first_seen_at TEXT,
      source        TEXT,
      url           TEXT,
      image         TEXT,
      tags          TEXT
    );
  `);

  const upsertStmt = db.prepare(`
    INSERT INTO items (id, type, title, date, first_seen_at, source, url, image, tags)
    VALUES (@id, @type, @title, @date, @first_seen_at, @source, @url, @image, @tags)
    ON CONFLICT(id) DO UPDATE SET
      type   = excluded.type,
      title  = excluded.title,
      date   = excluded.date,
      source = excluded.source,
      url    = excluded.url,
      image  = excluded.image,
      tags   = excluded.tags
    -- first_seen_at is intentionally NOT in the UPDATE set
  `);

  const now = new Date().toISOString();

  /**
   * @param {object} item
   * @param {string} item.id          - e.g. "tmdb:12345"
   * @param {string} item.type        - news | movie | tv | game
   * @param {string} item.title
   * @param {string|null} item.date   - ISO 8601 release/publish date
   * @param {string} item.source      - e.g. tmdb / rawg / rss:techcrunch
   * @param {string|null} item.url
   * @param {string|null} item.image
   * @param {string[]} item.tags      - array of tag strings
   */
  function upsert(item) {
    upsertStmt.run({
      id: item.id,
      type: item.type,
      title: item.title,
      date: item.date || null,
      first_seen_at: now,   // only written on INSERT, ignored on UPDATE
      source: item.source,
      url: item.url || null,
      image: item.image || null,
      tags: JSON.stringify(item.tags || []),
    });
  }

  /**
   * Batch upsert inside a single transaction for performance.
   * @param {object[]} items
   */
  function upsertMany(items) {
    const tx = db.transaction((rows) => {
      for (const row of rows) {
        upsert(row);
      }
    });
    tx(items);
  }

  function close() {
    db.close();
  }

  return { db, upsert, upsertMany, close };
}
