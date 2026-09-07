import { useState, useEffect, useCallback } from 'react';
import { loadDb, getItems, getCountsByType, type Item, type ItemType, type SortMode } from './lib/db';
import { ItemGrid } from './components/ItemGrid';
import { FilterBar } from './components/FilterBar';

const TYPE_TABS: { key: ItemType | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'news', label: 'News' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'game', label: 'Games' },
];

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeType, setActiveType] = useState<ItemType | null>(null);
  const [sort, setSort] = useState<SortMode>('newest');
  const [search, setSearch] = useState('');

  // Load database on mount
  useEffect(() => {
    loadDb()
      .then(() => {
        setCounts(getCountsByType());
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load database:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Refresh items when filters change
  const refreshItems = useCallback(() => {
    if (loading || error) return;
    try {
      const results = getItems({
        type: activeType,
        sort,
        search: search.trim() || undefined,
        limit: 200,
      });
      setItems(results);
    } catch (err) {
      console.error('Query failed:', err);
    }
  }, [loading, error, activeType, sort, search]);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading database…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg mb-2">Failed to load data</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Logos</h1>
            <p className="text-sm text-gray-500">
              {totalCount} items tracked
            </p>
          </div>
        </div>
      </header>

      {/* Type Tabs */}
      <nav className="border-b border-gray-800 px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {TYPE_TABS.map((tab) => {
            const count = tab.key ? (counts[tab.key] ?? 0) : totalCount;
            const isActive = activeType === tab.key;
            return (
              <button
                key={tab.key ?? 'all'}
                onClick={() => setActiveType(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${isActive ? 'text-indigo-400/70' : 'text-gray-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Filters + Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <FilterBar
          sort={sort}
          onSortChange={setSort}
          search={search}
          onSearchChange={setSearch}
        />

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No items found</p>
            <p className="text-gray-600 text-sm mt-1">
              {search ? 'Try a different search term' : 'Data will appear after the first fetch run'}
            </p>
          </div>
        ) : (
          <ItemGrid items={items} />
        )}
      </main>
    </div>
  );
}

export default App;
