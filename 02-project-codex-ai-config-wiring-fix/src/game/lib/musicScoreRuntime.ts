import type {
  GameNumericsState,
  InventoryItem,
  MusicHallProgressState,
  MusicScoreMasteryState,
  PalaceTimeState,
} from '../types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(value)));
export type PracticeScoreKind = 'music' | 'dance';

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 41), 0);

export const resolveMusicScoreDifficulty = (color?: string, rarity?: string): number => {
  const quality = color ?? rarity;
  if (quality === 'red') {
    return 85;
  }
  if (quality === 'purple') {
    return 65;
  }
  if (quality === 'blue') {
    return 50;
  }
  return 40;
};

export const resolveMusicScoreQualityLabel = (color?: string, rarity?: string): string => {
  const quality = color ?? rarity;
  return resolvePracticeScoreQualityLabel('music', quality);
};

export const resolvePracticeScoreQualityLabel = (kind: PracticeScoreKind, color?: string, rarity?: string): string => {
  const quality = color ?? rarity;
  const noun = kind === 'dance' ? '舞谱' : '曲谱';
  if (quality === 'red') {
    return `红色${noun}`;
  }
  if (quality === 'purple') {
    return `紫色${noun}`;
  }
  if (quality === 'blue') {
    return `蓝色${noun}`;
  }
  return `寻常${noun}`;
};

export const resolveMusicScoreMastery = (
  item: Pick<InventoryItem, 'itemId' | 'name' | 'color' | 'rarity'>,
  musicHallProgress: MusicHallProgressState,
  masteryMap: Record<string, MusicScoreMasteryState> | undefined = musicHallProgress.musicScoreMastery,
): MusicScoreMasteryState => {
  const existing = masteryMap?.[item.itemId];
  const difficulty = existing?.difficulty ?? resolveMusicScoreDifficulty(item.color, item.rarity);
  return {
    itemId: item.itemId,
    name: existing?.name ?? item.name,
    color: existing?.color ?? item.color,
    rarity: existing?.rarity ?? item.rarity,
    difficulty,
    masteryPercent: clamp(existing?.masteryPercent ?? 0, 0, 200),
    practiceCount: Math.max(0, Math.trunc(existing?.practiceCount ?? 0)),
    performanceCap: clamp(existing?.performanceCap ?? 0, 0, 220),
    performanceScore: clamp(existing?.performanceScore ?? 0, 0, 220),
    lastPracticedAt: existing?.lastPracticedAt,
  };
};

const resolveMusicKnowledge = (state: GameNumericsState): number => {
  const rawMusic = Number(state.stats.talent ?? 0);
  return clamp(rawMusic > 10 ? rawMusic / 10 : rawMusic, 0, 10);
};

const resolveDanceKnowledge = (state: GameNumericsState): number => {
  const rawTemperament = Number(state.stats.temperament ?? 0);
  return clamp(rawTemperament > 10 ? rawTemperament / 100 : rawTemperament, 0, 10);
};

const resolvePracticeKnowledge = (state: GameNumericsState, kind: PracticeScoreKind): number =>
  kind === 'dance' ? resolveDanceKnowledge(state) : resolveMusicKnowledge(state);

const resolveMusicianSupport = (musicHallProgress: MusicHallProgressState): number => {
  if (!musicHallProgress.musicianMet) {
    return 0;
  }
  return clamp(musicHallProgress.musicianFavor + musicHallProgress.musicianAffection, 0, 200);
};

export const resolveMusicScorePerformanceCap = ({
  masteryPercent,
  difficulty,
  state,
  musicHallProgress,
  kind = 'music',
  supportValue,
}: {
  masteryPercent: number;
  difficulty: number;
  state: GameNumericsState;
  musicHallProgress: MusicHallProgressState;
  kind?: PracticeScoreKind;
  supportValue?: number;
}): number => {
  const practiceKnowledge = resolvePracticeKnowledge(state, kind);
  const support = supportValue ?? resolveMusicianSupport(musicHallProgress);
  const supportBonus = Math.floor(support / 8);
  const difficultyBonus = Math.floor(difficulty / 4);
  return clamp(40 + masteryPercent * 0.65 + practiceKnowledge * 4 + supportBonus + difficultyBonus, 20, 220);
};

export const resolveMusicScorePerformanceScore = ({
  performanceCap,
  seed,
}: {
  performanceCap: number;
  seed: string;
}): number => {
  const cap = clamp(performanceCap, 0, 220);
  if (cap <= 0) {
    return 0;
  }

  const floor = Math.max(0, Math.floor(cap * 0.55));
  const span = Math.max(1, cap - floor + 1);
  return floor + (hashSeed(seed) % span);
};

export interface MusicScorePracticeResolution {
  previous: MusicScoreMasteryState;
  next: MusicScoreMasteryState;
  gain: number;
}

export const resolveMusicScorePractice = ({
  item,
  state,
  musicHallProgress,
  time,
  seed,
  kind = 'music',
  supportValue,
  masteryMap,
}: {
  item: InventoryItem;
  state: GameNumericsState;
  musicHallProgress: MusicHallProgressState;
  time: PalaceTimeState;
  seed: string;
  kind?: PracticeScoreKind;
  supportValue?: number;
  masteryMap?: Record<string, MusicScoreMasteryState>;
}): MusicScorePracticeResolution => {
  const previous = resolveMusicScoreMastery(item, musicHallProgress, masteryMap);
  const practiceKnowledge = resolvePracticeKnowledge(state, kind);
  const support = supportValue ?? resolveMusicianSupport(musicHallProgress);
  const supportBonus = Math.floor(support / 25);
  const difficultyPenalty = Math.floor(previous.difficulty / 18);
  const variance = hashSeed(`${seed}:${item.itemId}:${previous.practiceCount}`) % 3;
  const gain =
    previous.masteryPercent >= 200
      ? 0
      : clamp(8 + Math.floor(practiceKnowledge / 2) + supportBonus + variance - difficultyPenalty, 3, 24);
  const masteryPercent = clamp(previous.masteryPercent + gain, 0, 200);
  const performanceCap = resolveMusicScorePerformanceCap({
    masteryPercent,
    difficulty: previous.difficulty,
    state,
    musicHallProgress,
    kind,
    supportValue: support,
  });
  const performanceScore = resolveMusicScorePerformanceScore({
    performanceCap,
    seed: `${seed}:${item.itemId}:${masteryPercent}:practice-preview`,
  });

  return {
    previous,
    gain,
    next: {
      ...previous,
      masteryPercent,
      performanceCap,
      performanceScore,
      practiceCount: previous.practiceCount + 1,
      lastPracticedAt: time,
    },
  };
};
