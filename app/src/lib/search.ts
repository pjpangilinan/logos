import type { Item } from './db';

/**
 * Enhanced multi-token search for items.
 * Supports:
 * - multi-word queries: "steam action" matches items having all tokens across title, tags, or source
 * - type: prefix (e.g. "type:game", "type:movie", "type:tv", "type:news")
 * - source: prefix (e.g. "source:rawg", "source:tmdb", "source:hackernews")
 * - tag: prefix (e.g. "tag:rpg")
 */
export function matchItemSearch(item: Item, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const itemTitle = item.title.toLowerCase();
  const itemType = item.type.toLowerCase();
  const itemSource = item.source.toLowerCase();
  const itemTags = item.tags.map((t) => t.toLowerCase());

  for (const token of tokens) {
    if (token.startsWith('type:')) {
      const targetType = token.slice(5).trim();
      if (targetType && !itemType.includes(targetType)) return false;
      continue;
    }

    if (token.startsWith('source:')) {
      const targetSource = token.slice(7).trim();
      if (targetSource && !itemSource.includes(targetSource)) return false;
      continue;
    }

    if (token.startsWith('tag:')) {
      const targetTag = token.slice(4).trim();
      if (targetTag && !itemTags.some((t) => t.includes(targetTag))) return false;
      continue;
    }

    // Standard token: must match in title OR in source OR in tags OR in type
    const matchesTitle = itemTitle.includes(token);
    const matchesSource = itemSource.includes(token);
    const matchesTags = itemTags.some((t) => t.includes(token));
    const matchesType = itemType === token;

    if (!matchesTitle && !matchesSource && !matchesTags && !matchesType) {
      return false;
    }
  }

  return true;
}
