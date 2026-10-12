import React, { useState, useMemo } from 'react';
import type { Item } from '../lib/db';
import {
  getPhtDateStr,
  getPhtDateOffset,
  formatPhtDateBadge,
  formatPhtRelativeTime,
  formatPhtCountdown,
} from '../lib/timezone';
import { matchItemSearch } from '../lib/search';

interface RadarPageProps {
  items: Item[];
  counts: Record<string, number>;
  isLiked: (id: string) => boolean;
  toggleLike: (item: Item) => void;
  dismiss: (id: string) => void;
  searchQuery: string;
}

export const RadarPage: React.FC<RadarPageProps> = ({
  items,
  counts,
  isLiked,
  toggleLike,
  dismiss,
  searchQuery,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'movie' | 'tv' | 'game' | 'news'>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [recPage, setRecPage] = useState(0);

  // Available sources based on current items
  const availableSources = useMemo(() => {
    const countsMap = new Map<string, number>();
    for (const item of items) {
      if (selectedFilter !== 'all' && item.type !== selectedFilter) continue;
      countsMap.set(item.source, (countsMap.get(item.source) || 0) + 1);
    }
    return Array.from(countsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }));
  }, [items, selectedFilter]);

  // Filter items by search query, category pill, and source filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedFilter !== 'all' && item.type !== selectedFilter) return false;
      if (selectedSource !== 'all' && item.source !== selectedSource) return false;
      if (searchQuery.trim() && !matchItemSearch(item, searchQuery)) return false;
      return true;
    });
  }, [items, selectedFilter, selectedSource, searchQuery]);

  // New Arrivals: items that have actually released in PHT (never unreleased future items, never ancient retro items)
  // Preserves listings and data gathered from today and the day before
  const newArrivals = useMemo(() => {
    const today = getPhtDateStr();
    const dayBefore = getPhtDateOffset(-1);
    const sixMonthsAgo = getPhtDateOffset(-180);

    const pool = [...filteredItems]
      .filter((item) => {
        // News items are published upon arrival
        if (item.type === 'news') return true;
        // Movies, TV, Games MUST have a release date that has already arrived (never unreleased future items)
        if (!item.date || item.date > today) return false;
        // Must be recent (released within the last 6 months, not ancient retro items)
        if (item.date < sixMonthsAgo) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by actual release date DESC (newest release first), fallback to first_seen_at
        if (a.date && b.date && a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime();
      });

    // Guarantee that all releases and data gathered from today and the day before are kept
    const todayAndYesterday = pool.filter((item) => {
      const d = (item.date || item.first_seen_at).slice(0, 10);
      return d >= dayBefore;
    });

    return pool.slice(0, Math.max(15, Math.min(30, todayAndYesterday.length + 5)));
  }, [filteredItems]);

  // Upcoming Radar: releases from yesterday/today onwards in PHT sorted chronologically ASC (news is not an upcoming release)
  // Keeps today and the day before listings so imminent/recent drops remain prominent
  const upcomingRadar = useMemo(() => {
    const dayBefore = getPhtDateOffset(-1);
    return filteredItems
      .filter((i) => i.type !== 'news' && i.date && i.date >= dayBefore)
      .sort((a, b) => a.date!.localeCompare(b.date!))
      .slice(0, 20);
  }, [filteredItems]);

  // Popular & Trending items: strictly movies/TV/games (NEVER news).
  // Prioritizes:
  // 1. Tag richness / platform presence
  // 2. Imminent releases (releasing in next 30 days)
  // 3. Chronological recency
  const popularItems = useMemo(() => {
    const today = getPhtDateStr();
    const imminentCutoff = getPhtDateOffset(30);
    const pastCutoff = getPhtDateOffset(-90);

    // Filter out news completely from Popular & Trending
    const entertainmentPool = items.filter((it) => {
      if (it.type === 'news') return false;
      if (!it.image) return false;
      if (selectedFilter !== 'all' && selectedFilter !== 'news' && it.type !== selectedFilter) return false;
      if (searchQuery.trim() && !matchItemSearch(it, searchQuery)) return false;
      return true;
    });

    const scored = entertainmentPool.map((it) => {
      let score = 0;

      // Platform & tag richness proxy for popularity/production scale
      score += Math.min(it.tags.length * 3, 25);

      // Imminent releases (releasing within the next 30 days) get highest excitement boost
      if (it.date) {
        if (it.date >= today && it.date <= imminentCutoff) {
          // Drops very soon (e.g. within 7 days = +40, within 30 days = +30)
          const daysAway = (new Date(it.date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24);
          score += Math.max(10, 45 - Math.round(daysAway));
        } else if (it.date < today && it.date >= pastCutoff) {
          // Freshly dropped in last 90 days
          score += 20;
        } else if (it.date > imminentCutoff) {
          // Future anticipation
          score += 10;
        }
      }

      return { item: it, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.item.date && b.item.date) return a.item.date.localeCompare(b.item.date);
      return new Date(b.item.first_seen_at).getTime() - new Date(a.item.first_seen_at).getTime();
    });

    const top10 = scored.slice(0, 10).map((s) => s.item);
    const pageSize = 5;
    const maxPage = Math.max(0, Math.ceil(top10.length / pageSize) - 1);
    const clampedPage = Math.min(recPage, maxPage);
    return {
      displayed: top10.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize),
      maxPage,
      currentPage: clampedPage,
      totalCount: top10.length,
    };
  }, [items, selectedFilter, searchQuery, recPage]);

  const [currentTimestamp] = useState(() => Date.now());
  const formatDateBadge = formatPhtDateBadge;
  const formatRelativeTime = (dateStr: string) => formatPhtRelativeTime(dateStr, currentTimestamp);
  const formatCountdown = (dateStr: string | null) => formatPhtCountdown(dateStr, currentTimestamp);

  const handleFilterChange = (filter: 'all' | 'movie' | 'tv' | 'game' | 'news') => {
    setSelectedFilter(filter);
    setSelectedSource('all');
    setRecPage(0);
  };

  return (
    <div className="w-full bg-dark-bg text-on-primary min-h-screen pb-space-4xl">
      {/* ─── Filter Control Bar ────────────────────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-gutter pt-space-lg">
        <div className="flex flex-col gap-space-sm pb-space-sm sm:pb-space-md border-b border-dark-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm sm:gap-space-md">
            <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap pb-1 sm:pb-0 -mx-gutter px-gutter sm:mx-0 sm:px-0">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-3 sm:px-space-md py-1.5 sm:py-2 rounded-full font-label-code text-xs sm:text-label-code whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                    : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
                }`}
              >
                All <span className="opacity-75 ml-1">({items.length})</span>
              </button>
              <button
                onClick={() => handleFilterChange('movie')}
                className={`px-3 sm:px-space-md py-1.5 sm:py-2 rounded-full font-label-code text-xs sm:text-label-code whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  selectedFilter === 'movie'
                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                    : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
                }`}
              >
                Movies <span className="opacity-60 ml-1">({counts['movie'] || 0})</span>
              </button>
              <button
                onClick={() => handleFilterChange('tv')}
                className={`px-3 sm:px-space-md py-1.5 sm:py-2 rounded-full font-label-code text-xs sm:text-label-code whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  selectedFilter === 'tv'
                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                    : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
                }`}
              >
                TV Series <span className="opacity-60 ml-1">({counts['tv'] || 0})</span>
              </button>
              <button
                onClick={() => handleFilterChange('game')}
                className={`px-3 sm:px-space-md py-1.5 sm:py-2 rounded-full font-label-code text-xs sm:text-label-code whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  selectedFilter === 'game'
                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                    : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
                }`}
              >
                Games <span className="opacity-60 ml-1">({counts['game'] || 0})</span>
              </button>
              <button
                onClick={() => handleFilterChange('news')}
                className={`px-3 sm:px-space-md py-1.5 sm:py-2 rounded-full font-label-code text-xs sm:text-label-code whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  selectedFilter === 'news'
                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                    : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
                }`}
              >
                Tech & News <span className="opacity-60 ml-1">({counts['news'] || 0})</span>
              </button>
            </div>

            <div className="flex items-center gap-space-sm self-start sm:self-auto">
              <span className="font-label-code text-[10px] sm:text-[11px] text-secondary-fixed-dim bg-secondary-container/20 px-2 py-0.5 rounded-full border border-secondary-container/40">
                GMT+8 PHT
              </span>
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider hidden sm:inline">
                Split Stream View
              </span>
            </div>
          </div>

          {/* Source / Feed Filter Chips */}
          {availableSources.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-1 -mx-gutter px-gutter sm:mx-0 sm:px-0">
              <span className="font-label-code text-[11px] text-outline uppercase tracking-wider flex-shrink-0 mr-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">tune</span> Source:
              </span>
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-2.5 py-1 rounded-lg font-label-code text-[11px] whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  selectedSource === 'all'
                    ? 'bg-secondary-container/30 text-secondary-fixed-dim border border-secondary-container/60 font-semibold'
                    : 'bg-dark-surface/60 text-outline hover:text-on-primary border border-dark-border/40'
                }`}
              >
                All Sources
              </button>
              {availableSources.map(({ source, count }) => (
                <button
                  key={source}
                  onClick={() => setSelectedSource(source)}
                  className={`px-2.5 py-1 rounded-lg font-label-code text-[11px] whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                    selectedSource === source
                      ? 'bg-secondary-container/30 text-secondary-fixed-dim border border-secondary-container/60 font-semibold'
                      : 'bg-dark-surface/60 text-outline hover:text-on-primary border border-dark-border/40'
                  }`}
                >
                  {source.replace(/^rss:/, '')} <span className="opacity-60 ml-0.5">({count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Main Content: Split-Stream Feed + Side Rail ───────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-gutter mt-space-md">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
          {/* Main 2-Column Split Stream (Left / Center, 8 cols on xl) */}
          <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-space-lg items-start">
          {/* COLUMN 1: New Arrivals (Sorted by Discovery Time) */}
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary-fixed-dim text-[20px]">bolt</span>
                <h3 className="font-headline-sm text-headline-sm text-on-primary tracking-tight">
                  New Arrivals
                </h3>
              </div>
              <span className="font-label-code text-label-code text-outline uppercase">
                Recently Released
              </span>
            </div>

            {newArrivals.length === 0 ? (
              <div className="rounded-[20px] bg-dark-surface p-space-xl text-center border border-dark-border text-outline">
                No new arrival entries match current query.
              </div>
            ) : (
              newArrivals.map((item) => {
                const liked = isLiked(item.id);
                return (
                  <div
                    key={item.id}
                    className="group rounded-[20px] bg-dark-surface p-3 sm:p-space-md flex items-center gap-3 sm:gap-space-md hover:bg-deep-dark border border-dark-border/40 hover:border-dark-border transition-all duration-300"
                  >
                    <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-dark-bg border border-dark-border/40">
                      {item.image ? (
                        <img
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          src={item.image}
                          alt={item.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline opacity-40">
                          <span className="material-symbols-outlined text-[24px]">image</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-center flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-label-code text-label-code text-secondary-fixed-dim uppercase truncate">
                          {item.source} • {item.type}
                        </span>
                        <span className="font-label-caps text-label-caps text-outline uppercase flex-shrink-0">
                          {formatRelativeTime(item.date || item.first_seen_at)}
                        </span>
                      </div>

                      <a
                        href={item.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-headline-sm text-[16px] leading-snug text-on-primary mt-1 hover:text-secondary-fixed-dim transition-colors truncate block"
                      >
                        {item.title}
                      </a>

                      <p className="font-body-sm text-body-sm text-outline-variant mt-0.5 line-clamp-1">
                        {item.tags.join(' • ') || item.title}
                      </p>

                      {item.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {item.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.2 rounded bg-deep-dark text-outline-variant font-label-code text-[9px]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleLike(item)}
                        className={`p-2 rounded-lg transition-colors ${
                          liked
                            ? 'text-error bg-dark-bg'
                            : 'text-outline-variant hover:text-error hover:bg-dark-bg'
                        }`}
                        title={liked ? 'Unlike' : 'Like & Save'}
                        type="button"
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            liked ? 'material-symbols-fill' : ''
                          }`}
                        >
                          favorite
                        </span>
                      </button>
                      <button
                        onClick={() => dismiss(item.id)}
                        className="p-2 rounded-lg text-outline-variant hover:text-on-primary hover:bg-dark-bg transition-colors"
                        title="Dismiss from feed"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* COLUMN 2: Upcoming Radar (Sorted by Future Release Dates) */}
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">radar</span>
                <h3 className="font-headline-sm text-headline-sm text-on-primary tracking-tight">
                  Upcoming Radar
                </h3>
              </div>
              <span className="font-label-code text-label-code text-outline uppercase">
                Chronological Release
              </span>
            </div>

            {upcomingRadar.length === 0 ? (
              <div className="rounded-[20px] bg-dark-surface p-space-xl text-center border border-dark-border text-outline">
                No upcoming releases registered.
              </div>
            ) : (
              upcomingRadar.map((item) => {
                const dateBadge = formatDateBadge(item.date);
                const liked = isLiked(item.id);
                const countdown = formatCountdown(item.date);
                const isImminent = countdown === 'Today' || countdown === 'Tomorrow' || countdown === 'Yesterday';

                return (
                  <div
                    key={item.id}
                    className="group rounded-[20px] bg-dark-surface p-3 sm:p-space-md hover:bg-deep-dark border border-dark-border/40 hover:border-dark-border transition-all duration-300 flex items-center justify-between gap-2 sm:gap-space-md"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-space-md min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-dark-bg border border-dark-border/60 flex flex-col items-center justify-center text-center flex-shrink-0">
                        <span className="font-label-code text-[10px] sm:text-[11px] text-tertiary-fixed-dim uppercase leading-none font-bold">
                          {dateBadge.month}
                        </span>
                        <span className="font-headline-sm text-sm sm:text-[16px] text-on-primary leading-tight font-bold">
                          {dateBadge.day}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-label-code text-[10px] sm:text-label-code text-secondary-fixed-dim uppercase truncate">
                            {item.source} • {item.type}
                          </span>
                          {item.date && (
                            <>
                              <span className="text-outline text-[10px] hidden xs:inline">•</span>
                              <span className="font-label-code text-[10px] sm:text-[11px] text-outline flex-shrink-0 hidden xs:inline">
                                {item.date}
                              </span>
                            </>
                          )}
                        </div>
                        <a
                          href={item.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="font-headline-sm text-sm sm:text-[16px] leading-tight text-on-primary mt-0.5 hover:text-secondary-fixed-dim transition-colors truncate block"
                        >
                          {item.title}
                        </a>
                        {item.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {item.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.2 rounded bg-deep-dark text-outline-variant font-label-code text-[9px]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-space-sm flex-shrink-0">
                      <span
                        className={`font-label-code text-[10px] sm:text-label-code font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border whitespace-nowrap ${
                          isImminent
                            ? 'bg-secondary-container/25 text-secondary-fixed-dim border-secondary-container/50'
                            : 'bg-dark-bg text-outline-variant border-dark-border/40'
                        }`}
                      >
                        {countdown}
                      </span>
                      <button
                        onClick={() => toggleLike(item)}
                        className={`p-2 rounded-xl transition-colors ${
                          liked
                            ? 'bg-secondary-container/20 text-secondary-fixed-dim border border-secondary-container/40'
                            : 'bg-dark-bg text-outline-variant hover:text-secondary-fixed-dim border border-dark-border/60'
                        }`}
                        title={liked ? 'Saved in library' : 'Bookmark & track'}
                        type="button"
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            liked ? 'material-symbols-fill' : ''
                          }`}
                        >
                          {liked ? 'bookmark_added' : 'bookmark'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SIDE RAIL: Popular & Trending (Right Rail, 4 cols on xl) */}
        <aside className="xl:col-span-4 xl:sticky xl:top-20 flex flex-col gap-space-md">
          <div className="rounded-2xl bg-dark-surface p-space-md border border-dark-border/60 flex flex-col gap-space-md shadow-lg">
            {/* Header with Title and Pagination */}
            <div className="flex items-center justify-between pb-space-xs border-b border-dark-border/40">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary-fixed-dim text-[18px]">
                  trending_up
                </span>
                <h3 className="font-headline-sm text-sm text-on-primary tracking-tight font-semibold">
                  Popular & Trending
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {popularItems.totalCount > 5 && (
                  <>
                    <span className="font-label-code text-[11px] text-outline">
                      {popularItems.currentPage + 1}/{popularItems.maxPage + 1}
                    </span>
                    <button
                      onClick={() => setRecPage((p) => Math.max(0, p - 1))}
                      disabled={popularItems.currentPage === 0}
                      className="w-7 h-7 rounded-lg bg-dark-bg text-on-primary hover:bg-secondary-container transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-dark-bg cursor-pointer"
                      aria-label="Previous trending page"
                    >
                      <span className="material-symbols-outlined text-[15px]">chevron_left</span>
                    </button>
                    <button
                      onClick={() => setRecPage((p) => Math.min(popularItems.maxPage, p + 1))}
                      disabled={popularItems.currentPage >= popularItems.maxPage}
                      className="w-7 h-7 rounded-lg bg-dark-bg text-on-primary hover:bg-secondary-container transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-dark-bg cursor-pointer"
                      aria-label="Next trending page"
                    >
                      <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Compact Trending List */}
            <div className="flex flex-col gap-2.5">
              {popularItems.displayed.length === 0 ? (
                <div className="p-space-md text-center text-outline text-xs rounded-xl bg-dark-bg/60 border border-dark-border/40">
                  No popular items match this category.
                </div>
              ) : (
                popularItems.displayed.map((item, index) => {
                  const rank = popularItems.currentPage * 5 + index + 1;
                  const liked = isLiked(item.id);
                  const countdown = formatCountdown(item.date);

                  return (
                    <div
                      key={item.id}
                      className="group rounded-xl bg-dark-bg/80 hover:bg-deep-dark p-2.5 border border-dark-border/40 hover:border-dark-border transition-all flex items-center gap-space-sm"
                    >
                      {/* Thumbnail with rank badge */}
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-dark-surface border border-dark-border/40">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-outline opacity-40">
                            <span className="material-symbols-outlined text-[18px]">radar</span>
                          </div>
                        )}
                        <span className="absolute top-0.5 left-0.5 min-w-4 h-4 px-1 rounded bg-black/80 backdrop-blur-xs text-[9px] font-label-code text-secondary-fixed-dim font-bold flex items-center justify-center">
                          #{rank}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex flex-col justify-center min-w-0 flex-grow">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-label-code text-[10px] text-secondary-fixed-dim uppercase truncate">
                            {item.source} • {item.type}
                          </span>
                          <span className="font-label-code text-[10px] text-outline flex-shrink-0">
                            {countdown}
                          </span>
                        </div>
                        <a
                          href={item.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="font-headline-sm text-[13px] text-on-primary hover:text-secondary-fixed-dim transition-colors truncate block mt-0.5 font-medium"
                        >
                          {item.title}
                        </a>
                        {item.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 truncate">
                            <span className="font-label-code text-[9px] text-outline-variant truncate">
                              {item.tags[0]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick Bookmark */}
                      <button
                        onClick={() => toggleLike(item)}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 cursor-pointer ${
                          liked
                            ? 'bg-secondary-container/20 text-secondary-fixed-dim border border-secondary-container/40'
                            : 'bg-dark-surface text-outline-variant hover:text-on-primary border border-dark-border/40'
                        }`}
                        title={liked ? 'Saved' : 'Track'}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {liked ? 'bookmark_added' : 'bookmark'}
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  </div>
);
};
