import { describe, expect, it } from 'vitest';
import { buildDanceScoreItem, buildMusicScoreItem } from '../data/inventoryPresets';
import type { GameNumericsState, MusicHallProgressState, PalaceTimeState } from '../types';
import { resolveMusicScorePractice } from './musicScoreRuntime';

const time: PalaceTimeState = {
  year: 1,
  month: 2,
  xun: 1,
  slotIndex: 1,
  slot: '上午',
  slotProgress: 0,
};

const buildState = (stats: Partial<GameNumericsState['stats']>): GameNumericsState => ({
  age: 18,
  name: '沈清',
  pointsTotal: 20,
  pointsLeft: 0,
  routeId: 'lanyinxuguo',
  stamina: 10,
  silver: 100,
  prestige: 0,
  stress: 0,
  favor: 0,
  trueHeart: 0,
  residenceName: '储秀宫西偏殿',
  family: '正五品文官嫡女',
  monthlyExpenseStrategy: 'balanced',
  stats: {
    health: 500,
    intrigue: 500,
    appearance: 500,
    temperament: 500,
    fortune: 0,
    poetry: 0,
    painting: 0,
    talent: 0,
    embroidery: 0,
    medicine: 0,
    politics: 0,
    ...stats,
  },
  flags: { attributeStatsFinalized: true },
});

const musicHallProgress: MusicHallProgressState = {
  listenCount: 0,
  strollCount: 0,
  signUpCount: 0,
  musicianFirstMet: true,
  musicianMet: true,
  musicianFavor: 20,
  musicianAffection: 20,
  musicScoreMastery: {},
  danceScoreMastery: {},
};

describe('musicScoreRuntime', () => {
  it('uses the same mastery formula for music scores and dance scores with their own ability source', () => {
    const musicScore = buildMusicScoreItem('score-spring-river');
    const danceScore = buildDanceScoreItem('dance-score-rain-bell');
    expect(musicScore).not.toBeNull();
    expect(danceScore).not.toBeNull();

    const musicResult = resolveMusicScorePractice({
      item: musicScore!,
      state: buildState({ talent: 60, temperament: 100 }),
      musicHallProgress,
      time,
      seed: 'same-formula',
      kind: 'music',
      supportValue: 40,
    });
    const danceResult = resolveMusicScorePractice({
      item: danceScore!,
      state: buildState({ talent: 0, temperament: 600 }),
      musicHallProgress,
      time,
      seed: 'same-formula',
      kind: 'dance',
      supportValue: 40,
      masteryMap: musicHallProgress.danceScoreMastery,
    });

    expect(musicResult.next.masteryPercent).toBeGreaterThan(0);
    expect(danceResult.next.masteryPercent).toBeGreaterThan(0);
    expect(danceResult.next.itemId).toBe('dance-score-rain-bell');
    expect(danceResult.next.difficulty).toBe(musicResult.next.difficulty);
  });
});
