import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadDb, getItems, getCountsByType, type Item } from './lib/db';
import { usePreferences } from './lib/preferences';
import { Navbar, type PageId } from './components/Navbar';
import { RadarPage } from './components/RadarPage';
import { ExplorerPage } from './components/ExplorerPage';
import { LibraryPage } from './components/LibraryPage';
import { SettingsPage } from './components/SettingsPage';
import { loadCustomFeeds, fetchAllActiveCustomFeeds } from './lib/customFeeds';
import { ShortcutsModal } from './components/ShortcutsModal';
import { parseKeyboardShortcut } from './lib/keyboard';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activePage, setActivePage] = useState<PageId>('radar');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastDismissedId, setLastDismissedId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);

  const {
    preferences,
    likedCount,
    dismissedCount,
    isLiked,
    toggleLike,
    dismiss,
    restore,
    restoreAll,
  } = usePreferences();

  const loadData = useCallback(() => {
    loadDb()
      .then(async () => {
        const baseCounts = getCountsByType();
        const initial = getItems({ limit: 600 });
        setAllItems(initial);
        setCounts(baseCounts);
        setLoading(false);

        // Background fetch custom feeds if any enabled
        const customFeeds = loadCustomFeeds();
        if (customFeeds.some((f) => f.enabled)) {
          try {
            const customItems = await fetchAllActiveCustomFeeds(customFeeds);
            if (customItems.length > 0) {
              setAllItems((prev) => {
                const existingIds = new Set(prev.map((i) => i.id));
                const newItems = customItems.filter((i) => !existingIds.has(i.id));
                const combined = [...newItems, ...prev];
                const newsCount = combined.filter((i) => i.type === 'news').length;
                setCounts((c) => ({ ...c, news: newsCount }));
                return combined;
              });
            }
          } catch (err) {
            console.warn('Failed to load custom feeds:', err);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load database:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Liked items array
  const likedItems = useMemo(() => {
    const likedSet = new Set(preferences.likedIds);
    return allItems.filter((i) => likedSet.has(i.id));
  }, [allItems, preferences.likedIds]);

  // Active items (excluding dismissed)
  const activeItems = useMemo(() => {
    const dismissedSet = new Set(preferences.dismissedIds);
    return allItems.filter((i) => !dismissedSet.has(i.id));
  }, [allItems, preferences.dismissedIds]);

  // Dismiss with undo toast
  const handleDismiss = useCallback((id: string) => {
    dismiss(id);
    setLastDismissedId(id);
    setToastMessage('Item hidden from feeds');
  }, [dismiss]);

  const handleUndoDismiss = useCallback(() => {
    if (lastDismissedId) {
      restore(lastDismissedId);
      setLastDismissedId(null);
      setToastMessage('Item restored');
    }
  }, [lastDismissedId, restore]);

  // Clear all data
  const handleClearAllData = useCallback(() => {
    if (window.confirm('Reset all saved releases and clear hidden item history?')) {
      localStorage.removeItem('aggregator_preferences_v1');
      localStorage.removeItem('logos_watched_ids');
      window.location.reload();
    }
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = parseKeyboardShortcut(e);
      if (!action) return;

      if (action.type === 'NAVIGATE') {
        setActivePage(action.page);
      } else if (action.type === 'FOCUS_SEARCH') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (action.type === 'BLUR_SEARCH') {
        setShortcutsOpen(false);
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput && document.activeElement === searchInput) {
          searchInput.blur();
        }
      } else if (action.type === 'TOGGLE_SHORTCUTS') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      } else if (action.type === 'SCROLL_DOWN') {
        window.scrollBy({ top: 320, behavior: 'smooth' });
      } else if (action.type === 'SCROLL_UP') {
        window.scrollBy({ top: -320, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-hide toast after 4s
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Watchdog for slow load feedback
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlowLoad(true), 3500);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-on-primary flex items-center justify-center p-gutter">
        <div className="text-center flex flex-col items-center gap-3 max-w-sm">
          <img
            src={`${import.meta.env.BASE_URL}icon.png`}
            alt="logos"
            className="w-12 h-12 object-contain animate-pulse rounded-xl"
          />
          <h1 className="font-headline-sm text-2xl lowercase tracking-tight">logos</h1>
          <div className="flex items-center gap-2 text-outline text-xs font-label-code">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping"></span>
            <span>Initializing SQLite WASM Container...</span>
          </div>

          {slowLoad && (
            <div className="mt-3 flex flex-col items-center gap-2 animate-fade-in border border-dark-border/50 bg-dark-surface/60 p-3 rounded-xl">
              <span className="text-[11px] text-outline font-label-code">
                Downloading SQLite dataset (~190KB)...
              </span>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 text-[11px] bg-secondary-container text-on-primary font-label-code rounded-lg cursor-pointer hover:bg-secondary-fixed-dim transition-colors"
              >
                Reload Page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg text-on-primary flex items-center justify-center p-gutter">
        <div className="max-w-md bg-dark-surface p-space-xl rounded-2xl border border-error/40 text-center flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-4xl text-error">error</span>
          <h2 className="font-headline-sm text-lg">Failed to Load Database</h2>
          <p className="font-body-sm text-xs text-outline">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-space-md py-2 rounded-xl bg-secondary-container text-on-primary text-xs font-label-code"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-on-primary font-body-md selection:bg-secondary-container selection:text-on-primary flex flex-col">
      {/* ─── Global Top Navigation Bar ───────────────────────────────── */}
      <Navbar
        activePage={activePage}
        onSelectPage={setActivePage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        likedCount={likedCount}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* ─── Keyboard Shortcuts Modal ───────────────────────────────── */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* ─── Main Content Canvas (offset for fixed header) ──────────── */}
      <main className="flex-grow pt-16">
        {activePage === 'radar' && (
          <RadarPage
            items={activeItems}
            counts={counts}
            isLiked={isLiked}
            toggleLike={toggleLike}
            dismiss={handleDismiss}
            searchQuery={searchQuery}
          />
        )}

        {activePage === 'explorer' && (
          <ExplorerPage
            items={activeItems}
            counts={counts}
            isLiked={isLiked}
            toggleLike={toggleLike}
            dismiss={handleDismiss}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {activePage === 'library' && (
          <LibraryPage
            items={allItems}
            likedItems={likedItems}
            dismissedIds={preferences.dismissedIds}
            toggleLike={toggleLike}
            restoreDismissed={restore}
            restoreAllDismissed={restoreAll}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {activePage === 'settings' && (
          <SettingsPage
            items={allItems}
            counts={counts}
            onRefreshData={loadData}
            likedCount={likedCount}
            dismissedCount={dismissedCount}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>

      {/* ─── Toast Feedback Strip ────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-dark-surface border border-secondary-container text-on-primary px-space-md py-2.5 rounded-full shadow-2xl flex items-center gap-space-sm text-body-sm animate-fade-in">
          <span>{toastMessage}</span>
          {lastDismissedId && (
            <button
              onClick={handleUndoDismiss}
              className="text-secondary-fixed-dim hover:text-on-primary font-label-code text-xs font-bold underline cursor-pointer"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="w-full bg-dark-bg border-t border-dark-border mt-auto">
        <div className="w-full max-w-[1440px] mx-auto px-gutter py-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-xs text-xs text-outline">
            <img
              src={`${import.meta.env.BASE_URL}icon.png`}
              alt="logos logo"
              className="h-5 w-5 object-contain rounded"
            />
            <span className="font-headline-sm text-sm lowercase tracking-tight text-on-primary">
              logos
            </span>
            <span>// release deck</span>
            <span>•</span>
            <span className="font-label-code text-[11px] text-outline-variant">
              STATIC SQLITE • NO LIVE BACKEND
            </span>
          </div>
          <div className="flex items-center gap-space-md text-xs text-outline">
            <span>Deterministic client querying via sql.js (WASM)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
