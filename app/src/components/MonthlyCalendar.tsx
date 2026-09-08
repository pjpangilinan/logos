import React, { useState, useMemo } from 'react';
import type { Item } from '../lib/db';
import {
  getCalendarGrid,
  groupItemsByDate,
  formatMonthHeader,
  formatLocalDate,
} from '../lib/calendar';
import { extractPlatformBadges } from '../lib/platforms';

interface MonthlyCalendarProps {
  items: Item[];
  isLiked: (id: string) => boolean;
  toggleLike: (item: Item) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  items,
  isLiked,
  toggleLike,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Grid cells
  const gridCells = useMemo(() => {
    return getCalendarGrid(year, month);
  }, [year, month]);

  // Group items by date
  const itemsByDate = useMemo(() => {
    return groupItemsByDate(items);
  }, [items]);

  // Total releases in current month
  const currentMonthReleasesCount = useMemo(() => {
    let count = 0;
    for (const cell of gridCells) {
      if (cell.inCurrentMonth) {
        count += itemsByDate.get(cell.dateStr)?.length || 0;
      }
    }
    return count;
  }, [gridCells, itemsByDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(formatLocalDate(now));
  };

  // Selected day items for expanded details drawer / popover
  const selectedDayItems = useMemo(() => {
    if (!selectedDateStr) return [];
    return itemsByDate.get(selectedDateStr) || [];
  }, [selectedDateStr, itemsByDate]);

  const getTypeStyle = (type: Item['type']) => {
    switch (type) {
      case 'movie':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25';
      case 'tv':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25';
      case 'game':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25';
      case 'news':
      default:
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25';
    }
  };

  return (
    <div className="w-full flex flex-col gap-space-lg">
      {/* ─── Calendar Navigation Header ─────────────────────────────────── */}
      <div className="bg-dark-surface rounded-[22px] p-space-md border border-dark-border/60 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center bg-deep-dark border border-dark-border/40 rounded-xl p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg text-outline hover:text-on-primary hover:bg-dark-surface transition-colors"
              title="Previous Month"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg text-outline hover:text-on-primary hover:bg-dark-surface transition-colors"
              title="Next Month"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          <h2 className="font-headline-sm text-[20px] font-bold text-on-primary tracking-tight">
            {formatMonthHeader(currentDate)}
          </h2>

          <button
            onClick={handleJumpToday}
            className="px-space-sm py-1 rounded-lg bg-deep-dark text-outline-variant hover:text-on-primary border border-dark-border/40 font-label-code text-[11px] transition-colors"
            type="button"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-space-sm text-outline font-label-code text-label-code">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
            <strong className="text-on-primary font-medium">{currentMonthReleasesCount}</strong> releases in view
          </span>
        </div>
      </div>

      {/* ─── Month Grid ─────────────────────────────────────────────────── */}
      <div className="bg-dark-surface rounded-[22px] p-space-md border border-dark-border/60 shadow-xl overflow-hidden">
        {/* Day-of-week header row */}
        <div className="grid grid-cols-7 gap-1 pb-space-xs mb-1 border-b border-dark-border/40 text-center font-label-caps text-label-caps uppercase text-outline">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* 7-column calendar matrix */}
        <div className="grid grid-cols-7 gap-1.5">
          {gridCells.map((cell) => {
            const dayItems = itemsByDate.get(cell.dateStr) || [];
            const hasItems = dayItems.length > 0;
            const isSelected = selectedDateStr === cell.dateStr;

            return (
              <div
                key={cell.dateStr}
                onClick={() => {
                  if (hasItems) {
                    setSelectedDateStr(isSelected ? null : cell.dateStr);
                  }
                }}
                className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 rounded-xl flex flex-col justify-between border transition-all duration-200 ${
                  cell.inCurrentMonth
                    ? 'bg-deep-dark/90 text-on-primary'
                    : 'bg-dark-bg/40 text-outline/40 border-dark-border/20'
                } ${
                  cell.isToday
                    ? 'ring-1 ring-secondary-container border-secondary-container/60'
                    : 'border-dark-border/40 hover:border-dark-border'
                } ${
                  isSelected
                    ? 'ring-2 ring-primary border-primary bg-dark-surface'
                    : ''
                } ${
                  hasItems ? 'cursor-pointer hover:bg-dark-surface/80' : ''
                }`}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-label-code text-[11px] sm:text-[12px] font-bold rounded-md px-1.5 py-0.2 ${
                      cell.isToday
                        ? 'bg-secondary-container text-on-primary shadow-sm'
                        : cell.inCurrentMonth
                        ? 'text-on-primary'
                        : 'text-outline/40'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {hasItems && (
                    <span className="font-label-code text-[10px] text-outline-variant bg-dark-bg px-1 rounded border border-dark-border/40">
                      {dayItems.length}
                    </span>
                  )}
                </div>

                {/* Day item chips */}
                <div className="flex flex-col gap-1 overflow-hidden flex-grow">
                  {dayItems.slice(0, 3).map((it) => (
                    <div
                      key={it.id}
                      className={`truncate rounded px-1.5 py-0.5 font-label-code text-[10px] border flex items-center gap-1 transition-colors ${getTypeStyle(
                        it.type
                      )}`}
                      title={`${it.title} (${it.type})`}
                    >
                      <span className="truncate">{it.title}</span>
                    </div>
                  ))}

                  {dayItems.length > 3 && (
                    <div className="font-label-code text-[9px] text-outline-variant text-center pt-0.5">
                      +{dayItems.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Selected Day Details Panel ─────────────────────────────────── */}
      {selectedDateStr && (
        <div className="bg-dark-surface rounded-[22px] p-space-lg border border-secondary-container/40 shadow-2xl flex flex-col gap-space-md animate-fadeIn">
          <div className="flex items-center justify-between pb-space-xs border-b border-dark-border/60">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-fixed-dim text-[20px]">
                event_available
              </span>
              <h3 className="font-headline-sm text-[18px] text-on-primary font-bold">
                Releases on {selectedDateStr}
              </h3>
              <span className="font-label-code text-label-code text-secondary-fixed-dim bg-secondary-container/20 px-2 py-0.5 rounded-full">
                {selectedDayItems.length} {selectedDayItems.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <button
              onClick={() => setSelectedDateStr(null)}
              className="p-1 rounded-lg text-outline hover:text-on-primary hover:bg-deep-dark transition-colors"
              title="Close Day Panel"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {selectedDayItems.map((item) => {
              const liked = isLiked(item.id);
              const platforms = extractPlatformBadges(item);

              return (
                <div
                  key={item.id}
                  className="bg-deep-dark rounded-[16px] p-space-md border border-dark-border/60 hover:border-dark-border transition-all flex flex-col justify-between gap-space-sm"
                >
                  <div className="flex gap-space-md items-start">
                    <div className="w-16 h-16 rounded-lg bg-dark-bg border border-dark-border/40 overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline opacity-40">
                          <span className="material-symbols-outlined text-xl">image</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-1.5 flex-wrap font-label-code text-[10px] text-secondary-fixed-dim uppercase mb-0.5 font-bold">
                        <span>{item.type}</span>
                        <span>•</span>
                        <span>{item.source}</span>
                      </div>

                      <a
                        href={item.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-headline-sm text-[15px] font-semibold text-on-primary hover:text-secondary-fixed-dim transition-colors line-clamp-1 block"
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

                  <div className="flex items-center justify-between pt-2 border-t border-dark-border/40">
                    <span className="font-label-code text-[11px] text-outline truncate max-w-[180px]">
                      {item.tags.join(', ') || 'Scheduled release'}
                    </span>

                    <button
                      onClick={() => toggleLike(item)}
                      className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 font-label-caps text-[11px] uppercase ${
                        liked
                          ? 'bg-secondary-container/20 text-secondary-fixed-dim'
                          : 'bg-dark-bg text-outline-variant hover:text-on-primary'
                      }`}
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${liked ? 'material-symbols-fill' : ''}`}>
                        {liked ? 'favorite' : 'bookmark_add'}
                      </span>
                      <span>{liked ? 'Saved' : 'Track'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
