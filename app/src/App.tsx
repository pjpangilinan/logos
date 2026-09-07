import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadDb, getItems, getCountsByType, type Item, type ItemType, type SortMode } from './lib/db';
import { usePreferences } from './lib/preferences';
import { getRecommendations, type ScoredItem } from './lib/recommendations';
import { ItemGrid } from './components/ItemGrid';
import { FilterBar } from './components/FilterBar';
import { DismissedModal } from './components/DismissedModal';

type NavigationTab = 'for-you' | ItemType | null;

const TYPE_TABS: { key: NavigationTab; label: string }[] = [
  { key: 'for-you', label: '✨ For You' },
  { key: null, label: 'All' },
  { key: 'news', label: 'News' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'game', label: 'Games' },
];

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<NavigationTab>('for-you');
  const [sort, setSort] = useState<SortMode>('newest');
  const [search, setSearch] = useState('');
  const [likedOnly, setLikedOnly] = useState(false);
  const [dismissedModalOpen, setDismissedModalOpen] = useState(false);
  const [lastDismissedId, setLastDismissedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Load database on mount
  useEffect(() => {
    loadDb()
      .then(() => {
        setCounts(getCountsByType());
        // Load a comprehensive set for search/filtering
        const initial = getItems({ limit: 500 });
        setAllItems(initial);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load database:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fetch updated items when db or query filters change
  const refreshItems = useCallback(() => {
    if (loading || error) return;
    try {
      const typeFilter = (activeTab === 'for-you' || activeTab === null) ? null : activeTab;
      const results = getItems({
        type: typeFilter,
        sort,
        search: search.trim() || undefined,
        limit: 500,
      });
      setAllItems(results);
    } catch (err) {
      console.error('Query failed:', err);
    }
  }, [loading, error, activeTab, sort, search]);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  // Compute recommendations for the "For You" view
  const recommendations: ScoredItem[] = useMemo(() => {
    if (activeTab !== 'for-you') return [];
    return getRecommendations(allItems, preferences);
  }, [activeTab, allItems, preferences]);

  // Handle dismiss with undo toast
  const handleDismiss = useCallback((id: string) => {
    dismiss(id);
    setLastDismissedId(id);
    setToastMessage('Item hidden from feeds');
  }, [dismiss]);

  const handleUndoDismiss = useCallback(() => {
    if (lastDismissedId) {
      restore(lastDismissedId);
      setLastDismissedId(null);
      setToastMessage(null);
    }
  }, [lastDismissedId, restore]);

  // Auto-hide toast after 4s
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Filter items for display
  const displayedItems = useMemo(() => {
    const dismissedSet = new Set(preferences.dismissedIds);
    const likedSet = new Set(preferences.likedIds);

    if (activeTab === 'for-you') {
      let recs = recommendations.map((r) => r.item);
      if (search.trim()) {
        const q = search.toLowerCase();
        recs = recs.filter((item) => item.title.toLowerCase().includes(q));
      }
      if (likedOnly) {
        recs = recs.filter((item) => likedSet.has(item.id));
      }
      return recs;
    }

    return allItems.filter((item) => {
      if (dismissedSet.has(item.id)) return false;
      if (likedOnly && !likedSet.has(item.id)) return false;
      return true;
    });
  }, [activeTab, allItems, preferences.dismissedIds, preferences.likedIds, recommendations, search, likedOnly]);

  // Score map for displayed items
  const scoresMap = useMemo(() => {
    if (activeTab !== 'for-you') return undefined;
    const map: Record<string, { score: number; matchedTags: string[] }> = {};
    for (const rec of recommendations) {
      map[rec.item.id] = { score: rec.score, matchedTags: rec.matchedTags };
    }
    return map;
  }, [activeTab, recommendations]);

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const activeTagsCount = Object.keys(preferences.tagWeights).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Loading release radar…</p>
          <p className="text-gray-600 text-xs mt-1">Initializing SQLite WASM</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <div className="text-red-400 text-3xl mb-3">⚠️</div>
          <p className="text-red-400 text-lg font-medium mb-2">Failed to load radar data</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Logos</h1>
              <span className="text-xs bg-indigo-950 border border-indigo-500/40 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                Release Radar
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalCount} total items tracked across news, movies, tv & games
            </p>
          </div>

          <div className="flex items-center gap-3">
            {likedCount > 0 && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-rose-300 bg-rose-950/50 border border-rose-900/50 px-2.5 py-1 rounded-full">
                <span>❤️ {likedCount} liked</span>
                {activeTagsCount > 0 && (
                  <span className="text-gray-400">• {activeTagsCount} trained tags</span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Type & Personalization Tabs */}
      <nav className="border-b border-gray-800 bg-gray-900/40 px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {TYPE_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            let countLabel: number | null = null;
            if (tab.key === 'for-you') {
              countLabel = recommendations.length;
            } else if (tab.key === null) {
              countLabel = totalCount;
            } else {
              countLabel = counts[tab.key] ?? 0;
            }

            return (
              <button
                key={tab.key ?? 'all'}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                <span>{tab.label}</span>
                {countLabel !== null && (
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {countLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        <FilterBar
          sort={sort}
          onSortChange={setSort}
          search={search}
          onSearchChange={setSearch}
          likedOnly={likedOnly}
          onToggleLikedOnly={() => setLikedOnly((prev) => !prev)}
          likedCount={likedCount}
          dismissedCount={dismissedCount}
          onOpenDismissedModal={() => setDismissedModalOpen(true)}
        />

        {/* Empty state for "For You" when no likes exist yet */}
        {activeTab === 'for-you' && recommendations.length === 0 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 my-6 text-center max-w-2xl mx-auto">
            <div className="text-4xl mb-3">🎯</div>
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Train your personal radar</h2>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Click the <span className="text-rose-400 font-medium">Heart</span> icon on any movie, show, game, or news article you like. The radar will immediately learn your favorite genres and topics to curate recommendations here.
            </p>
            <button
              onClick={() => setActiveTab(null)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Browse All Releases
            </button>
          </div>
        )}

        {displayedItems.length === 0 && !(activeTab === 'for-you' && recommendations.length === 0) ? (
          <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800/50">
            <p className="text-gray-400 text-base font-medium">No items found</p>
            <p className="text-gray-500 text-xs mt-1">
              {search
                ? 'Try a different search term or filter'
                : likedOnly
                ? 'You have not liked any items matching this filter yet'
                : 'Items will appear after the next scheduled collection'}
            </p>
          </div>
        ) : (
          <ItemGrid
            items={displayedItems}
            isLiked={isLiked}
            onToggleLike={toggleLike}
            onDismiss={handleDismiss}
            scores={scoresMap}
          />
        )}
      </main>

      {/* Undo Dismiss Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-40 bg-gray-900 border border-gray-700 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <span className="text-xs text-gray-300">{toastMessage}</span>
          <button
            type="button"
            onClick={handleUndoDismiss}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Undo
          </button>
        </div>
      )}

      {/* Dismissed Items Modal */}
      <DismissedModal
        isOpen={dismissedModalOpen}
        onClose={() => setDismissedModalOpen(false)}
        dismissedIds={preferences.dismissedIds}
        allItems={allItems}
        onRestore={restore}
        onRestoreAll={restoreAll}
      />
    </div>
  );
}

export default App;
