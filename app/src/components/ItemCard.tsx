import type { Item } from '../lib/db';

const TYPE_COLORS: Record<string, string> = {
  news: 'bg-emerald-500/20 text-emerald-400',
  movie: 'bg-blue-500/20 text-blue-400',
  tv: 'bg-purple-500/20 text-purple-400',
  game: 'bg-orange-500/20 text-orange-400',
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
}

export function ItemCard({ item }: ItemCardProps) {
  const typeColor = TYPE_COLORS[item.type] || 'bg-gray-500/20 text-gray-400';
  const typeLabel = TYPE_LABELS[item.type] || item.type;

  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-black/30"
    >
      {/* Image */}
      {item.image && (
        <div className="aspect-video overflow-hidden bg-gray-800">
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Type badge + source */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
            {typeLabel}
          </span>
          <span className="text-xs text-gray-600 truncate">{item.source}</span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-200 line-clamp-2 mb-2 group-hover:text-white transition-colors">
          {item.title}
        </h3>

        {/* Dates */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          {item.date && (
            <span title="Release date">📅 {formatDate(item.date)}</span>
          )}
          <span title="First seen">{timeAgo(item.first_seen_at)}</span>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded"
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
  );
}
