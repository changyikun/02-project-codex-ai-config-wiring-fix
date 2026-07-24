import { describe, expect, it } from 'vitest';

import type { GameNumericsState, MusicHallProgressState, PalaceBanquetProgressState, PalaceTimeState } from '../types';
import { buildDanceScoreItem, buildMusicScoreItem } from '../data/inventoryPresets';
import { getPalaceBanquetEligibleScores, resolvePalaceBanquet } from './palaceBanquetRuntime';

const baseTime: PalaceTimeState = {
  year: 1,
  month: 3,
  xun: 1,
  slotIndex: 3,
  slot: '傍晚',
  slotProgress: 0,
};

const baseState: GameNumericsState = {
  name: '沉璧',
  age: 17,
  family: '沉',
  routeId: 'yingluoyeting',
  residenceName: '储秀宫西偏殿',
  pointsTotal: 20,
  pointsLeft: 0,
  favor: 0,
  trueHeart: 0,
  prestige: 0,
  silver: 50,
  stamina: 10,
  stress: 0,
  stats: {
    poetry: 20,
    charm: 20,
    talent: 10,
    embroidery: 20,
    medicine: 20,
    politics: 20,
    ambition: 0,
    composure: 0,
    insight: 0,
    temperament: 1,
  },
  flags: {},
};

const baseMusicHallProgress: MusicHallProgressState = {
  listenCount: 0,
  strollCount: 0,
  signUpCount: 0,
  musicianFirstMet: false,
  musicianMet: true,
  musicianFavor: 0,
  musicianAffection: 0,
  musicScoreMastery: {},
  danceScoreMastery: {},
};

describe('palaceBanquetRuntime', () => {
  it('allows both music scores and dance scores to be selected for banquet signup', () => {
    const musicScore = buildMusicScoreItem('score-spring-river');
    const danceScore = buildDanceScoreItem('dance-score-rain-bell');
    expect(musicScore).not.toBeNull();
    expect(danceScore).not.toBeNull();

    const eligibleScores = getPalaceBanquetEligibleScores([
      { ...musicScore!, quantity: 1 },
      { ...danceScore!, quantity: 1 },
      { ...musicScore!, itemId: 'empty-copy', quantity: 0 },
    ]);

    expect(eligibleScores.map((item) => item.itemId)).toEqual(['score-spring-river', 'dance-score-rain-bell']);
  });

  it('resolves a submitted dance score from dance mastery using the same music-knowledge formula', () => {
    const danceScore = buildDanceScoreItem('dance-score-rain-bell');
    expect(danceScore).not.toBeNull();

    const progress: MusicHallProgressState = {
      ...baseMusicHallProgress,
      danceScoreMastery: {
        'dance-score-rain-bell': {
          itemId: 'dance-score-rain-bell',
          name: danceScore!.name,
          color: danceScore!.color,
          rarity: danceScore!.rarity,
          difficulty: 65,
          masteryPercent: 150,
          practiceCount: 8,
          performanceScore: 0,
        },
      },
    };
    const banquetProgress: PalaceBanquetProgressState = {
      submissionCount: 1,
      submittedScore: {
        itemId: 'dance-score-rain-bell',
        name: danceScore!.name,
        color: danceScore!.color,
        rarity: danceScore!.rarity,
        scoreKind: 'dance',
        seasonKey: '1-3-1-palace-banquet',
        submittedAt: baseTime,
      },
    };

    const resolved = resolvePalaceBanquet({
      state: baseState,
      musicHallProgress: progress,
      palaceBanquetProgress: banquetProgress,
      seasonKey: '1-3-1-palace-banquet',
      completedAt: baseTime,
    });

    expect(resolved.result.scoreKind).toBe('dance');
    expect(resolved.result.completionPercent).toBe(150);
    expect(resolved.lines[0]).toContain('献舞');
    expect(resolved.lines[1]).toContain('舞谱完成度：150%');
  });
});
