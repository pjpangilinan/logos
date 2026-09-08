import React, { useState, useMemo } from 'react';
import type { Item } from '../lib/db';
import type { ScoredItem } from '../lib/recommendations';
import { extractPlatformBadges } from '../lib/platforms';

interface RadarPageProps {
  items: Item[];
  recommendations: ScoredItem[];
  counts: Record<string, number>;
  isLiked: (id: string) => boolean;
  toggleLike: (item: Item) => void;
  dismiss: (id: string) => void;
  searchQuery: string;
}

export const RadarPage: React.FC<RadarPageProps> = ({
  items,
  recommendations,
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

  // Curated hero recommendations slice (3 per view)
  const curatedItems = useMemo(() => {
    const pool = recommendations.length > 0 ? recommendations : items.slice(0, 9).map((it) => ({ item: it, score: 85 }));
    const pageSize = 3;
    const maxPage = Math.max(0, Math.ceil(pool.length / pageSize) - 1);
    const clampedPage = Math.min(recPage, maxPage);
    return {
      displayed: pool.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize),
      maxPage,
      currentPage: clampedPage,
    };
  }, [recommendations, items, recPage]);

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
      {/* ─── Hero Recommendations: Curated Pulse for You ────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-gutter pt-space-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-lg gap-space-sm">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-primary tracking-tight">
              For You
            </h2>
            <p className="font-body-sm text-body-sm text-outline-variant mt-0.5">
              Recommended releases based on your liked tags
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setRecPage((p) => Math.max(0, p - 1))}
              disabled={curatedItems.currentPage === 0}
              className="w-9 h-9 rounded-[10px] bg-dark-surface text-on-primary hover:bg-secondary-container transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-dark-surface"
              aria-label="Previous recommendations"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={() => setRecPage((p) => Math.min(curatedItems.maxPage, p + 1))}
              disabled={curatedItems.currentPage >= curatedItems.maxPage}
              className="w-9 h-9 rounded-[10px] bg-dark-surface text-on-primary hover:bg-secondary-container transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-dark-surface"
              aria-label="Next recommendations"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* 3-Column Prominent Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg relative">
          {curatedItems.displayed.map(({ item, score }, index) => {
            const liked = isLiked(item.id);
            const matchPercentage = Math.min(99, Math.max(75, Math.round(score > 0 ? 80 + score * 3 : 88 - index * 4)));
            const platforms = extractPlatformBadges(item);
            const glowGradients = [
              'from-tertiary-fixed-dim/20 to-secondary-container/20',
              'from-secondary-container/20 to-tertiary-container/20',
              'from-tertiary-fixed-dim/20 to-tertiary-container/20',
            ];

            return (
              <div key={item.id} className="relative group">
                <div
                  className={`absolute -inset-1 rounded-[26px] bg-gradient-to-r ${
                    glowGradients[index % glowGradients.length]
                  } blur-xl opacity-40 group-hover:opacity-100 transition duration-500`}
                ></div>
                <div className="relative rounded-[22px] bg-dark-surface p-space-lg flex flex-col justify-between h-full overflow-hidden border border-dark-border/60">
                  <div className="flex items-center justify-between gap-space-sm z-10">
                    <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-container/20 text-secondary-fixed-dim font-label-code text-label-code">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>
                      {matchPercentage}% Match
                    </span>
                    <span className="font-label-code text-label-code text-outline uppercase">
                      {item.type}
                    </span>
                  </div>

                  <div className="relative w-full h-52 my-space-md rounded-[14px] overflow-hidden bg-deep-dark border border-dark-border/40">
                    {item.image ? (
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline bg-gradient-to-br from-dark-surface to-deep-dark">
                        <span className="material-symbols-outlined text-4xl opacity-30">radar</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-surface via-transparent to-transparent"></div>
                    <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                      <span className="font-label-code text-label-code px-2 py-0.5 rounded-md bg-dark-bg/90 text-on-primary border border-dark-border/40">
                        {item.source}
                      </span>
                      {platforms.map((p) => (
                        <span
                          key={p.name}
                          className="font-label-code text-label-code px-2 py-0.5 rounded-md bg-secondary-container/30 text-secondary-fixed-dim border border-secondary-container/40 font-bold"
                        >
                          {p.name}
                        </span>
                      ))}
                      {item.tags.filter((t) => !platforms.some((p) => p.name === t)).slice(0, Math.max(1, 2 - platforms.length)).map((tag) => (
                        <span
                          key={tag}
                          className="font-label-code text-label-code px-2 py-0.5 rounded-md bg-dark-bg/70 text-outline-variant"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="z-10 flex flex-col gap-space-xs">
                    <h3 className="font-headline-sm text-[20px] text-on-primary tracking-tight line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="font-body-sm text-body-sm text-outline-variant line-clamp-2">
                      {item.tags.length > 0 ? item.tags.join(' • ') : 'Indexed release entry from monitored source.'}
                    </p>
                    <div className="pt-space-sm flex items-center justify-between border-t border-dark-border/40 mt-2">
                      <span className="font-label-code text-label-code text-outline">
                        {formatCountdown(item.date)}
                      </span>
                      <button
                        onClick={() => toggleLike(item)}
                        className={`px-space-md py-1.5 rounded-[10px] font-label-caps text-label-caps tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                          liked
                            ? 'bg-secondary-container text-on-primary font-semibold'
                            : 'bg-on-primary text-primary hover:bg-secondary-container hover:text-on-primary'
                        }`}
                      >
                        {liked ? 'Saved' : 'Queue'}
                        <span className="material-symbols-outlined text-[16px]">
                          {liked ? 'bookmark_added' : 'bookmark_add'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Filter Control Bar ────────────────────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-gutter mt-space-2xl">
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

      {/* ─── Main Content: Split-Stream Feed ───────────────────────────── */}
      <section className="w-full max-w-[1440px] mx-auto px-gutter mt-space-md">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-xl items-start">
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
      </section>
    </div>
  );
};
