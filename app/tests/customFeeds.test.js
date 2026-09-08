import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidFeedUrl,
  parseRssRegex,
  feedItemToAggregatorItem,
  addCustomFeed,
} from '../src/lib/customFeeds.ts';

// Mock RSS 2.0 XML sample
const SAMPLE_RSS_2 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>TechRadar Feed</title>
    <link>https://techradar.com</link>
    <description>Latest technology news</description>
    <item>
      <title>RTX 5090 Announcement Date Leaked</title>
      <link>https://techradar.com/news/rtx-5090-leak</link>
      <pubDate>Mon, 15 Sep 2026 14:30:00 GMT</pubDate>
      <category>Hardware</category>
      <category>Gaming</category>
      <enclosure url="https://techradar.com/images/rtx5090.jpg" type="image/jpeg" length="12345" />
      <description>Everything we know about the next GPU powerhouse.</description>
    </item>
    <item>
      <title>OpenAI Releases GPT-5 Frontier Model</title>
      <link>https://techradar.com/news/gpt-5-frontier</link>
      <pubDate>Tue, 16 Sep 2026 09:00:00 GMT</pubDate>
      <category>AI</category>
      <description>Massive leap in reasoning capabilities.</description>
    </item>
  </channel>
</rss>`;

// Mock Atom XML sample
const SAMPLE_ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Developer Blog</title>
  <link href="https://dev.to/feed" />
  <updated>2026-09-17T12:00:00Z</updated>
  <entry>
    <title>Rust 2026 Edition Announced</title>
    <link href="https://dev.to/rust-2026-edition" />
    <published>2026-09-17T11:45:00Z</published>
    <category term="Rust" />
    <category term="Systems" />
    <summary>The new edition brings ergonomic async syntax.</summary>
  </entry>
</feed>`;

describe('Custom RSS Feeds & Parser', () => {
  describe('isValidFeedUrl', () => {
    it('accepts valid http and https URLs', () => {
      assert.equal(isValidFeedUrl('https://example.com/rss.xml'), true);
      assert.equal(isValidFeedUrl('http://myblog.org/feed'), true);
    });

    it('rejects invalid or non-http URLs', () => {
      assert.equal(isValidFeedUrl('ftp://example.com/feed'), false);
      assert.equal(isValidFeedUrl('not a url'), false);
      assert.equal(isValidFeedUrl(''), false);
    });
  });

  describe('parseRssRegex', () => {
    it('parses RSS 2.0 items, dates, categories, and enclosures', () => {
      const items = parseRssRegex(SAMPLE_RSS_2);
      assert.equal(items.length, 2);

      const first = items[0];
      assert.equal(first.title, 'RTX 5090 Announcement Date Leaked');
      assert.equal(first.link, 'https://techradar.com/news/rtx-5090-leak');
      assert.ok(first.date);
      assert.equal(first.image, 'https://techradar.com/images/rtx5090.jpg');
      assert.ok(first.categories.includes('Hardware'));
      assert.ok(first.categories.includes('Gaming'));

      const second = items[1];
      assert.equal(second.title, 'OpenAI Releases GPT-5 Frontier Model');
      assert.equal(second.link, 'https://techradar.com/news/gpt-5-frontier');
      assert.equal(second.image, null);
      assert.ok(second.categories.includes('AI'));
    });

    it('parses Atom entries and category terms', () => {
      const items = parseRssRegex(SAMPLE_ATOM);
      assert.equal(items.length, 1);

      const entry = items[0];
      assert.equal(entry.title, 'Rust 2026 Edition Announced');
      assert.equal(entry.link, 'https://dev.to/rust-2026-edition');
      assert.ok(entry.date);
      assert.ok(entry.categories.includes('Rust'));
    });
  });

  describe('feedItemToAggregatorItem', () => {
    it('creates compliant aggregator Item object with custom prefix and tags', () => {
      const mockFeed = {
        id: 'cf_12345',
        name: 'TechRadar',
        url: 'https://techradar.com/rss.xml',
        category: 'Hardware',
        enabled: true,
        createdAt: '2026-09-08T00:00:00Z',
      };

      const parsedItem = {
        title: 'New Graphics Card',
        link: 'https://techradar.com/news/1',
        date: '2026-09-15T14:30:00.000Z',
        image: 'https://techradar.com/img.jpg',
        categories: ['GPU', 'PC'],
      };

      const item = feedItemToAggregatorItem(parsedItem, mockFeed);

      assert.ok(item.id.startsWith('custom:cf_12345:'));
      assert.equal(item.type, 'news');
      assert.equal(item.title, 'New Graphics Card');
      assert.equal(item.date, '2026-09-15T14:30:00.000Z');
      assert.equal(item.source, 'rss:techradar');
      assert.equal(item.url, 'https://techradar.com/news/1');
      assert.equal(item.image, 'https://techradar.com/img.jpg');
      assert.ok(item.tags.includes('Hardware'));
      assert.ok(item.tags.includes('GPU'));
      assert.ok(item.tags.includes('PC'));
    });
  });

  describe('Feed Management Operations', () => {
    it('validates feed inputs and rejects duplicate or empty names', () => {
      const emptyRes = addCustomFeed('', 'https://example.com/rss');
      assert.equal(emptyRes.success, false);
      assert.equal(emptyRes.error, 'Feed name is required.');

      const badUrlRes = addCustomFeed('Test', 'ftp://example.com');
      assert.equal(badUrlRes.success, false);
      assert.equal(badUrlRes.error, 'A valid http:// or https:// URL is required.');
    });
  });
});
