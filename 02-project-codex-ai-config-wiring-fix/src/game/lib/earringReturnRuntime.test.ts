import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '../types';
import { isEarringReturnForConsort, resolveEarringGiftRelationDelta } from './earringReturnRuntime';

const buildGift = (metadata?: InventoryItem['metadata']): InventoryItem => ({
  itemId: 'silver-leaf-earring-1-a',
  name: '银叶耳坠',
  category: 'gift',
  rarity: 'green',
  quantity: 1,
  price: 35,
  favorDelta: 8,
  healthDelta: 0,
  appearanceDelta: 0,
  temperamentDelta: 0,
  description: '一枚银叶形耳坠。',
  metadata,
});

describe('earringReturnRuntime', () => {
  it('adds the hidden owner bonus only when the earring is returned to its owner', () => {
    const item = buildGift({ earringOwnerConsortId: 'consort-a', earringMark: '宁' });

    expect(isEarringReturnForConsort(item, 'consort-a')).toBe(true);
    expect(resolveEarringGiftRelationDelta(item, 'consort-a')).toBe(13);
    expect(resolveEarringGiftRelationDelta(item, 'consort-b')).toBe(8);
  });

  it('treats ordinary gifts and wrong returns as ordinary gift relation gains', () => {
    expect(isEarringReturnForConsort(buildGift(), 'consort-a')).toBe(false);
    expect(resolveEarringGiftRelationDelta(buildGift(), 'consort-a')).toBe(8);
  });
});
