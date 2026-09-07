import type { Item } from '../lib/db';
import { ItemCard } from './ItemCard';

interface ItemGridProps {
  items: Item[];
}

export function ItemGrid({ items }: ItemGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
