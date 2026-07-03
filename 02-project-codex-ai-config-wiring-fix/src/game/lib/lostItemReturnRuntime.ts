import type { ConcubineProfile, InventoryItem, InventoryItemMetadata } from '../types';
import { createSeededRandomEventRandom } from '../random-events/randomEventRuntime';

export const LOST_ITEM_RETURN_RELATION_BONUS = 5;

export type LostItemReturnKind = 'earring' | 'handkerchief';

export interface LostItemReturnResolution {
  kind: LostItemReturnKind;
  narrativeId: string;
  relationBonus: number;
}

interface LostItemReturnConfig {
  kind: LostItemReturnKind;
  ownerMetadataKey: string;
  narrativeId: string;
  relationBonus: number;
}

const LOST_ITEM_RETURN_CONFIGS: readonly LostItemReturnConfig[] = [
  {
    kind: 'earring',
    ownerMetadataKey: 'earringOwnerConsortId',
    narrativeId: 'consort.audience.return-earring',
    relationBonus: LOST_ITEM_RETURN_RELATION_BONUS,
  },
  {
    kind: 'handkerchief',
    ownerMetadataKey: 'handkerchiefOwnerConsortId',
    narrativeId: 'consort.audience.return-handkerchief',
    relationBonus: LOST_ITEM_RETURN_RELATION_BONUS,
  },
];

const metadataValueAsString = (value: InventoryItemMetadata[string] | undefined): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export const resolveLostItemReturnForConsort = (
  item: InventoryItem,
  consortId: string,
): LostItemReturnResolution | null => {
  for (const config of LOST_ITEM_RETURN_CONFIGS) {
    if (metadataValueAsString(item.metadata?.[config.ownerMetadataKey]) === consortId) {
      return {
        kind: config.kind,
        narrativeId: config.narrativeId,
        relationBonus: config.relationBonus,
      };
    }
  }

  return null;
};

export const isLostItemReturnForConsort = (item: InventoryItem, consortId: string): boolean =>
  Boolean(resolveLostItemReturnForConsort(item, consortId));

export const resolveLostItemGiftRelationDelta = (item: InventoryItem, consortId: string): number =>
  item.favorDelta + (resolveLostItemReturnForConsort(item, consortId)?.relationBonus ?? 0);

export const pickLostItemOwnerBySeed = (
  consorts: readonly ConcubineProfile[],
  seed: string,
): ConcubineProfile | undefined => {
  const candidates = consorts.filter((consort) => consort.status === 'live');
  if (candidates.length === 0) {
    return undefined;
  }

  const random = createSeededRandomEventRandom(seed);
  return candidates[Math.floor(random() * candidates.length)] ?? candidates[0];
};

export const pickLostItemNameMarkBySeed = (name: string | undefined, seed: string, fallback = '宁'): string => {
  const characters = Array.from(name ?? '').filter((character) => character.trim().length > 0);
  if (characters.length === 0) {
    return fallback;
  }

  const random = createSeededRandomEventRandom(seed);
  return characters[Math.floor(random() * characters.length)] ?? characters[0] ?? fallback;
};
