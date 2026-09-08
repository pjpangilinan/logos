import React, { useState, useMemo } from 'react';
import type { Item } from '../lib/db';
import { extractPlatformBadges } from '../lib/platforms';

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
  const [recPage, setRecPage] = useState(0);

  // Filter items by search query and category pill
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedFilter !== 'all' && item.type !== selectedFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchTag = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchSource = item.source.toLowerCase().includes(q);
        if (!matchTitle && !matchTag && !matchSource) return false;
      }
      return true;
    });
  }, [items, selectedFilter, searchQuery]);

  // New Arrivals: sorted by first_seen_at DESC
  const newArrivals = useMemo(() => {
    return [...filteredItems]
      .sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime())
      .slice(0, 10);
  }, [filteredItems]);

  // Upcoming Radar: sorted strictly chronologically ASC (imminent first, then future)
  const upcomingRadar = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const withDates = filteredItems.filter((i) => i.date);
    const upcoming = withDates
      .filter((i) => i.date! >= today)
      .sort((a, b) => a.date!.localeCompare(b.date!));
    const past = withDates
      .filter((i) => i.date! < today)
      .sort((a, b) => b.date!.localeCompare(a.date!));

    // Prefer upcoming chronologically (closest to release date first)
    const list = upcoming.length >= 8 ? upcoming : [...upcoming, ...past];
    return list.slice(0, 15);
  }, [filteredItems]);

  // Popular & Trending hero items (3 per page)
  const popularItems = useMemo(() => {
    const pool = items.filter((it) => it.image && it.date);
    const sorted = [...pool].sort((a, b) => {
      const typeScore = (t: string) => (t === 'movie' || t === 'tv' || t === 'game' ? 2 : 1);
      return typeScore(b.type) - typeScore(a.type);
    });
    const list = sorted.length > 0 ? sorted : items;
    const pageSize = 5;
    const maxPage = Math.max(0, Math.ceil(list.length / pageSize) - 1);
    const clampedPage = Math.min(recPage, maxPage);
    return {
      displayed: list.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize),
      maxPage,
      currentPage: clampedPage,
    };
  }, [items, recPage]);

  // Format date helper
  const formatDateBadge = (dateStr: string | null) => {
    if (!dateStr) return { month: 'TBA', day: '--' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { month: 'TBA', day: '--' };
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = d.getDate().toString().padStart(2, '0');
    return { month, day };
  };

  const [currentTimestamp] = useState(() => Date.now());

  const formatRelativeTime = (dateStr: string) => {
    const diffMs = currentTimestamp - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const formatCountdown = (dateStr: string | null) => {
    if (!dateStr) return 'TBA';
    const target = new Date(dateStr).getTime();
    const diffDays = Math.ceil((target - currentTimestamp) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 14) return `in ${diffDays}d`;
    const weeks = Math.round(diffDays / 7);
    if (weeks < 8) return `in ${weeks}w`;
    const months = Math.round(diffDays / 30);
    return `in ${months}mo`;
  };

  return (
    <div className="w-full bg-dark-bg text-on-primary min-h-screen pb-space-4xl">
      {/* ─── Filter Control Bar ────────────────────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-gutter pt-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pb-space-md border-b border-dark-border/60">
          <div className="flex items-center gap-space-xs flex-wrap">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-space-md py-2 rounded-full font-label-code text-label-code transition-all ${
                selectedFilter === 'all'
                  ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                  : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
              }`}
            >
              All <span className="opacity-75 ml-1">({items.length})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('movie')}
              className={`px-space-md py-2 rounded-full font-label-code text-label-code transition-all ${
                selectedFilter === 'movie'
                  ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                  : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
              }`}
            >
              Movies <span className="opacity-60 ml-1">({counts['movie'] || 0})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('tv')}
              className={`px-space-md py-2 rounded-full font-label-code text-label-code transition-all ${
                selectedFilter === 'tv'
                  ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                  : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
              }`}
            >
              TV Series <span className="opacity-60 ml-1">({counts['tv'] || 0})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('game')}
              className={`px-space-md py-2 rounded-full font-label-code text-label-code transition-all ${
                selectedFilter === 'game'
                  ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                  : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
              }`}
            >
              Games <span className="opacity-60 ml-1">({counts['game'] || 0})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('news')}
              className={`px-space-md py-2 rounded-full font-label-code text-label-code transition-all ${
                selectedFilter === 'news'
                  ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-md'
                  : 'bg-dark-surface text-outline-variant hover:text-on-primary hover:bg-deep-dark border border-dark-border/40'
              }`}
            >
              Tech & News <span className="opacity-60 ml-1">({counts['news'] || 0})</span>
            </button>
          </div>

          <div className="flex items-center gap-space-sm self-end sm:self-auto">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
              Split Stream View
            </span>
            <div className="bg-dark-surface border border-dark-border p-1 rounded-lg flex items-center gap-1">
              <button
                className="p-1 rounded bg-deep-dark text-secondary-fixed-dim"
                title="Split Columns"
              >
                <span className="material-symbols-outlined text-[18px]">view_column</span>
              </button>
            </div>
          </div>
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
                First Seen Order
              </span>
            </div>

            {newArrivals.length === 0 ? (
              <div className="rounded-[20px] bg-dark-surface p-space-xl text-center border border-dark-border text-outline">
                No new arrival entries match current query.
              </div>
            ) : (
              newArrivals.map((item) => {
                const liked = isLiked(item.id);
                const platforms = extractPlatformBadges(item);
                return (
                  <div
                    key={item.id}
                    className="group rounded-[20px] bg-dark-surface p-space-md flex items-center gap-space-md hover:bg-deep-dark border border-dark-border/40 hover:border-dark-border transition-all duration-300"
                  >
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-dark-bg border border-dark-border/40">
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
                          {formatRelativeTime(item.first_seen_at)}
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

                      {platforms.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {platforms.map((p) => (
                            <span
                              key={p.name}
                              className="px-1.5 py-0.2 rounded bg-secondary-container/20 text-secondary-fixed-dim font-label-code text-[9px] font-bold"
                            >
                              {p.name}
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
                const platforms = extractPlatformBadges(item);
                const countdown = formatCountdown(item.date);
                const isImminent = countdown === 'Today' || countdown === 'Tomorrow';

                return (
                  <div
                    key={item.id}
                    className="group rounded-[20px] bg-dark-surface p-space-md hover:bg-deep-dark border border-dark-border/40 hover:border-dark-border transition-all duration-300 flex items-center justify-between gap-space-md"
                  >
                    <div className="flex items-center gap-space-md min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border/60 flex flex-col items-center justify-center text-center flex-shrink-0">
                        <span className="font-label-code text-[11px] text-tertiary-fixed-dim uppercase leading-none font-bold">
                          {dateBadge.month}
                        </span>
                        <span className="font-headline-sm text-[16px] text-on-primary leading-tight font-bold">
                          {dateBadge.day}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-label-code text-label-code text-secondary-fixed-dim uppercase truncate">
                            {item.source} • {item.type}
                          </span>
                          {item.date && (
                            <>
                              <span className="text-outline text-[10px]">•</span>
                              <span className="font-label-code text-[11px] text-outline flex-shrink-0">
                                {item.date}
                              </span>
                            </>
                          )}
                        </div>
                        <a
                          href={item.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="font-headline-sm text-[16px] leading-tight text-on-primary mt-0.5 hover:text-secondary-fixed-dim transition-colors truncate block"
                        >
                          {item.title}
                        </a>
                        {platforms.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {platforms.map((p) => (
                              <span
                                key={p.name}
                                className="px-1.5 py-0.2 rounded bg-secondary-container/20 text-secondary-fixed-dim font-label-code text-[9px] font-bold"
                              >
                                {p.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-space-sm flex-shrink-0">
                      <span
                        className={`font-label-code text-label-code font-bold px-2.5 py-1 rounded-full hidden sm:inline-block border ${
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
              </div>
            </div>

            {/* Compact Trending List */}
            <div className="flex flex-col gap-2.5">
              {popularItems.displayed.map((item, index) => {
                const rank = popularItems.currentPage * 5 + index + 1;
                const liked = isLiked(item.id);
                const platforms = extractPlatformBadges(item);
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
                      <div className="flex items-center gap-1 mt-1 truncate">
                        {platforms.slice(0, 2).map((p) => (
                          <span
                            key={p.name}
                            className="font-label-code text-[9px] px-1.5 py-0.2 rounded bg-secondary-container/20 text-secondary-fixed-dim font-semibold"
                          >
                            {p.name}
                          </span>
                        ))}
                        {platforms.length === 0 && item.tags[0] && (
                          <span className="font-label-code text-[9px] text-outline-variant truncate">
                            {item.tags[0]}
                          </span>
                        )}
                      </div>
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
              })}
            </div>
          </div>
        </aside>
      </div>
    </section>
  </div>
);
};
