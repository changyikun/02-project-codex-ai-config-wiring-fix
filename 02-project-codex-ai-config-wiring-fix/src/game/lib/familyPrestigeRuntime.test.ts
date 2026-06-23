import { describe, expect, it } from 'vitest';
import { resolveMonthlyFamilyPrestigeDelta } from './familyPrestigeRuntime';

describe('familyPrestigeRuntime', () => {
  it('resolves monthly prestige from shared family traits', () => {
    expect(resolveMonthlyFamilyPrestigeDelta('镇国公嫡女')).toEqual({
      fatherOfficeDelta: 10,
      familyBackgroundDelta: 3,
      total: 13,
    });
    expect(resolveMonthlyFamilyPrestigeDelta('正三品文官嫡女')).toEqual({
      fatherOfficeDelta: 6,
      familyBackgroundDelta: 2,
      total: 8,
    });
    expect(resolveMonthlyFamilyPrestigeDelta('商贾之女').total).toBe(-3);
    expect(resolveMonthlyFamilyPrestigeDelta('罪臣之后').total).toBe(-5);
  });
});
