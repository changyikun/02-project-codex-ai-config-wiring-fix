import type { InventoryItem } from '../types';
import { getInventoryItemsByPool } from '../numerics/numericCatalog';

export const INITIAL_PALACE_INVENTORY: readonly InventoryItem[] = getInventoryItemsByPool('initial');

export const cloneInitialInventory = (): InventoryItem[] => INITIAL_PALACE_INVENTORY.map((item) => ({ ...item }));

export interface DuNiangShopEntry extends InventoryItem {
  stock: number | null;
  isRareOffer?: boolean;
}

const KITCHEN_FOOD_ITEMS: readonly InventoryItem[] = getInventoryItemsByPool('kitchen');
const DU_NIANG_ALWAYS_AVAILABLE_ITEMS: readonly InventoryItem[] = getInventoryItemsByPool('duniang-always');
const YETING_POISON_ITEMS: readonly InventoryItem[] = getInventoryItemsByPool('yeting-poison');
const MUSIC_SCORE_LIBRARY: readonly InventoryItem[] = getInventoryItemsByPool('music-score');

const hashSeed = (seed: string): number =>
  seed.split('').reduce((accumulator, char, index) => accumulator + char.charCodeAt(0) * (index + 17), 0);

const YETING_POISON_ITEM_IDS = YETING_POISON_ITEMS.map((item) => item.itemId);
const YETING_POISON_ITEM_ID_BY_NAME: Record<string, string> = Object.fromEntries(
  YETING_POISON_ITEMS.map((item) => [item.name, item.itemId]),
);

export const buildDuNiangShopCatalog = (_seed: string): DuNiangShopEntry[] => {
  const alwaysAvailableEntries = DU_NIANG_ALWAYS_AVAILABLE_ITEMS.map((item) => ({
    ...item,
    stock: null,
  }));

  return alwaysAvailableEntries;
};

export const getInventoryRecyclePrice = (item: InventoryItem): number => {
  if (typeof item.recyclePriceOverride === 'number') {
    return Math.max(0, Math.floor(item.recyclePriceOverride));
  }

  return Math.max(0, Math.floor(item.price * 0.8));
};

export const buildKitchenFoodCatalog = (): InventoryItem[] =>
  KITCHEN_FOOD_ITEMS.map((item) => ({
    ...item,
  }));

export const buildYetingPoisonCatalog = (): InventoryItem[] =>
  YETING_POISON_ITEMS.filter((item) => YETING_POISON_ITEM_IDS.includes(item.itemId)).map((item) => ({
    ...item,
    quantity: 1,
  }));

export const getPoisonInventoryItemIdByName = (poisonName: string): string | undefined =>
  YETING_POISON_ITEM_ID_BY_NAME[poisonName];

export const isPoisonInventoryItem = (item: InventoryItem): boolean =>
  YETING_POISON_ITEM_IDS.includes(item.itemId);

export const isMusicScoreItem = (item: InventoryItem): boolean => item.category === 'music-score';

export const buildMusicScoreItem = (itemId: string): InventoryItem | null => {
  const template = MUSIC_SCORE_LIBRARY.find((item) => item.itemId === itemId);
  return template ? { ...template } : null;
};

export const buildRandomMusicScoreItem = (seed: string): InventoryItem => {
  const template = MUSIC_SCORE_LIBRARY[hashSeed(seed) % MUSIC_SCORE_LIBRARY.length];
  return { ...template };
};

export const buildMusicScoreRewardBundle = (seed: string, quantity: number): InventoryItem[] =>
  Array.from({ length: Math.max(1, quantity) }, (_, index) => buildRandomMusicScoreItem(`${seed}:${index}`));
