import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: 'Navigation',
      shortcuts: [
        { keys: ['1'], description: 'Jump to Radar' },
        { keys: ['2'], description: 'Jump to Explorer' },
        { keys: ['3'], description: 'Jump to My Library' },
        { keys: ['4'], description: 'Jump to Settings & Sync' },
      ],
    },
    {
      category: 'Search & Focus',
      shortcuts: [
        { keys: ['/'], description: 'Focus search releases' },
        { keys: ['⌘', 'K'], description: 'Alternative search focus' },
        { keys: ['Esc'], description: 'Blur search / close modal' },
      ],
    },
    {
      category: 'Browsing & Scroll',
      shortcuts: [
        { keys: ['j'], description: 'Scroll page down' },
        { keys: ['k'], description: 'Scroll page up' },
        { keys: ['?'], description: 'Toggle this shortcuts cheatsheet' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-gutter animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-dark-surface border border-dark-border rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-space-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-space-xs border-b border-dark-border">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary-fixed-dim text-xl">
              keyboard
            </span>
            <h3 className="font-headline-sm text-lg text-on-primary">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-primary p-1 rounded-lg text-sm cursor-pointer"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        <div className="space-y-space-md max-h-[70vh] overflow-y-auto pr-1">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="space-y-space-xs">
              <h4 className="font-label-caps text-xs text-secondary-fixed-dim uppercase tracking-wider">
                {group.category}
              </h4>
              <div className="space-y-1.5">
                {group.shortcuts.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1 px-space-xs rounded-lg bg-deep-dark/50 border border-dark-border/40 text-xs"
                  >
                    <span className="text-on-surface-variant font-body-sm">{sc.description}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="font-label-code text-[11px] bg-dark-bg border border-dark-border px-2 py-0.5 rounded text-secondary-fixed font-semibold shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-space-xs border-t border-dark-border text-center text-outline text-[11px] font-label-code">
          Press <kbd className="bg-dark-bg px-1.5 py-0.5 rounded border border-dark-border text-on-primary">Esc</kbd> or <kbd className="bg-dark-bg px-1.5 py-0.5 rounded border border-dark-border text-on-primary">?</kbd> to dismiss
        </div>
      </div>
    </div>
  );
};
