import { getInventoryItemsByTag } from '../numerics/numericCatalog';
import type { InventoryItem } from '../types';

const hashSeed = (seed: string): number =>
  seed.split('').reduce((accumulator, char, index) => accumulator + char.charCodeAt(0) * (index + 17), 0);

export interface TaggedInventoryPick {
  tag: string;
  item: InventoryItem;
}

export const listInventoryItemsByTag = (tag: string): InventoryItem[] => getInventoryItemsByTag(tag);

export const pickInventoryItemByTag = (tag: string, seed: string): TaggedInventoryPick | null => {
  const items = listInventoryItemsByTag(tag);
  if (items.length === 0) {
    return null;
  }
  return {
    tag,
    item: items[hashSeed(`${tag}:${seed}`) % items.length],
  };
};
