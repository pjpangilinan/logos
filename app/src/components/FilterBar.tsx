import type { SortMode } from '../lib/db';

interface FilterBarProps {
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  search: string;
  onSearchChange: (search: string) => void;
  likedOnly?: boolean;
  onToggleLikedOnly?: () => void;
  likedCount?: number;
  dismissedCount?: number;
  onOpenDismissedModal?: () => void;
}

export function FilterBar({
  sort,
  onSortChange,
  search,
  onSearchChange,
  likedOnly = false,
  onToggleLikedOnly,
  likedCount = 0,
  dismissedCount = 0,
  onOpenDismissedModal,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search titles…"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          />
        </div>

        {/* Sort & Filter controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Liked only toggle */}
          {onToggleLikedOnly && (
            <button
              type="button"
              onClick={onToggleLikedOnly}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                likedOnly
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
              title="Filter by liked items"
            >
              <svg
                className={`w-3.5 h-3.5 fill-current ${likedOnly ? 'text-rose-400' : 'text-gray-500'}`}
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>Liked</span>
              {likedCount > 0 && (
                <span className="text-xs bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded-full">
                  {likedCount}
                </span>
              )}
            </button>
          )}

          {/* Dismissed items button */}
          {dismissedCount > 0 && onOpenDismissedModal && (
            <button
              type="button"
              onClick={onOpenDismissedModal}
              className="text-xs text-gray-400 hover:text-gray-200 bg-gray-900 border border-gray-700 hover:border-gray-600 px-2.5 py-2 rounded-lg transition-colors"
              title="Manage dismissed items"
            >
              Hidden ({dismissedCount})
            </button>
          )}

          {/* Sort toggle */}
          <div className="flex rounded-lg border border-gray-700 overflow-hidden shrink-0">
            <button
              onClick={() => onSortChange('newest')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                sort === 'newest'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-gray-200'
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => onSortChange('release')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                sort === 'release'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-gray-200'
              }`}
            >
              Release Date
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
