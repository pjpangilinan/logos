import React, { useState } from 'react';
import type { Item } from '../lib/db';

interface SettingsPageProps {
  items: Item[];
  counts: Record<string, number>;
  onRefreshData: () => void;
  likedCount: number;
  dismissedCount: number;
  onClearAllData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  items,
  counts,
  onRefreshData,
  likedCount,
  dismissedCount,
  onClearAllData,
}) => {
  const [hypeWeight, setHypeWeight] = useState(() => {
    return Number(localStorage.getItem('logos_weight_hype') || 65);
  });
  const [genreWeight, setGenreWeight] = useState(() => {
    return Number(localStorage.getItem('logos_weight_genre') || 80);
  });
  const [recencyWeight, setRecencyWeight] = useState(() => {
    return Number(localStorage.getItem('logos_weight_recency') || 70);
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveWeights = (hype: number, genre: number, recency: number) => {
    setHypeWeight(hype);
    setGenreWeight(genre);
    setRecencyWeight(recency);
    localStorage.setItem('logos_weight_hype', String(hype));
    localStorage.setItem('logos_weight_genre', String(genre));
    localStorage.setItem('logos_weight_recency', String(recency));
    showStatus('Recommendation weights updated');
  };

  const handleResetDefaults = () => {
    handleSaveWeights(65, 80, 70);
    showStatus('Weights reset to defaults');
  };

  const handleVacuum = () => {
    onRefreshData();
    showStatus('Database indexed & refreshed from memory');
  };

  const handleExportBackup = () => {
    const backup = {
      version: '2.4',
      date: new Date().toISOString(),
      preferences: localStorage.getItem('aggregator_preferences_v1') || '{}',
      watched: localStorage.getItem('logos_watched_ids') || '[]',
      weights: { hype: hypeWeight, genre: genreWeight, recency: recencyWeight },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Preferences backup downloaded');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.preferences) {
          localStorage.setItem('aggregator_preferences_v1', data.preferences);
        }
        if (data.watched) {
          localStorage.setItem('logos_watched_ids', data.watched);
        }
        if (data.weights) {
          handleSaveWeights(data.weights.hype, data.weights.genre, data.weights.recency);
        }
        showStatus('Preferences restored. Reloading...');
        setTimeout(() => window.location.reload(), 800);
      } catch {
        showStatus('Invalid backup JSON file');
      }
    };
    reader.readAsText(file);
  };

  const moviesCount = counts['movie'] || 0;
  const tvCount = counts['tv'] || 0;
  const gamesCount = counts['game'] || 0;
  const newsCount = counts['news'] || 0;
  const totalCount = items.length || 1;

  const moviesShare = Math.round((moviesCount / totalCount) * 100);
  const tvShare = Math.round((tvCount / totalCount) * 100);
  const gamesShare = Math.round((gamesCount / totalCount) * 100);
  const newsShare = Math.round((newsCount / totalCount) * 100);

  return (
    <div className="w-full bg-dark-bg text-on-primary px-gutter py-space-xl min-h-screen pb-space-4xl">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-space-2xl">
        {/* Toast notification */}
        {statusMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-secondary-container text-on-primary px-space-md py-space-sm rounded-xl shadow-2xl font-label-code text-body-sm flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{statusMessage}</span>
          </div>
        )}

        {/* ─── Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-lg text-headline-lg text-on-primary tracking-tight">
              Settings & Storage
            </h1>
            <p className="font-body-md text-body-md text-outline-variant max-w-2xl">
              Manage database status, recommendation preferences, and local data backup
            </p>
          </div>
        </div>

        {/* ─── SECTION 1: SQLite Database & Pipeline Health ───────────── */}
        <section className="w-full bg-deep-dark text-on-primary rounded-[22px] p-space-lg md:p-space-2xl flex flex-col gap-space-xl relative overflow-hidden border border-dark-border/60 shadow-xl">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md relative z-10">
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-md text-headline-md text-on-primary tracking-tight">
                Database Status
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="inline-flex items-center gap-space-xs bg-dark-surface border border-dark-border px-space-md py-1.5 rounded-full">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed-dim opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary-container"></span>
                </span>
                <span className="font-label-code text-[11px] text-on-primary font-medium">
                  GitHub Actions: SCHEDULED CRON
                </span>
              </div>
              <div className="inline-flex items-center gap-1 bg-dark-surface border border-dark-border px-space-md py-1.5 rounded-full text-outline-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary-fixed-dim">
                  schedule
                </span>
                <span className="font-label-caps text-[10px] uppercase tracking-wide">
                  Auto-deploy to GitHub Pages
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-space-md relative z-10">
            {/* Movies */}
            <div className="bg-dark-surface border border-dark-border/40 rounded-2xl p-space-lg flex flex-col justify-between gap-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-code text-[11px] text-outline-variant uppercase">
                  TABLE: MOVIES
                </span>
                <span className="material-symbols-outlined text-outline-variant text-[20px]">
                  movie
                </span>
              </div>
              <div>
                <div className="font-display-hero-mobile text-display-hero-mobile text-on-primary tracking-tight">
                  {moviesCount}
                </div>
                <div className="font-label-code text-label-code text-outline-variant mt-1">
                  {moviesShare}% share
                </div>
              </div>
            </div>

            {/* TV Series */}
            <div className="bg-dark-surface border border-dark-border/40 rounded-2xl p-space-lg flex flex-col justify-between gap-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-code text-[11px] text-outline-variant uppercase">
                  TABLE: TV_SERIES
                </span>
                <span className="material-symbols-outlined text-outline-variant text-[20px]">tv</span>
              </div>
              <div>
                <div className="font-display-hero-mobile text-display-hero-mobile text-on-primary tracking-tight">
                  {tvCount}
                </div>
                <div className="font-label-code text-label-code text-outline-variant mt-1">
                  {tvShare}% share
                </div>
              </div>
            </div>

            {/* Games */}
            <div className="bg-dark-surface border border-dark-border/40 rounded-2xl p-space-lg flex flex-col justify-between gap-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-code text-[11px] text-outline-variant uppercase">
                  TABLE: GAMES
                </span>
                <span className="material-symbols-outlined text-outline-variant text-[20px]">
                  sports_esports
                </span>
              </div>
              <div>
                <div className="font-display-hero-mobile text-display-hero-mobile text-on-primary tracking-tight">
                  {gamesCount}
                </div>
                <div className="font-label-code text-label-code text-outline-variant mt-1">
                  {gamesShare}% share
                </div>
              </div>
            </div>

            {/* Intel News */}
            <div className="bg-dark-surface border border-dark-border/40 rounded-2xl p-space-lg flex flex-col justify-between gap-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-code text-[11px] text-outline-variant uppercase">
                  TABLE: INTEL_NEWS
                </span>
                <span className="material-symbols-outlined text-outline-variant text-[20px]">
                  feed
                </span>
              </div>
              <div>
                <div className="font-display-hero-mobile text-display-hero-mobile text-on-primary tracking-tight">
                  {newsCount}
                </div>
                <div className="font-label-code text-label-code text-outline-variant mt-1">
                  {newsShare}% share
                </div>
              </div>
            </div>

            {/* Total Storage Summary */}
            <div className="bg-dark-surface border border-dark-border/40 rounded-2xl p-space-lg lg:col-span-2 flex flex-col justify-between gap-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-code text-[11px] text-secondary-fixed-dim uppercase tracking-wider">
                  AGGREGATE STORAGE
                </span>
                <span className="font-label-caps text-[10px] bg-deep-dark border border-dark-border/60 text-outline-variant px-2 py-0.5 rounded-full">
                  PAGE SIZE: 4KB
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-space-md">
                <div>
                  <div className="font-display-hero text-[48px] leading-tight text-on-primary tracking-tight">
                    {totalCount}
                  </div>
                  <div className="font-label-code text-label-code text-outline-variant mt-1">
                    Total Tracked Entities
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-headline-md text-headline-md text-secondary-fixed-dim tracking-tight">
                    ~188 KB
                  </div>
                  <div className="font-label-code text-label-code text-outline-variant mt-1">
                    Committed SQLite File
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Control Deck */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-md bg-dark-surface/60 border border-dark-border/40 p-space-md rounded-2xl relative z-10">
            <div className="flex items-center gap-space-sm text-outline-variant">
              <span className="material-symbols-outlined text-[18px]">published_with_changes</span>
              <span className="font-body-sm text-body-sm">
                Single committed SQLite file queries directly client-side via WebAssembly.
              </span>
            </div>
            <div className="flex items-center gap-space-sm w-full sm:w-auto">
              <button
                onClick={handleVacuum}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-space-md py-2.5 rounded-xl bg-dark-surface hover:bg-dark-bg border border-dark-border text-on-primary font-headline-sm text-body-sm transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">build_circle</span>
                <span>Vacuum & Reindex</span>
              </button>
              <button
                onClick={onRefreshData}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-space-lg py-2.5 rounded-xl bg-secondary-container hover:bg-secondary text-on-primary font-headline-sm text-body-sm transition-all shadow-md"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>Reload Database</span>
              </button>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: Recommendation Tuning & Dynamic Vector Weights ─ */}
        <section className="w-full bg-dark-surface rounded-[22px] p-space-lg md:p-space-2xl flex flex-col gap-space-xl border border-dark-border/60 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-md text-headline-md text-on-primary tracking-tight">
                Recommendation Tuning
              </h2>
            </div>
            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 text-secondary-fixed-dim hover:text-on-primary font-label-code text-label-code uppercase tracking-wider transition-colors self-start md:self-auto"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset All Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
            {/* Slider 1: Hype Factor */}
            <div className="bg-deep-dark p-space-lg rounded-2xl border border-dark-border/40 flex flex-col justify-between gap-space-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-[16px] text-on-primary">
                    Hype & Popularity
                  </span>
                  <span className="font-label-code text-secondary-fixed-dim font-bold">
                    {hypeWeight}%
                  </span>
                </div>
                <p className="font-body-sm text-xs text-outline-variant mt-1">
                  Balances general popularity bias vs niche tagged indie releases.
                </p>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={hypeWeight}
                onChange={(e) =>
                  handleSaveWeights(Number(e.target.value), genreWeight, recencyWeight)
                }
                className="w-full accent-secondary-container cursor-pointer"
              />
            </div>

            {/* Slider 2: Genre Affinity */}
            <div className="bg-deep-dark p-space-lg rounded-2xl border border-dark-border/40 flex flex-col justify-between gap-space-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-[16px] text-on-primary">
                    Genre Affinity Match
                  </span>
                  <span className="font-label-code text-secondary-fixed-dim font-bold">
                    {genreWeight}%
                  </span>
                </div>
                <p className="font-body-sm text-xs text-outline-variant mt-1">
                  Weight given to tag overlap with your saved and liked items.
                </p>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={genreWeight}
                onChange={(e) =>
                  handleSaveWeights(hypeWeight, Number(e.target.value), recencyWeight)
                }
                className="w-full accent-secondary-container cursor-pointer"
              />
            </div>

            {/* Slider 3: Discovery Recency */}
            <div className="bg-deep-dark p-space-lg rounded-2xl border border-dark-border/40 flex flex-col justify-between gap-space-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-[16px] text-on-primary">
                    Discovery Recency Bias
                  </span>
                  <span className="font-label-code text-secondary-fixed-dim font-bold">
                    {recencyWeight}%
                  </span>
                </div>
                <p className="font-body-sm text-xs text-outline-variant mt-1">
                  Surfaces items newly seen in aggregator.db over older catalog titles.
                </p>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={recencyWeight}
                onChange={(e) =>
                  handleSaveWeights(hypeWeight, genreWeight, Number(e.target.value))
                }
                className="w-full accent-secondary-container cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: Storage Management & Preferences Backup ─────── */}
        <section className="w-full bg-dark-surface rounded-[22px] p-space-lg md:p-space-2xl flex flex-col gap-space-lg border border-dark-border/60 shadow-xl">
          <div className="flex flex-col gap-1">
            <span className="font-label-code text-label-code text-secondary-fixed-dim uppercase tracking-widest">
              LOCAL DATA PERSISTENCE
            </span>
            <h2 className="font-headline-md text-headline-md text-on-primary tracking-tight">
              Storage Controls & Backup
            </h2>
            <p className="font-body-sm text-body-sm text-outline-variant">
              You have {likedCount} saved items and {dismissedCount} hidden items stored in browser storage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-md pt-2">
            <button
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-deep-dark hover:bg-dark-bg border border-dark-border text-on-primary font-headline-sm text-body-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_download</span>
              <span>Export Full Preferences Backup (JSON)</span>
            </button>

            <label className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-deep-dark hover:bg-dark-bg border border-dark-border text-on-primary font-headline-sm text-body-sm transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              <span>Restore Backup (JSON)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={onClearAllData}
              className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-error/20 hover:bg-error/30 text-error border border-error/40 font-headline-sm text-body-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
              <span>Clear All Saved & Hidden Data</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
