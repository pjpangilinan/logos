import type { SortMode } from '../lib/db';

interface FilterBarProps {
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function FilterBar({ sort, onSortChange, search, onSearchChange }: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
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

      {/* Sort toggle */}
      <div className="flex rounded-lg border border-gray-700 overflow-hidden shrink-0">
        <button
          onClick={() => onSortChange('newest')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            sort === 'newest'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-900 text-gray-400 hover:text-gray-200'
          }`}
        >
          Newest
        </button>
        <button
          onClick={() => onSortChange('release')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            sort === 'release'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-900 text-gray-400 hover:text-gray-200'
          }`}
        >
          Release Date
        </button>
      </div>
    </div>
  );
}
