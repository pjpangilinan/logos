import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchItemSearch } from '../src/lib/search.ts';

describe('matchItemSearch', () => {
  const item = {
    id: 'tmdb:movie:123',
    type: 'movie',
    title: 'Cyberpunk Odyssey',
    date: '2026-11-20',
    first_seen_at: '2026-10-10T12:00:00Z',
    source: 'tmdb',
    url: 'https://tmdb.org/movie/123',
    image: null,
    tags: ['Sci-Fi', 'Action', 'Apple TV+'],
  };

  it('matches empty query to true', () => {
    assert.equal(matchItemSearch(item, ''), true);
    assert.equal(matchItemSearch(item, '   '), true);
  });

  it('matches single token on title', () => {
    assert.equal(matchItemSearch(item, 'cyberpunk'), true);
    assert.equal(matchItemSearch(item, 'Odyssey'), true);
    assert.equal(matchItemSearch(item, 'ghost'), false);
  });

  it('matches multi-token across title and tags', () => {
    assert.equal(matchItemSearch(item, 'cyberpunk sci-fi'), true);
    assert.equal(matchItemSearch(item, 'odyssey apple'), true);
    assert.equal(matchItemSearch(item, 'cyberpunk netflix'), false);
  });

  it('supports type: prefix', () => {
    assert.equal(matchItemSearch(item, 'type:movie cyberpunk'), true);
    assert.equal(matchItemSearch(item, 'type:game cyberpunk'), false);
  });

  it('supports source: prefix', () => {
    assert.equal(matchItemSearch(item, 'source:tmdb odyssey'), true);
    assert.equal(matchItemSearch(item, 'source:rawg odyssey'), false);
  });

  it('supports tag: prefix', () => {
    assert.equal(matchItemSearch(item, 'tag:action'), true);
    assert.equal(matchItemSearch(item, 'tag:comedy'), false);
  });
});
