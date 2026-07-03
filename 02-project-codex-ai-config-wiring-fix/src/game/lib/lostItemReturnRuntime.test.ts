import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '../types';
import {
  isLostItemReturnForConsort,
  resolveLostItemGiftRelationDelta,
  resolveLostItemReturnForConsort,
} from './lostItemReturnRuntime';

const buildGift = (metadata?: InventoryItem['metadata']): InventoryItem => ({
  itemId: 'lost-item-1',
  name: '失物',
  category: 'gift',
  rarity: 'green',
  quantity: 1,
  price: 35,
  favorDelta: 8,
  healthDelta: 0,
  appearanceDelta: 0,
  temperamentDelta: 0,
  description: '一件失物。',
  metadata,
});

describe('lostItemReturnRuntime', () => {
  it('adds the hidden owner bonus when a silver earring is returned to its owner', () => {
    const item = buildGift({ earringOwnerConsortId: 'consort-a', earringMark: '宁' });

    expect(isLostItemReturnForConsort(item, 'consort-a')).toBe(true);
    expect(resolveLostItemReturnForConsort(item, 'consort-a')?.narrativeId).toBe('consort.audience.return-earring');
    expect(resolveLostItemGiftRelationDelta(item, 'consort-a')).toBe(13);
    expect(resolveLostItemGiftRelationDelta(item, 'consort-b')).toBe(8);
  });

  it('adds the hidden owner bonus when a handkerchief is returned to its owner', () => {
    const item = buildGift({ handkerchiefOwnerConsortId: 'consort-b', handkerchiefMark: '兰' });

    expect(isLostItemReturnForConsort(item, 'consort-b')).toBe(true);
    expect(resolveLostItemReturnForConsort(item, 'consort-b')?.narrativeId).toBe('consort.audience.return-handkerchief');
    expect(resolveLostItemGiftRelationDelta(item, 'consort-b')).toBe(13);
  });

  it('treats ordinary gifts and wrong returns as ordinary gift relation gains', () => {
    expect(isLostItemReturnForConsort(buildGift(), 'consort-a')).toBe(false);
    expect(resolveLostItemGiftRelationDelta(buildGift(), 'consort-a')).toBe(8);
    expect(resolveLostItemGiftRelationDelta(buildGift({ handkerchiefOwnerConsortId: 'consort-b' }), 'consort-a')).toBe(8);
  });
});

