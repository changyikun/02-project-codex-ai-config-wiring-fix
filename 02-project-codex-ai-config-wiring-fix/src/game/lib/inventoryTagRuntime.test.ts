import { describe, expect, it } from 'vitest';
import { listInventoryItemsByTag, pickInventoryItemByTag } from './inventoryTagRuntime';

describe('inventoryTagRuntime', () => {
  it('picks tagged inventory items deterministically by seed', () => {
    const lowQualityFood = listInventoryItemsByTag('low-quality-food');
    expect(lowQualityFood.length).toBeGreaterThan(1);

    const firstPick = pickInventoryItemByTag('low-quality-food', 'kitchen:1-1-1');
    const secondPick = pickInventoryItemByTag('low-quality-food', 'kitchen:1-1-1');
    expect(firstPick?.item.itemId).toBe(secondPick?.item.itemId);
    expect(lowQualityFood.map((item) => item.itemId)).toContain(firstPick?.item.itemId);
  });
});
