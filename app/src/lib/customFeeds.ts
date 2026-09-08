import type { Item } from './db';

export interface CustomFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  createdAt: string;
}

export interface ParsedFeedItem {
  title: string;
  link: string;
  date: string | null;
  description?: string;
  image?: string | null;
  categories: string[];
}

const STORAGE_KEY = 'logos_custom_feeds_v1';

/**
 * Load custom feeds from localStorage.
 */
export function loadCustomFeeds(): CustomFeed[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save custom feeds to localStorage.
 */
export function saveCustomFeeds(feeds: CustomFeed[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
  } catch (err) {
    console.error('Failed to save custom feeds:', err);
  }
}

/**
 * Validate feed URL format.
 */
export function isValidFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Add a new custom feed to storage.
 */
export function addCustomFeed(
  name: string,
  url: string,
  category: string = 'Tech'
): { success: boolean; feed?: CustomFeed; error?: string } {
  const cleanName = name.trim();
  const cleanUrl = url.trim();
  const cleanCat = category.trim() || 'Tech';

  if (!cleanName) {
    return { success: false, error: 'Feed name is required.' };
  }

  if (!isValidFeedUrl(cleanUrl)) {
    return { success: false, error: 'A valid http:// or https:// URL is required.' };
  }

  const existing = loadCustomFeeds();
  if (existing.some((f) => f.url.toLowerCase() === cleanUrl.toLowerCase())) {
    return { success: false, error: 'Feed URL is already added.' };
  }

  const newFeed: CustomFeed = {
    id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    url: cleanUrl,
    category: cleanCat,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  saveCustomFeeds([...existing, newFeed]);
  return { success: true, feed: newFeed };
}

/**
 * Toggle a custom feed's enabled state.
 */
export function toggleCustomFeed(id: string): CustomFeed[] {
  const existing = loadCustomFeeds();
  const updated = existing.map((f) =>
    f.id === id ? { ...f, enabled: !f.enabled } : f
  );
  saveCustomFeeds(updated);
  return updated;
}

/**
 * Delete a custom feed by ID.
 */
export function removeCustomFeed(id: string): CustomFeed[] {
  const existing = loadCustomFeeds();
  const updated = existing.filter((f) => f.id !== id);
  saveCustomFeeds(updated);
  return updated;
}

/**
 * Extract image URL from XML element or HTML snippet.
 */
export function extractImageFromXml(entry: Element): string | null {
  // 1. Check enclosure with image type
  const enclosure = entry.querySelector('enclosure');
  if (enclosure) {
    const url = enclosure.getAttribute('url');
    const type = enclosure.getAttribute('type') || '';
    if (url && (type.startsWith('image/') || url.match(/\.(jpg|jpeg|png|webp|gif)/i))) {
      return url;
    }
  }

  // 2. Check media:content or media:thumbnail
  const mediaContent = entry.querySelector('content[url], thumbnail[url], content, thumbnail');
  if (mediaContent) {
    const url = mediaContent.getAttribute('url');
    if (url) return url;
  }

  // 3. Check <img> in description or content
  const desc = entry.querySelector('description, content, summary')?.textContent || '';
  const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }

  return null;
}

/**
 * Parse an XML string (RSS 2.0 or Atom) into normalized feed items.
 * Can be run in browser or Node test runner.
 */
export function parseRssXml(xmlText: string, DOMParserImpl?: typeof DOMParser): ParsedFeedItem[] {
  let doc: Document;

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlText, 'application/xml');
  } else if (DOMParserImpl) {
    const parser = new DOMParserImpl();
    doc = parser.parseFromString(xmlText, 'application/xml');
  } else {
    // Basic regex fallback for testing without full DOMParser
    return parseRssRegex(xmlText);
  }

  const items: ParsedFeedItem[] = [];

  // Check for RSS 2.0 <item>
  const rssItems = Array.from(doc.querySelectorAll('item'));
  if (rssItems.length > 0) {
    for (const el of rssItems) {
      const title = el.querySelector('title')?.textContent?.trim() || 'Untitled';
      const link = el.querySelector('link')?.textContent?.trim() || '';
      const pubDate = el.querySelector('pubDate, date')?.textContent?.trim() || null;
      let dateIso: string | null = null;
      if (pubDate) {
        try {
          const d = new Date(pubDate);
          if (!isNaN(d.getTime())) dateIso = d.toISOString();
        } catch {
          // ignore bad date
        }
      }

      const categories: string[] = [];
      const catEls = Array.from(el.querySelectorAll('category'));
      for (const cat of catEls) {
        const text = cat.textContent?.trim();
        if (text) categories.push(text);
      }

      const image = extractImageFromXml(el);

      items.push({
        title,
        link,
        date: dateIso,
        image,
        categories,
      });
    }
    return items;
  }

  // Check for Atom <entry>
  const atomEntries = Array.from(doc.querySelectorAll('entry'));
  for (const el of atomEntries) {
    const title = el.querySelector('title')?.textContent?.trim() || 'Untitled';
    const linkEl = el.querySelector('link[rel="alternate"], link:not([rel])') || el.querySelector('link');
    const link = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || '';
    const updated = el.querySelector('updated, published')?.textContent?.trim() || null;
    let dateIso: string | null = null;
    if (updated) {
      try {
        const d = new Date(updated);
        if (!isNaN(d.getTime())) dateIso = d.toISOString();
      } catch {
        // ignore
      }
    }

    const categories: string[] = [];
    const catEls = Array.from(el.querySelectorAll('category'));
    for (const cat of catEls) {
      const term = cat.getAttribute('term') || cat.textContent?.trim();
      if (term) categories.push(term);
    }

    const image = extractImageFromXml(el);

    items.push({
      title,
      link,
      date: dateIso,
      image,
      categories,
    });
  }

  return items;
}

