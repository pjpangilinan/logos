// scripts/seed-db.js
// Creates (or resets) the items table in data/aggregator.db.
// Run: node scripts/seed-db.js

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'data', 'aggregator.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent-read performance (optional but good practice)
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id            TEXT PRIMARY KEY,
    type          TEXT NOT NULL,
    title         TEXT NOT NULL,
    date          TEXT,
    first_seen_at TEXT NOT NULL,
    source        TEXT NOT NULL,
    url           TEXT,
    image         TEXT,
    tags          TEXT DEFAULT '[]'
  );

  -- Index for "what's new" queries (sorted by first_seen_at)
  CREATE INDEX IF NOT EXISTS idx_items_first_seen
    ON items(first_seen_at DESC);

  -- Index for "release calendar" queries (sorted by date)
  CREATE INDEX IF NOT EXISTS idx_items_date
    ON items(date DESC);

  -- Index for type filtering
  CREATE INDEX IF NOT EXISTS idx_items_type
    ON items(type);
`);

const count = db.prepare('SELECT COUNT(*) as n FROM items').get();
console.log(`✓ Database seeded at ${DB_PATH}`);
console.log(`  Table "items" exists with ${count.n} row(s)`);
console.log(`  Indexes: idx_items_first_seen, idx_items_date, idx_items_type`);

db.close();
