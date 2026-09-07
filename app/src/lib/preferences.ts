import { useState, useEffect, useCallback } from 'react';
import type { Item } from './db';

const PREFS_STORAGE_KEY = 'logos_preferences_v1';
const PREFS_CHANGE_EVENT = 'logos:preferences-changed';

export interface UserPreferences {
  likedIds: string[];
  dismissedIds: string[];
  tagWeights: Record<string, number>;
  updatedAt: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  likedIds: [],
  dismissedIds: [],
  tagWeights: {},
  updatedAt: new Date().toISOString(),
};

/**
 * Reads preferences from localStorage safely.
 */
export function getStoredPreferences(): UserPreferences {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_PREFERENCES;
  }
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      likedIds: Array.isArray(parsed.likedIds) ? parsed.likedIds : [],
      dismissedIds: Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : [],
      tagWeights: parsed.tagWeights && typeof parsed.tagWeights === 'object' ? parsed.tagWeights : {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Preferences] Failed to parse stored preferences, using defaults:', err);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Saves preferences to localStorage and broadcasts change event.
 */
function savePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(PREFS_CHANGE_EVENT, { detail: prefs }));
  } catch (err) {
    console.error('[Preferences] Failed to save preferences:', err);
  }
}

/**
 * Toggle like status for an item and adjust tag weights.
 */
export function toggleLikeItem(item: Item): void {
  const current = getStoredPreferences();
  const isLiked = current.likedIds.includes(item.id);
  const nextLikedIds = isLiked
    ? current.likedIds.filter((id) => id !== item.id)
    : [...current.likedIds, item.id];

  const nextTagWeights = { ...current.tagWeights };
  const tags = Array.isArray(item.tags) ? item.tags : [];

  for (const tag of tags) {
    const cleanTag = tag.trim();
    if (!cleanTag) continue;
    const currentWeight = nextTagWeights[cleanTag] || 0;
    if (isLiked) {
      // Unliking: decrease weight
      const newWeight = currentWeight - 1;
      if (newWeight <= 0) {
        delete nextTagWeights[cleanTag];
      } else {
        nextTagWeights[cleanTag] = newWeight;
      }
    } else {
      // Liking: increase weight
      nextTagWeights[cleanTag] = currentWeight + 1;
    }
  }

  savePreferences({
    ...current,
    likedIds: nextLikedIds,
    tagWeights: nextTagWeights,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Dismiss an item so it is hidden from default views.
 */
export function dismissItem(itemId: string): void {
  const current = getStoredPreferences();
  if (current.dismissedIds.includes(itemId)) return;

  savePreferences({
    ...current,
    dismissedIds: [...current.dismissedIds, itemId],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Restore an item that was previously dismissed.
 */
export function restoreItem(itemId: string): void {
  const current = getStoredPreferences();
  if (!current.dismissedIds.includes(itemId)) return;

  savePreferences({
    ...current,
    dismissedIds: current.dismissedIds.filter((id) => id !== itemId),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Restore all dismissed items.
 */
export function restoreAllDismissed(): void {
  const current = getStoredPreferences();
  savePreferences({
    ...current,
    dismissedIds: [],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Clear all user preferences (likes, dismissals, tag weights).
 */
export function clearAllPreferences(): void {
  savePreferences({
    likedIds: [],
    dismissedIds: [],
    tagWeights: {},
    updatedAt: new Date().toISOString(),
  });
}

/**
 * React hook to observe and update preferences reactively.
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(getStoredPreferences);

  useEffect(() => {
    const handleUpdate = () => {
      setPrefs(getStoredPreferences());
    };

    window.addEventListener(PREFS_CHANGE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(PREFS_CHANGE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const toggleLike = useCallback((item: Item) => toggleLikeItem(item), []);
  const dismiss = useCallback((id: string) => dismissItem(id), []);
  const restore = useCallback((id: string) => restoreItem(id), []);
  const restoreAll = useCallback(() => restoreAllDismissed(), []);
  const clear = useCallback(() => clearAllPreferences(), []);

  const isLiked = useCallback((id: string) => prefs.likedIds.includes(id), [prefs.likedIds]);
  const isDismissed = useCallback((id: string) => prefs.dismissedIds.includes(id), [prefs.dismissedIds]);

  return {
    preferences: prefs,
    likedCount: prefs.likedIds.length,
    dismissedCount: prefs.dismissedIds.length,
    isLiked,
    isDismissed,
    toggleLike,
    dismiss,
    restore,
    restoreAll,
    clear,
  };
}