/**
 * Fallback regex XML parser for Node or environments without DOMParser.
 */
export function parseRssRegex(xml: string): ParsedFeedItem[] {
  const items: ParsedFeedItem[] = [];

  // Match <item>...</item> blocks
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const block of itemBlocks) {
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch =
      block.match(/<link[^>]*href=["']([^"']+)["']/i) ||
      block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const dateMatch =
      block.match(/<(?:pubDate|updated|published|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|updated|published|dc:date)>/i);
    const imageMatch = block.match(/<(?:enclosure|media:content)[^>]*url=["']([^"']+)["']/i);

    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    const link = linkMatch ? linkMatch[1].trim() : '';

    let dateIso: string | null = null;
    if (dateMatch) {
      try {
        const d = new Date(dateMatch[1].trim());
        if (!isNaN(d.getTime())) dateIso = d.toISOString();
      } catch {
        // ignore
      }
    }

    // Categories: handle both RSS 2.0 <category>Text</category> and Atom <category term="Text" />
    const categories: string[] = [];
    const catTags = block.matchAll(/<category([^>]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>|<category([^>]*)\/>/gi);
    for (const m of catTags) {
      const attrs = (m[1] || m[3] || '');
      const termMatch = attrs.match(/term=["']([^"']+)["']/i);
      if (termMatch && termMatch[1]) {
        categories.push(termMatch[1].trim());
      } else if (m[2] && m[2].trim()) {
        categories.push(m[2].trim());
      }
    }

    items.push({
      title,
      link,
      date: dateIso,
      image: imageMatch ? imageMatch[1] : null,
      categories,
    });
  }

  return items;
}

/**
 * Simple 32-bit hash for stable item IDs.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Convert a parsed custom feed entry to the standard aggregator Item schema.
 */
export function feedItemToAggregatorItem(item: ParsedFeedItem, feed: CustomFeed): Item {
  const rawId = `${feed.id}:${item.link || item.title}`;
  const hash = simpleHash(rawId);
  const now = new Date().toISOString();

  const tags = new Set<string>();
  if (feed.category) tags.add(feed.category);
  for (const c of item.categories) {
    if (c && c.length < 25) tags.add(c);
  }

  return {
    id: `custom:${feed.id}:${hash}`,
    type: 'news',
    title: item.title,
    date: item.date,
    first_seen_at: item.date || now,
    source: `rss:${feed.name.toLowerCase().replace(/\s+/g, '-')}`,
    url: item.link || null,
    image: item.image || null,
    tags: Array.from(tags),
  };
}

/**
 * Fetch and parse an individual custom feed.
 * Handles CORS proxy fallbacks if direct origin request is blocked.
 */
export async function fetchAndParseFeed(feed: CustomFeed): Promise<Item[]> {
  if (!feed.enabled) return [];

  let xmlText = '';

  // 1. Try direct fetch
  try {
    const res = await fetch(feed.url, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
    if (res.ok) {
      xmlText = await res.text();
    }
  } catch {
    // Direct fetch failed (likely CORS)
  }

  // 2. If direct fetch returned nothing, use public CORS proxy fallback
  if (!xmlText) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        xmlText = await res.text();
      }
    } catch {
      // Proxy failed
    }
  }

  if (!xmlText) {
    console.warn(`[CustomFeed] Could not fetch feed from ${feed.url}`);
    return [];
  }

  const parsed = parseRssXml(xmlText);
  return parsed.map((it) => feedItemToAggregatorItem(it, feed));
}

/**
 * Fetch all enabled custom feeds and return merged items.
 */
export async function fetchAllActiveCustomFeeds(feeds: CustomFeed[]): Promise<Item[]> {
  const enabled = feeds.filter((f) => f.enabled);
  if (enabled.length === 0) return [];

  const results = await Promise.allSettled(
    enabled.map((feed) => fetchAndParseFeed(feed))
  );

  const allItems: Item[] = [];
  for (const res of results) {
    if (res.status === 'fulfilled') {
      allItems.push(...res.value);
    }
  }

  return allItems;
}
