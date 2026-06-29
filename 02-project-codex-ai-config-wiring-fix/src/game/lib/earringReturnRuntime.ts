import type { InventoryItem } from '../types';

export const EARRING_RETURN_RELATION_BONUS = 5;

export const isEarringReturnForConsort = (item: InventoryItem, consortId: string): boolean =>
  item.metadata?.earringOwnerConsortId === consortId;

export const resolveEarringGiftRelationDelta = (item: InventoryItem, consortId: string): number =>
  item.favorDelta + (isEarringReturnForConsort(item, consortId) ? EARRING_RETURN_RELATION_BONUS : 0);
