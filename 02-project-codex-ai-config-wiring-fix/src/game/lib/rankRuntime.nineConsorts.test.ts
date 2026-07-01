import { describe, expect, it } from 'vitest';
import { resolvePlayerRankByPrestige } from './rankRuntime';

describe('player nine-consort rank display', () => {
  it('uses a concrete nine-consort title at 1300 prestige instead of the category name', () => {
    expect(resolvePlayerRankByPrestige(1300)).toBe('昭仪');
  });
});
