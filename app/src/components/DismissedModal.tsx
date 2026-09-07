import type { Item } from '../lib/db';

interface DismissedModalProps {
  isOpen: boolean;
  onClose: () => void;
  dismissedIds: string[];
  allItems: Item[];
  onRestore: (id: string) => void;
  onRestoreAll: () => void;
}

export function DismissedModal({
  isOpen,
  onClose,
  dismissedIds,
  allItems,
  onRestore,
  onRestoreAll,
}: DismissedModalProps) {
  if (!isOpen) return null;

  const itemMap = new Map(allItems.map((i) => [i.id, i]));
  const dismissedItems = dismissedIds
    .map((id) => itemMap.get(id))
    .filter((item): item is Item => Boolean(item));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-100">Hidden & Dismissed Items</h3>
            <p className="text-xs text-gray-500">
              {dismissedItems.length} item{dismissedItems.length === 1 ? '' : 's'} hidden from feeds
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dismissedItems.length > 0 && (
              <button
                type="button"
                onClick={onRestoreAll}
                className="text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Restore All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {dismissedItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No dismissed items.</p>
          ) : (
            dismissedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800/60 border border-gray-700/60 text-sm"
              >
                <div className="min-w-0 pr-3">
                  <p className="font-medium text-gray-200 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.source} • {item.type}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(item.id)}
                  className="shrink-0 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded transition-colors"
                >
                  Unhide
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
