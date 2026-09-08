import React, { useState, useMemo } from 'react';
import type { Item } from '../lib/db';

interface LibraryPageProps {
  items: Item[];
  likedItems: Item[];
  dismissedIds: string[];
  toggleLike: (item: Item) => void;
  restoreDismissed: (id: string) => void;
  restoreAllDismissed: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  items,
  likedItems,
  dismissedIds,
  toggleLike,
  restoreDismissed,
  restoreAllDismissed,
  searchQuery,
  onSearchChange,
}) => {
  const [activeTab, setActiveTab] = useState<'tracked' | 'dismissed'>('tracked');
  const [filterType, setFilterType] = useState<'all' | 'cinema' | 'games'>('all');
  const [watchedIds, setWatchedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('logos_watched_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleWatched = (id: string) => {
    setWatchedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('logos_watched_ids', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Upcoming tracked items
  const upcomingTracked = useMemo(() => {
    return likedItems.filter((i) => i.date && i.date >= todayStr);
  }, [likedItems, todayStr]);

  const [currentTimestamp] = useState(() => Date.now());

  // Next drop countdown calculation
  const nextDropInfo = useMemo(() => {
    const sorted = [...upcomingTracked].sort((a, b) => a.date!.localeCompare(b.date!));
    if (sorted.length === 0) return { title: 'None pending', countdown: '--' };
    const nextItem = sorted[0];
    const diffMs = new Date(nextItem.date!).getTime() - currentTimestamp;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const countdown = diffDays <= 0 ? 'Today' : `${diffDays}d left`;
    return { title: nextItem.title, countdown };
  }, [upcomingTracked, currentTimestamp]);

  // Filtered tracked releases
  const displayedTracked = useMemo(() => {
    return likedItems.filter((item) => {
      if (filterType === 'cinema' && item.type !== 'movie' && item.type !== 'tv') return false;
      if (filterType === 'games' && item.type !== 'game') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          item.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [likedItems, filterType, searchQuery]);

  // Split into Releasing Soon vs Released
  const releasingSoon = useMemo(() => {
    return displayedTracked.filter((i) => !i.date || i.date >= todayStr);
  }, [displayedTracked, todayStr]);

  const releasedArchive = useMemo(() => {
    return displayedTracked.filter((i) => i.date && i.date < todayStr);
  }, [displayedTracked, todayStr]);

  // Dismissed items lookup
  const dismissedItems = useMemo(() => {
    const map = new Map<string, Item>();
    for (const it of items) map.set(it.id, it);
    return dismissedIds
      .map((id) => map.get(id))
      .filter((it): it is Item => it !== undefined)
      .filter((it) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return it.title.toLowerCase().includes(q);
      });
  }, [items, dismissedIds, searchQuery]);

  // Export JSON functionality
  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      trackedReleases: likedItems.map((i) => ({
        id: i.id,
        title: i.title,
        type: i.type,
        date: i.date,
        source: i.source,
        url: i.url,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logos-tracked-releases-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export ICS calendar functionality
  const handleExportIcs = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Logos Release Radar//EN',
      'CALSCALE:GREGORIAN',
    ];

    for (const it of upcomingTracked) {
      if (!it.date) continue;
      const cleanDate = it.date.replace(/-/g, '');
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${it.id}@logos.radar`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `SUMMARY:[${it.type.toUpperCase()}] ${it.title}`,
        `DESCRIPTION:Tracked via logos release radar: ${it.url || ''}`,
        'END:VEVENT'
      );
    }

    icsContent.push('END:VCALENDAR');
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logos-releases.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCountdownDays = (dateStr: string | null) => {
    if (!dateStr) return 'TBA';
    const diff = Math.ceil((new Date(dateStr).getTime() - currentTimestamp) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'TODAY';
    return `T-MINUS ${diff} DAYS`;
  };

  return (
    <div className="w-full bg-dark-bg text-on-primary px-gutter py-space-xl min-h-screen pb-space-4xl">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-space-2xl">
        {/* ─── Editorial Header & Actions ──────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-lg text-headline-lg text-on-primary tracking-tight">
              My Library
            </h1>
            <p className="font-body-md text-body-md text-outline-variant max-w-2xl">
              Track your saved releases and export to calendar
            </p>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-space-sm self-start lg:self-auto flex-wrap">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-space-xs bg-secondary-container hover:bg-secondary text-on-primary px-space-md py-2.5 rounded-xl transition-colors font-headline-sm text-label-code shadow-md"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export JSON</span>
            </button>
            <button
              onClick={handleExportIcs}
              className="flex items-center gap-space-xs bg-dark-surface hover:bg-deep-dark border border-dark-border text-on-primary px-space-md py-2.5 rounded-xl transition-colors font-headline-sm text-label-code"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>Export Calendar (ICS)</span>
            </button>
          </div>
        </div>

        {/* ─── Metric Cards Grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-lg">
          {/* Total Liked */}
          <div className="group relative rounded-[22px] p-[1px] bg-gradient-to-b from-dark-border to-transparent hover:from-secondary-container transition-all duration-300 shadow-md">
            <div className="w-full h-full bg-dark-surface rounded-[21px] p-space-lg flex flex-col justify-between border border-dark-border/40">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-outline-variant">
                    Total Liked / Saved
                  </span>
                  <span className="font-headline-lg text-headline-lg text-on-primary tracking-tight mt-1">
                    {likedItems.length}
                  </span>
                </div>
                <span className="material-symbols-outlined text-secondary-fixed-dim text-[24px] p-space-xs bg-deep-dark rounded-xl border border-dark-border/40">
                  bookmark_heart
                </span>
              </div>
              <div className="mt-space-md text-outline-variant font-body-sm text-xs">
                Stored in browser localStorage
              </div>
            </div>
          </div>

          {/* Upcoming Tracked */}
          <div className="group relative rounded-[22px] p-[1px] bg-gradient-to-b from-dark-border to-transparent hover:from-secondary-container transition-all duration-300 shadow-md">
            <div className="w-full h-full bg-dark-surface rounded-[21px] p-space-lg flex flex-col justify-between border border-dark-border/40">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-outline-variant">
                    Upcoming Tracked
                  </span>
                  <span className="font-headline-lg text-headline-lg text-on-primary tracking-tight mt-1">
                    {upcomingTracked.length}
                  </span>
                </div>
                <span className="material-symbols-outlined text-secondary-container text-[24px] p-space-xs bg-deep-dark rounded-xl border border-dark-border/40">
                  radar
                </span>
              </div>
              <div className="mt-space-md text-outline-variant font-body-sm text-xs">
                Upcoming release dates monitored
              </div>
            </div>
          </div>

          {/* Next Drop In */}
          <div className="group relative rounded-[22px] p-[1px] bg-gradient-to-b from-dark-border to-transparent hover:from-secondary-container transition-all duration-300 shadow-md">
            <div className="w-full h-full bg-dark-surface rounded-[21px] p-space-lg flex flex-col justify-between border border-dark-border/40">
              <div className="flex items-start justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-outline-variant">
                    Next Drop In
                  </span>
                  <span className="font-headline-md text-headline-md text-secondary-fixed-dim tracking-tight font-mono mt-1 truncate">
                    {nextDropInfo.countdown}
                  </span>
                </div>
                <span className="material-symbols-outlined text-secondary text-[24px] p-space-xs bg-deep-dark rounded-xl border border-dark-border/40">
                  timer
                </span>
              </div>
              <div className="mt-space-md text-outline-variant font-body-sm text-xs truncate">
                {nextDropInfo.title}
              </div>
            </div>
          </div>

          {/* Sync Status */}
          <div className="group relative rounded-[22px] p-[1px] bg-gradient-to-b from-dark-border to-transparent hover:from-secondary-container transition-all duration-300 shadow-md">
            <div className="w-full h-full bg-dark-surface rounded-[21px] p-space-lg flex flex-col justify-between border border-dark-border/40">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-outline-variant">
                    Sync Status
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-pulse"></span>
                    <span className="font-headline-sm text-[20px] text-on-primary">Active</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[24px] p-space-xs bg-deep-dark rounded-xl border border-dark-border/40">
                  storage
                </span>
              </div>
              <div className="mt-space-md text-outline-variant font-body-sm text-xs">
                Static SQLite • No server required
              </div>
            </div>
          </div>
        </div>

        {/* ─── Segmented Navigation & Filters ──────────────────────────── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md pt-space-sm border-b border-dark-border/60 pb-4">
          <div className="inline-flex bg-deep-dark p-1 rounded-xl border border-dark-border/60 self-start">
            <button
              onClick={() => setActiveTab('tracked')}
              className={`flex items-center gap-space-xs px-space-md py-2 rounded-lg font-headline-sm text-body-sm transition-all ${
                activeTab === 'tracked'
                  ? 'bg-dark-surface text-on-primary shadow-sm font-semibold border border-dark-border'
                  : 'text-outline-variant hover:text-on-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-secondary-fixed-dim">
                bookmark_added
              </span>
              <span>Tracked / Liked</span>
              <span className="font-label-code text-label-code bg-deep-dark text-secondary-fixed-dim px-2 py-0.5 rounded-full border border-dark-border">
                {likedItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dismissed')}
              className={`flex items-center gap-space-xs px-space-md py-2 rounded-lg font-headline-sm text-body-sm transition-all ${
                activeTab === 'dismissed'
                  ? 'bg-dark-surface text-on-primary shadow-sm font-semibold border border-dark-border'
                  : 'text-outline-variant hover:text-on-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">visibility_off</span>
              <span>Dismissed History</span>
              <span className="font-label-code text-label-code bg-dark-surface text-outline px-2 py-0.5 rounded-full">
                {dismissedIds.length}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Filter saved entries..."
                className="w-full bg-dark-surface text-on-primary pl-9 pr-space-md py-2 rounded-xl text-body-sm focus:outline-none border border-dark-border/60 placeholder:text-outline transition-colors"
              />
            </div>

            {activeTab === 'tracked' && (
              <div className="flex items-center gap-1 bg-deep-dark p-1 rounded-xl border border-dark-border/60">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-space-sm py-1 rounded-lg font-label-caps text-label-caps uppercase transition-all ${
                    filterType === 'all'
                      ? 'bg-secondary-container text-on-primary font-bold'
                      : 'text-outline hover:text-on-primary'
                  }`}
                >
                  All Media
                </button>
                <button
                  onClick={() => setFilterType('cinema')}
                  className={`px-space-sm py-1 rounded-lg font-label-caps text-label-caps uppercase transition-all ${
                    filterType === 'cinema'
                      ? 'bg-secondary-container text-on-primary font-bold'
                      : 'text-outline hover:text-on-primary'
                  }`}
                >
                  Cinema & Series
                </button>
                <button
                  onClick={() => setFilterType('games')}
                  className={`px-space-sm py-1 rounded-lg font-label-caps text-label-caps uppercase transition-all ${
                    filterType === 'games'
                      ? 'bg-secondary-container text-on-primary font-bold'
                      : 'text-outline hover:text-on-primary'
                  }`}
                >
                  Games
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── TAB 1: Tracked Releases ─────────────────────────────────── */}
        {activeTab === 'tracked' && (
          <div className="flex flex-col gap-space-2xl">
            {/* Section A: Releasing Soon (Upcoming) */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-sm">
                  <span className="w-3 h-3 rounded-full bg-secondary-container shadow-[0_0_12px_rgba(44,110,232,0.6)]"></span>
                  <h2 className="font-headline-md text-headline-sm text-on-primary tracking-tight">
                    Releasing Soon
                  </h2>
                  <span className="font-label-code text-label-code text-outline-variant bg-dark-surface px-space-xs py-0.5 rounded border border-dark-border">
                    {releasingSoon.length} items
                  </span>
                </div>
              </div>

              {releasingSoon.length === 0 ? (
                <div className="bg-dark-surface rounded-[22px] p-space-2xl text-center border border-dark-border text-outline">
                  No upcoming tracked releases. Discover items on Radar or Explorer and click Track!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
                  {releasingSoon.map((item) => {
                    const isWatched = watchedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="group relative bg-dark-surface rounded-[22px] p-space-md flex flex-col justify-between border border-dark-border/40 hover:border-dark-border shadow-lg hover:bg-deep-dark transition-all duration-300"
                      >
                        <div className="flex flex-col gap-space-sm">
                          <div className="relative w-full h-44 rounded-xl overflow-hidden bg-deep-dark border border-dark-border/40">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-outline opacity-40">
                                <span className="material-symbols-outlined text-3xl">movie</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-dark-surface via-transparent to-transparent opacity-80"></div>
                            <div className="absolute top-3 left-3 bg-dark-bg/90 backdrop-blur-md px-space-sm py-1 rounded-full flex items-center gap-1.5 border border-dark-border/40">
                              <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping"></span>
                              <span className="font-label-code text-[11px] text-on-primary font-mono tracking-wide">
                                {formatCountdownDays(item.date)}
                              </span>
                            </div>
                            <div className="absolute top-3 right-3 bg-dark-bg/90 backdrop-blur-md px-space-sm py-1 rounded-full font-label-caps text-[10px] text-secondary-fixed-dim uppercase border border-dark-border/40">
                              {item.source}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-outline font-label-caps uppercase text-[10px]">
                              <span>{item.type}</span>
                              {item.date && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-secondary-fixed-dim">{item.date}</span>
                                </>
                              )}
                            </div>
                            <a
                              href={item.url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="font-headline-sm text-[17px] text-on-primary group-hover:text-secondary-fixed-dim transition-colors line-clamp-1"
                            >
                              {item.title}
                            </a>
                            <p className="font-body-sm text-[13px] text-outline-variant line-clamp-2">
                              {item.tags.join(' • ') || 'Saved release entry.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-space-md mt-space-md border-t border-dark-border/40">
                          <button
                            onClick={() => toggleWatched(item.id)}
                            className={`flex items-center gap-1 px-space-sm py-1 rounded-lg text-label-code transition-colors ${
                              isWatched
                                ? 'bg-secondary-container text-on-primary font-bold'
                                : 'text-secondary-fixed-dim hover:bg-secondary-container/20'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isWatched ? 'check_circle' : 'circle'}
                            </span>
                            <span>{isWatched ? 'Watched / Played' : 'Mark Seen'}</span>
                          </button>

                          <button
                            onClick={() => toggleLike(item)}
                            className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-dark-surface transition-colors"
                            title="Remove from saved"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section B: Released / Archive */}
            {releasedArchive.length > 0 && (
              <div className="flex flex-col gap-space-md pt-space-lg border-t border-dark-border/40">
                <div className="flex items-center justify-between pb-space-xs">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-3 h-3 rounded-full bg-dark-border-subtle"></span>
                    <h2 className="font-headline-md text-headline-sm text-on-primary tracking-tight">
                      Released / Archive
                    </h2>
                    <span className="font-label-code text-label-code text-outline-variant bg-dark-surface px-space-xs py-0.5 rounded border border-dark-border">
                      {releasedArchive.length} entries
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
                  {releasedArchive.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-dark-surface rounded-[22px] p-space-lg flex flex-col justify-between shadow-md hover:bg-deep-dark border border-dark-border/40 transition-all"
                    >
                      <div className="flex flex-col gap-space-sm">
                        <div className="flex items-start justify-between">
                          <span className="font-label-caps text-[11px] uppercase text-outline">
                            {item.source} • {item.type}
                          </span>
                          <span className="font-label-code text-[11px] text-secondary-fixed-dim bg-secondary-container/10 px-2 py-0.5 rounded">
                            {item.date}
                          </span>
                        </div>
                        <a
                          href={item.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="font-headline-sm text-[17px] text-on-primary hover:text-secondary-fixed-dim transition-colors"
                        >
                          {item.title}
                        </a>
                        <p className="font-body-sm text-[13px] text-outline-variant line-clamp-2">
                          {item.tags.join(' • ') || 'Archived tracked title.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-space-md mt-space-md border-t border-dark-border/40">
                        <span className="font-label-caps text-outline uppercase text-[11px]">
                          Released {item.date}
                        </span>
                        <button
                          onClick={() => toggleLike(item)}
                          className="flex items-center gap-1 text-outline hover:text-error font-label-code text-xs transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: Dismissed History ────────────────────────────────── */}
        {activeTab === 'dismissed' && (
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-sm">
                <span className="font-headline-md text-headline-sm text-on-primary tracking-tight">
                  Hidden Releases
                </span>
                <span className="font-label-code text-label-code text-outline-variant bg-dark-surface px-space-xs py-0.5 rounded border border-dark-border">
                  {dismissedItems.length}
                </span>
              </div>
              {dismissedItems.length > 0 && (
                <button
                  onClick={restoreAllDismissed}
                  className="px-space-md py-1.5 rounded-lg bg-secondary-container hover:bg-secondary text-on-primary font-label-caps text-xs uppercase transition-colors"
                >
                  Restore All to Feed
                </button>
              )}
            </div>

            {dismissedItems.length === 0 ? (
              <div className="bg-dark-surface rounded-[22px] p-space-2xl text-center border border-dark-border text-outline">
                No hidden releases. Items dismissed on Radar or Explorer will appear here so you can restore them anytime.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {dismissedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-space-md rounded-[18px] bg-dark-surface border border-dark-border/40 hover:border-dark-border transition-all"
                  >
                    <div className="min-w-0 mr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-label-code text-[11px] text-secondary-fixed-dim uppercase">
                          {item.type} • {item.source}
                        </span>
                        {item.date && (
                          <span className="font-label-code text-[11px] text-outline">
                            • {item.date}
                          </span>
                        )}
                      </div>
                      <h4 className="font-headline-sm text-[15px] text-on-primary truncate mt-0.5">
                        {item.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => restoreDismissed(item.id)}
                      className="flex items-center gap-1 px-space-md py-1.5 rounded-lg bg-deep-dark hover:bg-secondary-container hover:text-on-primary text-outline-variant text-label-code transition-colors flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
