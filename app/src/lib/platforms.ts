import type { Item } from './db';

export interface PlatformBadge {
  name: string;
  category: 'streaming' | 'gaming';
  badgeStyle?: string;
}

export const KNOWN_STREAMING_PROVIDERS = [
  'Apple TV+',
  'Netflix',
  'Max',
  'Prime Video',
  'Disney+',
  'Hulu',
  'Paramount+',
  'Peacock',
  'Crunchyroll',
] as const;

export const KNOWN_GAMING_PLATFORMS = [
  'Steam',
  'PlayStation 5',
  'PlayStation 4',
  'Xbox Series X',
  'Xbox One',
  'Nintendo Switch',
  'PC',
  'Epic Games',
  'Game Pass',
] as const;

const STREAMING_SET = new Set<string>(
  KNOWN_STREAMING_PROVIDERS.map((s) => s.toLowerCase())
);

const GAMING_SET = new Set<string>(
  KNOWN_GAMING_PLATFORMS.map((g) => g.toLowerCase())
);

/**
 * Check if a tag corresponds to a known streaming service.
 */
export function isStreamingProvider(tag: string): boolean {
  if (!tag) return false;
  const lower = tag.toLowerCase().trim();
  if (STREAMING_SET.has(lower)) return true;
  if (lower.includes('apple tv')) return true;
  if (lower.includes('netflix')) return true;
  if (lower === 'max' || lower.includes('hbo')) return true;
  if (lower.includes('prime video') || lower === 'amazon') return true;
  if (lower.includes('disney')) return true;
  if (lower.includes('hulu')) return true;
  return false;
}

/**
 * Check if a tag corresponds to a gaming platform or store.
 */
export function isGamingPlatform(tag: string): boolean {
  if (!tag) return false;
  const lower = tag.toLowerCase().trim();
  if (GAMING_SET.has(lower)) return true;
  if (lower === 'pc') return true;
  if (lower.includes('playstation') || lower === 'ps5' || lower === 'ps4') return true;
  if (lower.includes('xbox')) return true;
  if (lower.includes('switch')) return true;
  if (lower.includes('steam')) return true;
  if (lower.includes('epic games')) return true;
  return false;
}

/**
 * Extract canonical platform & provider badges for an item.
 */
export function extractPlatformBadges(item: Item): PlatformBadge[] {
  if (!item || !Array.isArray(item.tags)) return [];

  const badges: PlatformBadge[] = [];
  const seen = new Set<string>();

  for (const tag of item.tags) {
    const cleanTag = tag.trim();
    if (!cleanTag) continue;

    if (isStreamingProvider(cleanTag)) {
      let canonical = cleanTag;
      const lower = cleanTag.toLowerCase();
      if (lower.includes('apple tv')) canonical = 'Apple TV+';
      else if (lower.includes('netflix')) canonical = 'Netflix';
      else if (lower === 'max' || lower.includes('hbo')) canonical = 'Max';
      else if (lower.includes('prime') || lower === 'amazon') canonical = 'Prime Video';
      else if (lower.includes('disney')) canonical = 'Disney+';
      else if (lower.includes('hulu')) canonical = 'Hulu';

      if (!seen.has(canonical)) {
        seen.add(canonical);
        badges.push({ name: canonical, category: 'streaming' });
      }
    } else if (isGamingPlatform(cleanTag)) {
      let canonical = cleanTag;
      const lower = cleanTag.toLowerCase();
      if (lower === 'ps5' || lower.includes('playstation 5')) canonical = 'PlayStation 5';
      else if (lower === 'ps4' || lower.includes('playstation 4')) canonical = 'PlayStation 4';
      else if (lower.includes('series')) canonical = 'Xbox Series X';
      else if (lower.includes('switch')) canonical = 'Nintendo Switch';
      else if (lower.includes('steam')) canonical = 'Steam';
      else if (lower === 'pc') canonical = 'PC';

      if (!seen.has(canonical)) {
        seen.add(canonical);
        badges.push({ name: canonical, category: 'gaming' });
      }
    }
  }

  return badges;
}

/**
 * Test whether an item satisfies a platform/streaming filter.
 */
export function matchesPlatformFilter(item: Item, selectedPlatforms: string[]): boolean {
  if (!selectedPlatforms || selectedPlatforms.length === 0) return true;

  const badges = extractPlatformBadges(item);
  const badgeNames = new Set(badges.map((b) => b.name.toLowerCase()));

  // Also check raw tags and source for completeness
  const rawTags = new Set(item.tags.map((t) => t.toLowerCase()));

  return selectedPlatforms.some((filter) => {
    const f = filter.toLowerCase();
    return badgeNames.has(f) || rawTags.has(f);
  });
}
