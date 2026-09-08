import React from 'react';

export type PageId = 'radar' | 'explorer' | 'library' | 'settings';

interface NavbarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  likedCount: number;
  onOpenShortcuts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onSelectPage,
  searchQuery,
  onSearchChange,
  likedCount,
  onOpenShortcuts,
}) => {
  const navItems: { id: PageId; label: string; shortcut: string; badge?: number }[] = [
    { id: 'radar', label: 'Radar', shortcut: '1' },
    { id: 'explorer', label: 'Explorer', shortcut: '2' },
    { id: 'library', label: 'My Library', shortcut: '3', badge: likedCount },
    { id: 'settings', label: 'Settings & Sync', shortcut: '4' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark-bg/95 backdrop-blur-md border-b border-dark-border shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
      <div className="h-16 w-full max-w-[1440px] mx-auto px-gutter flex items-center justify-between gap-space-md">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-space-lg">
          <div
            onClick={() => onSelectPage('radar')}
            className="flex items-center gap-space-xs cursor-pointer group"
          >
            <img
              alt="logos logo"
              className="h-8 w-8 object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform"
              src="/icon.png"
            />
            <span className="font-headline-sm text-headline-sm lowercase tracking-tight text-on-primary">
              logos
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-space-lg h-16">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectPage(item.id)}
                  className={`h-full flex items-center gap-1.5 font-headline-sm text-body-sm transition-all relative ${
                    isActive
                      ? 'text-secondary-fixed-dim border-b-2 border-secondary font-medium'
                      : 'text-outline-variant hover:text-on-primary font-normal'
                  }`}
                >
                  {item.label}
                  <kbd className="hidden xl:inline-block font-label-code text-[9px] text-outline/50 bg-deep-dark/60 px-1 py-0.2 rounded border border-dark-border/40 ml-0.5">
                    {item.shortcut}
                  </kbd>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="font-label-code text-[10px] bg-secondary-container/30 text-secondary-fixed-dim px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Search, Sync telemetry, Notifications, User */}
        <div className="flex items-center gap-space-md">
          {/* Search bar */}
          <div className="hidden lg:flex items-center bg-dark-surface border border-dark-border px-space-sm py-1.5 rounded-xl gap-space-xs w-64 focus-within:border-secondary-container transition-colors">
            <span className="material-symbols-outlined text-outline text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search releases (/)..."
              className="bg-transparent text-on-primary font-body-sm text-body-sm focus:outline-none placeholder:text-outline w-full"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearchChange('')}
                className="text-outline hover:text-on-primary text-[12px]"
              >
                ✕
              </button>
            ) : (
              <kbd className="font-label-code text-[10px] bg-deep-dark px-1.5 py-0.5 rounded text-outline border border-dark-border">
                /
              </kbd>
            )}
          </div>

          {/* Sync indicator */}
          <div className="hidden xl:flex items-center gap-space-2xs bg-dark-surface/60 px-space-sm py-1 rounded-full border border-dark-border/60">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
            <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
              Static SQLite • Synced
            </span>
          </div>

          {/* Mobile nav indicator */}
          <div className="flex md:hidden items-center gap-1 bg-dark-surface p-1 rounded-xl border border-dark-border">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`p-1.5 rounded-lg text-xs ${
                  activePage === item.id
                    ? 'bg-secondary-container text-on-primary font-bold'
                    : 'text-outline-variant hover:text-on-primary'
                }`}
                title={item.label}
              >
                {item.id === 'radar' && <span className="material-symbols-outlined text-[18px]">bolt</span>}
                {item.id === 'explorer' && <span className="material-symbols-outlined text-[18px]">view_agenda</span>}
                {item.id === 'library' && <span className="material-symbols-outlined text-[18px]">bookmark</span>}
                {item.id === 'settings' && <span className="material-symbols-outlined text-[18px]">tune</span>}
              </button>
            ))}
          </div>

          {/* Shortcuts cheatsheet button */}
          <button
            onClick={onOpenShortcuts}
            className="p-2 rounded-xl bg-dark-surface border border-dark-border text-outline-variant hover:text-on-primary transition-colors flex items-center gap-1"
            title="Keyboard Shortcuts (?)"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">keyboard</span>
            <kbd className="hidden sm:inline-block font-label-code text-[10px] text-outline bg-deep-dark px-1 py-0.2 rounded border border-dark-border/40">
              ?
            </kbd>
          </button>

          <button
            onClick={() => onSelectPage('library')}
            className="relative p-2 rounded-xl bg-dark-surface border border-dark-border text-outline-variant hover:text-on-primary transition-colors"
            title="Saved releases"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">bookmark_heart</span>
            {likedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary-container text-[10px] text-on-primary font-bold rounded-full flex items-center justify-center">
                {likedCount > 9 ? '9+' : likedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
