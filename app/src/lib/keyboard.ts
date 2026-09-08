export type NavPageId = 'radar' | 'explorer' | 'library' | 'settings';

export type ShortcutAction =
  | { type: 'NAVIGATE'; page: NavPageId }
  | { type: 'FOCUS_SEARCH' }
  | { type: 'BLUR_SEARCH' }
  | { type: 'TOGGLE_SHORTCUTS' }
  | { type: 'SCROLL_DOWN' }
  | { type: 'SCROLL_UP' };

export function isInputElement(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as { tagName?: string; isContentEditable?: boolean };
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  return tag === 'input' || tag === 'textarea' || tag === 'select' || !!el.isContentEditable;
}

export function parseKeyboardShortcut(e: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  target?: unknown;
}): ShortcutAction | null {
  // Escape always works, even inside an input
  if (e.key === 'Escape') {
    return { type: 'BLUR_SEARCH' };
  }

  // Inside inputs, suppress single-key commands
  if (isInputElement(e.target)) {
    return null;
  }

  // Cmd+K or Ctrl+K
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    return { type: 'FOCUS_SEARCH' };
  }

  // Navigation: 1-4
  if (e.key === '1') return { type: 'NAVIGATE', page: 'radar' };
  if (e.key === '2') return { type: 'NAVIGATE', page: 'explorer' };
  if (e.key === '3') return { type: 'NAVIGATE', page: 'library' };
  if (e.key === '4') return { type: 'NAVIGATE', page: 'settings' };

  // Search
  if (e.key === '/') return { type: 'FOCUS_SEARCH' };

  // Shortcuts Cheatsheet
  if (e.key === '?') return { type: 'TOGGLE_SHORTCUTS' };

  // Scroll navigation
  if (e.key === 'j' || e.key === 'J') return { type: 'SCROLL_DOWN' };
  if (e.key === 'k' || e.key === 'K') return { type: 'SCROLL_UP' };

  return null;
}
