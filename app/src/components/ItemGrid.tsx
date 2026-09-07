import type { Item } from '../lib/db';
import { ItemCard } from './ItemCard';

interface ItemGridProps {
  items: Item[];
  isLiked?: (id: string) => boolean;
  onToggleLike?: (item: Item) => void;
  onDismiss?: (id: string) => void;
  scores?: Record<string, { score: number; matchedTags: string[] }>;
}

export function ItemGrid({
  items,
  isLiked,
  onToggleLike,
  onDismiss,
  scores,
}: ItemGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const itemScore = scores ? scores[item.id] : undefined;
        return (
          <ItemCard
            key={item.id}
            item={item}
            isLiked={isLiked ? isLiked(item.id) : false}
            onToggleLike={onToggleLike ? () => onToggleLike(item) : undefined}
            onDismiss={onDismiss ? () => onDismiss(item.id) : undefined}
            score={itemScore?.score}
            matchedTags={itemScore?.matchedTags}
          />
        );
      })}
    </div>
  );
}
