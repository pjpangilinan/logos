// scripts/fetch-rss.js
// Fetches news from Philippines and Tech RSS feeds and upserts them into data/aggregator.db.

import { createHash } from 'crypto';
import Parser from 'rss-parser';
import { openDb } from './lib/db-helpers.js';

const FEEDS = [
  // Philippines
  { url: 'https://www.rappler.com/feed/', name: 'rappler', label: 'Philippines' },
  { url: 'https://newsinfo.inquirer.net/feed', name: 'inquirer', label: 'Philippines' },
  { url: 'https://www.philstar.com/rss/headlines', name: 'philstar', label: 'Philippines' },
  // Tech
  { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'arstechnica', label: 'Tech' },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'theverge', label: 'Tech' },
  { url: 'https://techcrunch.com/feed/', name: 'techcrunch', label: 'Tech' },
  { url: 'https://hnrss.org/frontpage', name: 'hackernews', label: 'Tech' },
];

const parser = new Parser({
  customFields: {
    item: ['media:content'],
  },
});

function hashString(str) {
  return createHash('md5').update(str).digest('hex').slice(0, 12);
}

function parseDate(item) {
  if (item.isoDate) {
    return item.isoDate;
  }
  if (item.pubDate) {
    try {
      const d = new Date(item.pubDate);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    } catch {
      // ignore bad date format
    }
  }
  return null;
}

function extractImage(item) {
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  if (item['media:content']?.$.url) {
    return item['media:content'].$.url;
  }
  if (Array.isArray(item['media:content']) && item['media:content'][0]?.$.url) {
    return item['media:content'][0].$.url;
  }
  return null;
}

function extractTags(feed, item) {
  const tags = new Set();
  if (feed.label) {
    tags.add(feed.label);
  }
  if (Array.isArray(item.categories)) {
    for (const cat of item.categories) {
      if (typeof cat === 'string' && cat.trim()) {
        tags.add(cat.trim());
      } else if (cat && typeof cat._ === 'string' && cat._.trim()) {
        tags.add(cat._.trim());
      }
    }
  } else if (typeof item.categories === 'string' && item.categories.trim()) {
    tags.add(item.categories.trim());
  }
  return Array.from(tags);
}

function normalizeItem(feed, item) {
  const rawId = (typeof item.guid === 'string' ? item.guid : item.guid?._) || item.link || item.id || item.title || '';
  const hash = hashString(String(rawId));

  return {
    id: `rss:${feed.name}:${hash}`,
    type: 'news',
    title: item.title || 'Untitled',
    date: parseDate(item),
    source: `rss:${feed.name}`,
    url: item.link || null,
    image: extractImage(item),
    tags: extractTags(feed, item),
  };
}

async function fetchFeed(feed, upsertMany) {
  console.log(`Fetching [${feed.name}] (${feed.label}): ${feed.url}...`);
  try {
    const feedData = await parser.parseURL(feed.url);
    const rawItems = feedData.items || [];
    const normalizedItems = rawItems.map((item) => normalizeItem(feed, item));

    upsertMany(normalizedItems);
    console.log(`✓ [${feed.name}] Successfully fetched and upserted ${normalizedItems.length} items`);
    return { feed: feed.name, count: normalizedItems.length };
  } catch (err) {
    console.warn(`⚠ [${feed.name}] Failed to fetch feed (${feed.url}): ${err.message}`);
    throw err;
  }
}

async function main() {
  console.log(`Starting RSS feed fetch for ${FEEDS.length} feeds...`);
  const { upsertMany, close } = openDb();
  let allFailed = false;

  try {
    const results = await Promise.allSettled(
      FEEDS.map((feed) => fetchFeed(feed, upsertMany))
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    const totalUpserted = fulfilled.reduce((sum, r) => sum + r.value.count, 0);

    console.log('\n--- RSS Fetch Summary ---');
    console.log(`Successful feeds: ${fulfilled.length}/${FEEDS.length}`);
    console.log(`Failed feeds:     ${rejected.length}/${FEEDS.length}`);
    console.log(`Total items:      ${totalUpserted}`);

    if (fulfilled.length === 0) {
      console.error('Error: All feeds failed to fetch.');
      allFailed = true;
    }
  } finally {
    close();
  }

  if (allFailed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running fetch-rss script:', err);
  process.exit(1);
});
