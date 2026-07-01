import { describe, expect, it } from 'vitest';
import {
  assignLimitedNineConsortRanks,
  getConcubineDisplayRankText,
} from './concubineRoster';
import type { ConcubineProfile } from '../types';

const makeConsort = (index: number, prestige: number, rankLabel = '贵嫔'): ConcubineProfile => ({
  id: `consort-${index}`,
  portraitId: `portrait-${index}`,
  name: `妃嫔${index}`,
  rankLabel,
  status: 'live',
  residence: '永宁宫',
  stateLabel: '寻常',
  age: 20 + index,
  familyBackground: '世家女',
  personality: '端方',
  summary: '测试妃嫔',
  source: 'fixed',
  stats: {
    prestige,
    favor: 50,
    familyInfluence: 50,
    health: 80,
    appearance: 80,
    relationToPlayer: 0,
    childrenCount: 0,
    ambition: 50,
    stress: 10,
    intrigue: 50,
    temperament: 50,
    affection: 0,
    fortune: 50,
  },
  allies: [],
  rivals: [],
});

describe('concubine rank slots', () => {
  it('limits the 1300 prestige tier to nine named consort slots', () => {
    const roster = Array.from({ length: 10 }, (_, index) => makeConsort(index, 1300 + index));

    const assigned = assignLimitedNineConsortRanks(roster);
    const displayRanks = assigned.map((consort) => getConcubineDisplayRankText(consort));

    expect(new Set(displayRanks.slice(0, 9)).size).toBe(9);
    expect(displayRanks.slice(0, 9)).toEqual(['昭仪', '昭容', '昭媛', '修仪', '修容', '修媛', '充仪', '充容', '充媛']);
    expect(displayRanks[9]).toBe('贵嫔');
  });

  it('preserves an existing named nine-consort title before assigning empty slots', () => {
    const roster = [
      makeConsort(0, 1300, '修容'),
      makeConsort(1, 1300),
      makeConsort(2, 1300),
    ];

    const assigned = assignLimitedNineConsortRanks(roster);

    expect(getConcubineDisplayRankText(assigned[0])).toBe('修容');
    expect(getConcubineDisplayRankText(assigned[1])).toBe('昭仪');
    expect(getConcubineDisplayRankText(assigned[2])).toBe('昭容');
  });
});
