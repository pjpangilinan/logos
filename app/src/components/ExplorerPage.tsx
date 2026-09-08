import React, { useState, useMemo } from 'react';
import type { Item } from '../lib/db';
import {
  extractPlatformBadges,
  matchesPlatformFilter,
  KNOWN_STREAMING_PROVIDERS,
  KNOWN_GAMING_PLATFORMS,
} from '../lib/platforms';

interface ExplorerPageProps {
  items: Item[];
  counts: Record<string, number>;
  isLiked: (id: string) => boolean;
  toggleLike: (item: Item) => void;
  dismiss: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type ExplorerCategory = 'all' | 'movies' | 'games' | 'tech';
type SortOption = 'anticipated' | 'release' | 'title';
type ViewMode = 'grid' | 'timeline';
type WindowFilter = 'all' | 'this-week' | 'next-30' | 'past-30';

export const ExplorerPage: React.FC<ExplorerPageProps> = ({
  items,
  counts,
  isLiked,
  toggleLike,
  dismiss,
  searchQuery,
  onSearchChange,
}) => {
  const [activeCategory, setActiveCategory] = useState<ExplorerCategory>('all');
  const [sortOption, setSortOption] = useState<SortOption>('release');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('all');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Collect top genres from all items
  const availableGenres = useMemo(() => {
    const genreMap = new Map<string, number>();
    for (const it of items) {
      for (const t of it.tags) {
        if (t.length > 2 && t.length < 20) {
          genreMap.set(t, (genreMap.get(t) || 0) + 1);
        }
      }
    }
    return Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([genre]) => genre);
  }, [items]);

  // Handle category tab change
  const handleCategoryChange = (cat: ExplorerCategory) => {
    setActiveCategory(cat);
  };

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const resetAllFilters = () => {
    setActiveCategory('all');
    setSortOption('release');
    setWindowFilter('all');
    setSelectedSources([]);
    setSelectedPlatforms([]);
    setSelectedGenres([]);
    onSearchChange('');
  };

  // Filtered and sorted items
  const processedItems = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysLaterStr = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysLaterStr = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

