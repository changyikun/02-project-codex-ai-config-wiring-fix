import type { InventoryItem } from '../types';
import {
  getInventoryItemsByPool,
  numericInventoryItems,
  numericKitchenShopOffers,
  type NumericKitchenShopSeason,
} from '../numerics/numericCatalog';

export const INITIAL_PALACE_INVENTORY: readonly InventoryItem[] = getInventoryItemsByPool('initial');

export const cloneInitialInventory = (): InventoryItem[] => INITIAL_PALACE_INVENTORY.map((item) => ({ ...item }));

export interface DuNiangShopEntry extends InventoryItem {
  stock: number | null;
  isRareOffer?: boolean;
}

export interface KitchenFoodShopEntry extends InventoryItem {
  offerId: string;
  stockLimit: number;
  seasonLabel: string;
}

const DU_NIANG_ALWAYS_AVAILABLE_ITEMS: readonly InventoryItem[] = getInventoryItemsByPool('duniang-always');
const YETING_POISON_ITEMS: readonly InventoryItem[] = getInventoryItemsByPool('yeting-poison');
const MUSIC_SCORE_LIBRARY: readonly InventoryItem[] = getInventoryItemsByPool('music-score');
const KITCHEN_ITEM_TEMPLATES = new Map(
  numericInventoryItems.map(({ pools: _pools, tags: _tags, ...item }) => [item.itemId, item] as const),
);

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

const getKitchenSeason = (month: number): NumericKitchenShopSeason => {
  const normalizedMonth = Math.max(1, Math.min(12, Math.floor(month || 1)));
  if (normalizedMonth <= 3) {
    return 'spring';
  }
  if (normalizedMonth <= 6) {
    return 'summer';
  }
  if (normalizedMonth <= 9) {
    return 'autumn';
  }
  return 'winter';
};

const seasonLabels: Record<NumericKitchenShopSeason, string> = {
  all: '常备',
  spring: '春令',
  summer: '夏令',
  autumn: '秋令',
  winter: '冬令',
};

const isKitchenOfferAvailableInSeason = (
  offer: (typeof numericKitchenShopOffers)[number],
  season: NumericKitchenShopSeason,
): boolean => offer.seasons.includes('all') || offer.seasons.includes(season);

const selectWeightedKitchenOffers = <T extends { weight: number; offerId: string }>(
  offers: readonly T[],
  seed: string,
  count: number,
): T[] => {
  const remaining = [...offers].sort((left, right) => left.offerId.localeCompare(right.offerId));
  const selected: T[] = [];

  for (let slot = 0; slot < count && remaining.length > 0; slot += 1) {
    const totalWeight = remaining.reduce((sum, offer) => sum + offer.weight, 0);
    if (totalWeight <= 0) {
      break;
    }
    const roll = (hashSeed(`${seed}:kitchen:${slot}`) % 10000) / 10000 * totalWeight;
    let cursor = 0;
    const selectedIndex = remaining.findIndex((offer) => {
      cursor += offer.weight;
      return roll < cursor;
    });
    selected.push(remaining.splice(Math.max(0, selectedIndex), 1)[0]);
  }

  return selected;
};

const buildKitchenShopEntry = (
  offer: (typeof numericKitchenShopOffers)[number],
  season: NumericKitchenShopSeason,
): KitchenFoodShopEntry => {
  const item = KITCHEN_ITEM_TEMPLATES.get(offer.itemId);
  if (!item) {
    throw new Error(`Unknown kitchen shop item "${offer.itemId}".`);
  }
  const offerSeasonLabel = offer.seasons.includes('all')
    ? seasonLabels.all
    : offer.seasons.includes(season)
      ? seasonLabels[season]
      : offer.seasons.map((entry) => seasonLabels[entry]).join(' / ');

  return {
    ...item,
    offerId: offer.offerId,
    stockLimit: offer.stockPerXun,
    seasonLabel: offerSeasonLabel,
  };
};

export const buildKitchenFoodCatalog = (seed = 'kitchen', month = 1): KitchenFoodShopEntry[] => {
  const season = getKitchenSeason(month);
  const eligibleOffers = numericKitchenShopOffers.filter((offer) => isKitchenOfferAvailableInSeason(offer, season));
  const guaranteedOffers = eligibleOffers.filter((offer) => offer.guaranteed);
  const randomOffers = selectWeightedKitchenOffers(
    eligibleOffers.filter((offer) => !offer.guaranteed),
    `${seed}:${season}`,
    5,
  );
  const offers = [...guaranteedOffers, ...randomOffers];

  return offers.map((offer) => buildKitchenShopEntry(offer, season));
};

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
