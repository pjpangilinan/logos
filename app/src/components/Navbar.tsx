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

  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-dark-bg/95 backdrop-blur-md border-b border-dark-border shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
        <div className="h-16 w-full max-w-[1440px] mx-auto px-gutter flex items-center justify-between gap-space-sm sm:gap-space-md">
          {/* Left: Brand & Desktop Navigation */}
          <div className="flex items-center gap-space-lg">
            <div
              onClick={() => onSelectPage('radar')}
              className="flex items-center gap-space-xs cursor-pointer group"
            >
              <img
                alt="logos logo"
                className="h-8 w-8 object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform"
                src={`${import.meta.env.BASE_URL}icon.png`}
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

          {/* Right: Search, Sync telemetry, Shortcuts, User */}
          <div className="flex items-center gap-2 sm:gap-space-md">
            {/* Desktop Search bar */}
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

            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setMobileSearchOpen((prev) => !prev)}
              className={`p-2 rounded-xl border transition-colors lg:hidden ${
                mobileSearchOpen || searchQuery
                  ? 'bg-secondary-container/20 text-secondary-fixed-dim border-secondary-container/40'
                  : 'bg-dark-surface border-dark-border text-outline-variant hover:text-on-primary'
              }`}
              title="Search releases"
              type="button"
              aria-label="Toggle mobile search"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
            </button>

            {/* Sync indicator (Desktop only) */}
            <div className="hidden xl:flex items-center gap-space-2xs bg-dark-surface/60 px-space-sm py-1 rounded-full border border-dark-border/60">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
              <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                Static SQLite • Synced
              </span>
            </div>

            {/* Shortcuts cheatsheet button (Desktop only) */}
            <button
              onClick={onOpenShortcuts}
              className="hidden sm:flex p-2 rounded-xl bg-dark-surface border border-dark-border text-outline-variant hover:text-on-primary transition-colors items-center gap-1"
              title="Keyboard Shortcuts (?)"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">keyboard</span>
              <kbd className="font-label-code text-[10px] text-outline bg-deep-dark px-1 py-0.2 rounded border border-dark-border/40">
                ?
              </kbd>
            </button>

            {/* Saved releases button */}
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

        {/* Expandable Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="lg:hidden px-gutter pb-3 pt-1 border-t border-dark-border/40 bg-dark-bg/95 flex items-center gap-2 animate-fade-in">
            <div className="flex items-center bg-dark-surface border border-secondary-container/50 px-3 py-2 rounded-xl gap-2 w-full">
              <span className="material-symbols-outlined text-outline text-[18px]">search</span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search movies, games, news..."
                className="bg-transparent text-on-primary text-sm focus:outline-none placeholder:text-outline w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="text-outline hover:text-on-primary text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark-surface/95 backdrop-blur-md border-t border-dark-border/80 flex items-center justify-around py-1.5 px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.5)] safe-area-bottom">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                isActive
                  ? 'text-secondary-fixed-dim font-bold'
                  : 'text-outline hover:text-on-primary font-normal'
              }`}
            >
              <div className="relative">
                {item.id === 'radar' && <span className="material-symbols-outlined text-[20px]">bolt</span>}
                {item.id === 'explorer' && <span className="material-symbols-outlined text-[20px]">view_agenda</span>}
                {item.id === 'library' && <span className="material-symbols-outlined text-[20px]">bookmark</span>}
                {item.id === 'settings' && <span className="material-symbols-outlined text-[20px]">tune</span>}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-secondary-container text-[9px] text-on-primary font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-headline-sm mt-0.5 tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-secondary-container mt-0.5"></span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
