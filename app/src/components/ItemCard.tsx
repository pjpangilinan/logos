import type { Item } from '../lib/db';

const TYPE_COLORS: Record<string, string> = {
  news: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  movie: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  tv: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  game: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const TYPE_LABELS: Record<string, string> = {
  news: 'News',
  movie: 'Movie',
  tv: 'TV',
  game: 'Game',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function timeAgo(isoStr: string): string {
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(isoStr);
}

interface ItemCardProps {
  item: Item;
  isLiked?: boolean;
  onToggleLike?: () => void;
  onDismiss?: () => void;
  score?: number;
  matchedTags?: string[];
}

export function ItemCard({
  item,
  isLiked = false,
  onToggleLike,
  onDismiss,
  score,
  matchedTags = [],
}: ItemCardProps) {
  const typeColor = TYPE_COLORS[item.type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  const typeLabel = TYPE_LABELS[item.type] || item.type;

  return (
    <div className="group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between">
      {/* Action Buttons Header overlay */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {onToggleLike && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleLike();
            }}
            title={isLiked ? 'Unlike' : 'Like (trains your For You feed)'}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
              isLiked
                ? 'bg-rose-500/90 text-white shadow-md shadow-rose-500/30 scale-105'
                : 'bg-gray-950/70 text-gray-400 hover:text-rose-400 hover:bg-gray-900/90'
            }`}
          >
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isLiked ? 0 : 2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss();
            }}
            title="Dismiss / hide this item"
            className="p-1.5 rounded-full bg-gray-950/70 text-gray-400 hover:text-gray-200 hover:bg-gray-800/90 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Main card body with link */}
      <a
        href={item.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="block flex-1"
      >
        {/* Image */}
        {item.image && (
          <div className="aspect-video overflow-hidden bg-gray-800 relative">
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {score !== undefined && score > 0 && (
              <div className="absolute bottom-2 left-2 bg-indigo-950/90 border border-indigo-500/40 text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded-md backdrop-blur-md">
                ✨ {score} match score
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Type badge + source */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor}`}>
              {typeLabel}
            </span>
            <span className="text-xs text-gray-500 truncate">{item.source}</span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 mb-2 group-hover:text-indigo-400 transition-colors">
            {item.title}
          </h3>

          {/* Dates */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            {item.date && (
              <span title="Release date">📅 {formatDate(item.date)}</span>
            )}
            <span title="Discovered date">{timeAgo(item.first_seen_at)}</span>
          </div>

          {/* Matched tags notice (if recommendation view) */}
          {matchedTags.length > 0 && (
            <div className="mb-2 text-xs text-indigo-300/90 bg-indigo-950/40 border border-indigo-900/50 px-2 py-1 rounded">
              Matched: <span className="font-medium text-indigo-200">{matchedTags.join(', ')}</span>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    matchedTags.includes(tag)
                      ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-500/40 font-medium'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 4 && (
                <span className="text-xs text-gray-600">+{item.tags.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </a>
    </div>
  );
}
