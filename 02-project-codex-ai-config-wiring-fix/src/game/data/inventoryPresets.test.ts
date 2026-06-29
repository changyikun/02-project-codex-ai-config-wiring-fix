import { describe, expect, it } from 'vitest';
import { buildKitchenFoodCatalog } from './inventoryPresets';

describe('inventoryPresets', () => {
  it('builds a seasonal kitchen food catalog with per-xun stock limits', () => {
    const springCatalog = buildKitchenFoodCatalog('test-route:1-1-1', 1);
    const autumnCatalog = buildKitchenFoodCatalog('test-route:1-8-1', 8);

    expect(springCatalog.some((item) => item.itemId === 'osmanthus-milk-custard')).toBe(true);
    expect(springCatalog.every((item) => item.stockLimit > 0)).toBe(true);
    expect(springCatalog.every((item) => item.offerId.startsWith('kitchen.'))).toBe(true);
    expect(springCatalog.some((item) => item.seasonLabel === '春令')).toBe(true);
    expect(autumnCatalog.some((item) => item.seasonLabel === '秋令')).toBe(true);
    expect(new Set(springCatalog.map((item) => item.offerId)).size).toBe(springCatalog.length);
  });
});