    return items
      .filter((item) => {
        // Category filter
        if (activeCategory === 'movies') {
          if (item.type !== 'movie' && item.type !== 'tv') return false;
        } else if (activeCategory === 'games') {
          if (item.type !== 'game') return false;
        } else if (activeCategory === 'tech') {
          if (item.type !== 'news') return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchTag = item.tags.some((t) => t.toLowerCase().includes(q));
          const matchSource = item.source.toLowerCase().includes(q);
          if (!matchTitle && !matchTag && !matchSource) return false;
        }

        // Release window filter
        if (windowFilter === 'this-week') {
          if (!item.date || item.date < todayStr || item.date > sevenDaysLaterStr) return false;
        } else if (windowFilter === 'next-30') {
          if (!item.date || item.date < todayStr || item.date > thirtyDaysLaterStr) return false;
        } else if (windowFilter === 'past-30') {
          if (!item.date || item.date < thirtyDaysAgoStr || item.date > todayStr) return false;
        }

        // Source filter
        if (selectedSources.length > 0) {
          const itemSrc = item.source.toLowerCase();
          const matchesAny = selectedSources.some((s) => itemSrc.includes(s.toLowerCase()));
          if (!matchesAny) return false;
        }

        // Platform & Streaming filter
        if (selectedPlatforms.length > 0) {
          if (!matchesPlatformFilter(item, selectedPlatforms)) return false;
        }

        // Genre filter
        if (selectedGenres.length > 0) {
          const hasGenre = selectedGenres.some((g) =>
            item.tags.some((t) => t.toLowerCase() === g.toLowerCase())
          );
          if (!hasGenre) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'release') {
          const dateA = a.date || '9999-99-99';
          const dateB = b.date || '9999-99-99';
          return dateB.localeCompare(dateA);
        }
        if (sortOption === 'title') {
          return a.title.localeCompare(b.title);
        }
        // 'anticipated': prioritize upcoming games/movies with date
        const dateA = a.date || '0000-00-00';
        const dateB = b.date || '0000-00-00';
        return dateB.localeCompare(dateA);
      });
  }, [items, activeCategory, searchQuery, windowFilter, selectedSources, selectedPlatforms, selectedGenres, sortOption]);

  const moviesCount = (counts['movie'] || 0) + (counts['tv'] || 0);

  return (
    <div className="w-full bg-dark-bg text-on-primary min-h-screen pb-space-4xl">
      {/* ─── Top Command Ribbon & Category Tabs ───────────────────────── */}
      <div className="w-full bg-dark-bg text-on-primary border-b border-dark-border/40">
        <div className="max-w-[1440px] mx-auto px-gutter pt-space-xl pb-space-lg">
          {/* Sub-Navigation Category Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-xs p-1 bg-dark-surface rounded-full border border-dark-border max-w-fit flex-wrap">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-full font-headline-sm text-label-code transition-all ${
                  activeCategory === 'all'
                    ? 'bg-secondary-container text-on-primary shadow-sm font-semibold'
                    : 'text-outline hover:text-on-primary'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">view_agenda</span>
                <span>All Media</span>
                <span className="bg-dark-border px-1.5 py-0.2 rounded text-[10px] text-outline-variant font-label-caps ml-1">
                  {items.length}
                </span>
              </button>

              <button
                onClick={() => handleCategoryChange('movies')}
                className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-full font-headline-sm text-label-code transition-all ${
                  activeCategory === 'movies'
                    ? 'bg-secondary-container text-on-primary shadow-sm font-semibold'
                    : 'text-outline hover:text-on-primary'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">movie</span>
                <span>Movies & TV</span>
                <span className="bg-dark-border px-1.5 py-0.2 rounded text-[10px] text-outline-variant font-label-caps ml-1">
                  {moviesCount}
                </span>
              </button>

              <button
                onClick={() => handleCategoryChange('games')}
                className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-full font-headline-sm text-label-code transition-all ${
                  activeCategory === 'games'
                    ? 'bg-secondary-container text-on-primary shadow-sm font-semibold'
                    : 'text-outline hover:text-on-primary'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">sports_esports</span>
                <span>Games</span>
                <span className="bg-dark-border px-1.5 py-0.2 rounded text-[10px] text-outline-variant font-label-caps ml-1">
                  {counts['game'] || 0}
                </span>
              </button>

              <button
                onClick={() => handleCategoryChange('tech')}
                className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-full font-headline-sm text-label-code transition-all ${
                  activeCategory === 'tech'
                    ? 'bg-secondary-container text-on-primary shadow-sm font-semibold'
                    : 'text-outline hover:text-on-primary'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">feed</span>
                <span>Tech News & AI</span>
                <span className="bg-dark-border px-1.5 py-0.2 rounded text-[10px] text-outline-variant font-label-caps ml-1">
                  {counts['news'] || 0}
                </span>
              </button>
            </div>

            {/* Reset filter */}
            <div className="flex items-center gap-space-md">
              <button
                onClick={resetAllFilters}
                className="font-label-code text-label-code text-outline hover:text-on-primary px-space-sm py-1 rounded-lg transition-colors flex items-center gap-1 border border-dark-border/40 hover:border-dark-border"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span> Reset Query
              </button>
            </div>
          </div>

          {/* Main Search & Command Ribbon */}
          <div className="mt-space-lg bg-dark-surface p-space-md rounded-[22px] border border-dark-border/60 shadow-xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Filter titles, studios, tags, sources..."
                className="w-full bg-deep-dark text-on-primary font-body-sm text-body-sm pl-11 pr-24 py-space-sm rounded-xl placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-secondary-container border border-dark-border/40 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-space-sm top-1/2 -translate-y-1/2 text-outline hover:text-on-primary text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Filters & Controls */}
            <div className="flex flex-wrap items-center gap-space-sm">
              {/* Sort Dropdown */}
              <div className="flex items-center bg-deep-dark border border-dark-border/40 rounded-xl px-space-sm py-1.5">
                <span className="material-symbols-outlined text-outline text-[18px] mr-1.5">sort</span>
                <span className="font-label-code text-label-code text-outline mr-2 uppercase">Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="bg-transparent font-headline-sm text-label-code text-on-primary focus:outline-none cursor-pointer pr-space-xs"
                >
                  <option className="bg-dark-surface text-on-primary" value="release">
                    Release Date
                  </option>
                  <option className="bg-dark-surface text-on-primary" value="anticipated">
                    Most Anticipated
                  </option>
                  <option className="bg-dark-surface text-on-primary" value="title">
                    Alphabetical Title
                  </option>
                </select>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-deep-dark border border-dark-border/40 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 px-space-sm py-1 rounded-lg font-label-code text-label-code transition-all ${
                    viewMode === 'grid'
                      ? 'bg-secondary-container text-on-primary shadow-sm font-semibold'
                      : 'text-outline hover:text-on-primary'
                  }`}
                  type="button"
                  title="Grid View"
                >
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`flex items-center gap-1 px-space-sm py-1 rounded-lg font-label-code text-label-code transition-all ${
                    viewMode === 'timeline'
                      ? 'bg-secondary-container text-on-primary shadow-sm font-semibold'
                      : 'text-outline hover:text-on-primary'
                  }`}
                  type="button"
                  title="Timeline View"
                >
                  <span className="material-symbols-outlined text-[16px]">timeline</span>
                  <span className="hidden sm:inline">Timeline</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Layout ───────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-gutter py-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* Left Filter Panel (Sidebar 3 cols) */}
          <aside className="lg:col-span-3 w-full flex flex-col gap-space-md">
            <div className="bg-dark-surface rounded-[22px] p-space-lg border border-dark-border/60 shadow-xl flex flex-col gap-space-lg">
              <div className="flex items-center justify-between pb-space-xs border-b border-dark-border/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">tune</span>
                  <span className="font-headline-sm text-[17px] text-on-primary tracking-tight">
                    Filters
                  </span>
                </div>
                <span className="font-label-code text-label-code bg-dark-border px-space-xs py-space-2xs rounded text-outline-variant">
                  {processedItems.length} Matching
                </span>
              </div>

              {/* Release Window filter */}
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-caps text-label-caps uppercase text-outline tracking-wider">
                  Release Window
                </span>
                <div className="flex flex-col gap-1 pt-1">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'this-week', label: 'This Week' },
                    { id: 'next-30', label: 'Next 30 Days' },
                    { id: 'past-30', label: 'Past 30 Days' },
                  ].map((win) => (
                    <button
                      key={win.id}
                      onClick={() => setWindowFilter(win.id as WindowFilter)}
                      className={`flex items-center justify-between p-2 rounded-lg text-body-sm transition-colors text-left ${
                        windowFilter === win.id
                          ? 'bg-secondary-container/20 text-secondary-fixed-dim font-medium'
                          : 'hover:bg-deep-dark text-on-primary'
                      }`}
                    >
                      <span>{win.label}</span>
                      {windowFilter === win.id && (
                        <span className="material-symbols-outlined text-[16px] text-secondary-container">
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[1px] bg-dark-border w-full opacity-60"></div>

              {/* Platform & Source filter */}
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-caps text-label-caps uppercase text-outline tracking-wider">
                  Platform & Source
                </span>
                <div className="flex flex-col gap-1 pt-1">
                  {[
                    { key: 'tmdb', label: 'TMDB (Movies/TV)', icon: 'theaters' },
                    { key: 'rawg', label: 'RAWG (Games)', icon: 'sports_esports' },
                    { key: 'rss', label: 'RSS News', icon: 'feed' },
                  ].map((src) => {
                    const isChecked = selectedSources.includes(src.key);
                    return (
                      <button
                        key={src.key}
                        onClick={() => toggleSource(src.key)}
                        className={`flex items-center justify-between p-2 rounded-lg text-body-sm transition-colors text-left ${
                          isChecked
                            ? 'bg-secondary-container/20 text-secondary-fixed-dim font-medium'
                            : 'hover:bg-deep-dark text-on-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-outline">
                            {src.icon}
                          </span>
                          <span>{src.label}</span>
                        </div>
                        {isChecked && (
                          <span className="material-symbols-outlined text-[16px] text-secondary-container">
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-[1px] bg-dark-border w-full opacity-60"></div>

              {/* Streaming Services */}
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-caps text-label-caps uppercase text-outline tracking-wider">
                  Streaming Availability
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {KNOWN_STREAMING_PROVIDERS.slice(0, 6).map((provider) => {
                    const active = selectedPlatforms.includes(provider);
                    return (
                      <button
                        key={provider}
                        onClick={() => togglePlatform(provider)}
                        className={`px-2 py-0.5 rounded-md font-label-code text-[11px] transition-all ${
                          active
                            ? 'bg-secondary-container text-on-primary font-bold shadow-sm'
                            : 'bg-deep-dark text-outline-variant hover:text-on-primary border border-dark-border/40'
                        }`}
                        type="button"
                      >
                        {provider}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-[1px] bg-dark-border w-full opacity-60"></div>

              {/* Gaming Platforms */}
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-caps text-label-caps uppercase text-outline tracking-wider">
                  Gaming Platforms
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {KNOWN_GAMING_PLATFORMS.slice(0, 6).map((platform) => {
                    const active = selectedPlatforms.includes(platform);
                    return (
                      <button
                        key={platform}
                        onClick={() => togglePlatform(platform)}
                        className={`px-2 py-0.5 rounded-md font-label-code text-[11px] transition-all ${
                          active
                            ? 'bg-secondary-container text-on-primary font-bold shadow-sm'
                            : 'bg-deep-dark text-outline-variant hover:text-on-primary border border-dark-border/40'
                        }`}
                        type="button"
                      >
                        {platform}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-[1px] bg-dark-border w-full opacity-60"></div>

              {/* Genre Focus filter pills */}
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-caps text-label-caps uppercase text-outline tracking-wider">
                  Genre Focus
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availableGenres.map((genre) => {
                    const active = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`px-2.5 py-1 rounded-full font-label-code text-[11px] transition-all ${
                          active
                            ? 'bg-secondary-container text-on-primary font-bold'
                            : 'bg-deep-dark text-outline-variant hover:text-on-primary border border-dark-border/40'
                        }`}
                        type="button"
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content Area: Responsive Grid / Timeline Canvas (9 Cols) */}
          <div className="lg:col-span-9 w-full flex flex-col gap-space-lg">
            {/* Status bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-dark-border/60">
              <div className="flex items-center gap-space-sm">
                <span className="font-headline-sm text-headline-sm text-on-primary tracking-tight">
                  Releases
                </span>
              </div>
              <div className="flex items-center gap-space-md text-outline font-label-code text-label-code">
                <span>
                  Showing{' '}
                  <strong className="text-on-primary font-medium">
                    {processedItems.length}
                  </strong>{' '}
                  entries
                </span>
              </div>
            </div>

            {/* Empty State */}
            {processedItems.length === 0 && (
              <div className="bg-dark-surface rounded-[22px] p-space-3xl text-center border border-dark-border text-outline">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                <p className="text-body-md text-on-primary mb-1">No releases found</p>
                <p className="text-body-sm text-outline mb-4">
                  Try adjusting your search query, release window, or active filters.
                </p>
                <button
                  onClick={resetAllFilters}
                  className="px-space-md py-1.5 rounded-lg bg-secondary-container text-on-primary font-label-caps uppercase text-xs"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && processedItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
                {processedItems.map((item) => {
                  const liked = isLiked(item.id);
                  const platforms = extractPlatformBadges(item);
                  return (
                    <div
                      key={item.id}
                      className="group relative bg-dark-surface rounded-[22px] p-space-md flex flex-col justify-between border border-dark-border/40 hover:border-dark-border shadow-lg hover:bg-deep-dark transition-all duration-300"
                    >
                      <div className="flex flex-col gap-space-sm">
                        <div className="relative w-full h-44 rounded-xl overflow-hidden bg-deep-dark border border-dark-border/40">
                          {item.image ? (
                            <img
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              src={item.image}
                              alt={item.title}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-outline opacity-40">
                              <span className="material-symbols-outlined text-3xl">image</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-dark-surface via-transparent to-transparent opacity-80"></div>
                          <div className="absolute top-2.5 left-2.5 bg-dark-bg/90 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 border border-dark-border/40">
                            <span className="font-label-code text-[11px] text-secondary-fixed-dim uppercase font-bold">
                              {item.source}
                            </span>
                          </div>
                          {item.date && (
                            <div className="absolute top-2.5 right-2.5 bg-dark-bg/90 backdrop-blur-md px-2 py-0.5 rounded-full font-label-caps text-[10px] text-outline-variant uppercase border border-dark-border/40">
                              {item.date}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap text-outline font-label-caps uppercase text-[10px]">
                            <span className="text-secondary-fixed-dim font-bold">{item.type}</span>
                            {platforms.map((p) => (
                              <span
                                key={p.name}
                                className="px-1.5 py-0.2 rounded bg-secondary-container/20 text-secondary-fixed-dim font-label-code text-[9px] font-bold"
                              >
                                {p.name}
                              </span>
                            ))}
                            {item.tags[0] && !platforms.some((p) => p.name === item.tags[0]) && (
                              <>
                                <span>•</span>
                                <span className="truncate">{item.tags[0]}</span>
                              </>
                            )}
                          </div>
                          <a
                            href={item.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="font-headline-sm text-[16px] leading-snug text-on-primary hover:text-secondary-fixed-dim transition-colors line-clamp-2"
                          >
                            {item.title}
                          </a>
                          <p className="font-body-sm text-[13px] text-outline-variant line-clamp-2">
                            {item.tags.join(' • ') || 'Release item tracked via database.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-dark-border/40">
                        <button
                          onClick={() => toggleLike(item)}
                          className={`flex items-center gap-1.5 px-space-sm py-1 rounded-lg font-label-code text-[12px] transition-all ${
                            liked
                              ? 'bg-secondary-container text-on-primary font-bold'
                              : 'text-secondary-fixed-dim hover:text-on-secondary hover:bg-secondary-container'
                          }`}
                          type="button"
                        >
                          <span
                            className={`material-symbols-outlined text-[16px] ${
                              liked ? 'material-symbols-fill' : ''
                            }`}
                          >
                            {liked ? 'bookmark_added' : 'bookmark_add'}
                          </span>
                          <span>{liked ? 'Tracked' : 'Track'}</span>
                        </button>

                        <button
                          onClick={() => dismiss(item.id)}
                          className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-dark-bg transition-colors"
                          title="Hide from view"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Timeline View */}
            {viewMode === 'timeline' && processedItems.length > 0 && (
              <div className="flex flex-col gap-3 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-[2px] before:bg-dark-border">
                {processedItems.map((item) => {
                  const liked = isLiked(item.id);
                  const platforms = extractPlatformBadges(item);
                  return (
                    <div
                      key={item.id}
                      className="relative pl-14 group flex flex-col sm:flex-row sm:items-center justify-between gap-space-md p-space-md rounded-[18px] bg-dark-surface hover:bg-deep-dark border border-dark-border/40 transition-all"
                    >
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-deep-dark border-2 border-secondary-container group-hover:bg-secondary-container transition-colors"></div>

                      <div className="flex items-center gap-space-md min-w-0">
                        {item.image && (
                          <img
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-dark-border/40"
                            src={item.image}
                            alt=""
                            loading="lazy"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-label-code text-[11px] text-secondary-fixed-dim uppercase">
                              {item.source} • {item.type}
                            </span>
                            {platforms.map((p) => (
                              <span
                                key={p.name}
                                className="px-1.5 py-0.2 rounded bg-secondary-container/20 text-secondary-fixed-dim font-label-code text-[9px] font-bold"
                              >
                                {p.name}
                              </span>
                            ))}
                            <span className="text-outline text-xs">•</span>
                            <span className="font-label-code text-[11px] text-outline">
                              {item.date || 'TBA'}
                            </span>
                          </div>
                          <a
                            href={item.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="font-headline-sm text-[16px] text-on-primary hover:text-secondary-fixed-dim transition-colors truncate block"
                          >
                            {item.title}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => toggleLike(item)}
                          className={`p-2 rounded-lg text-xs font-label-code transition-colors ${
                            liked
                              ? 'bg-secondary-container text-on-primary'
                              : 'bg-dark-bg text-outline-variant hover:text-on-primary'
                          }`}
                          title="Track release"
                        >
                          <span
                            className={`material-symbols-outlined text-[16px] ${
                              liked ? 'material-symbols-fill' : ''
                            }`}
                          >
                            {liked ? 'bookmark_added' : 'bookmark_add'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
