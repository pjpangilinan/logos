import type { Item } from './db';
import type { UserPreferences } from './preferences';

export interface ScoredItem {
  item: Item;
  score: number;
  matchedTags: string[];
}

/**
 * Computes recommendation score and matching tags for a single item.
 */
export function scoreItem(item: Item, tagWeights: Record<string, number>): { score: number; matchedTags: string[] } {
  if (!item.tags || item.tags.length === 0 || Object.keys(tagWeights).length === 0) {
    return { score: 0, matchedTags: [] };
  }

  let rawScore = 0;
  const matchedTags: string[] = [];

  for (const tag of item.tags) {
    const clean = tag.trim();
    const weight = tagWeights[clean] || 0;
    if (weight > 0) {
      rawScore += weight;
      matchedTags.push(clean);
    }
  }

  if (rawScore <= 0) {
    return { score: 0, matchedTags: [] };
  }

  // Recency multiplier: slight boost for items discovered within the past 7 days
  let recencyMultiplier = 1.0;
  if (item.first_seen_at) {
    const ageMs = Date.now() - new Date(item.first_seen_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays <= 2) {
      recencyMultiplier = 1.25;
    } else if (ageDays <= 7) {
      recencyMultiplier = 1.1;
    }
  }

  const finalScore = Math.round(rawScore * recencyMultiplier * 10) / 10;
  return { score: finalScore, matchedTags };
}

/**
 * Filters and ranks all non-dismissed items based on user tag preferences.
 * Only returns items with a score > 0.
 */
export function getRecommendations(
  items: Item[],
  preferences: UserPreferences,
  limit: number = 100
): ScoredItem[] {
  const { dismissedIds, tagWeights } = preferences;
  const dismissedSet = new Set(dismissedIds);

  if (Object.keys(tagWeights).length === 0) {
    return [];
  }

  const scored: ScoredItem[] = [];

  for (const item of items) {
    if (dismissedSet.has(item.id)) continue;

    const { score, matchedTags } = scoreItem(item, tagWeights);
    if (score > 0) {
      scored.push({ item, score, matchedTags });
    }
  }

  // Sort by score descending; break ties with first_seen_at descending
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const timeA = new Date(a.item.first_seen_at).getTime() || 0;
    const timeB = new Date(b.item.first_seen_at).getTime() || 0;
    return timeB - timeA;
  });

  return scored.slice(0, limit);
}
