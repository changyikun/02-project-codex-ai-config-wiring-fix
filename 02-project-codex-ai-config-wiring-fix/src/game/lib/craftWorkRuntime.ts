import type {
  CraftWorkInstanceState,
  CraftWorkQuality,
  CraftWorksProgressState,
  GameNumericsState,
  InventoryItem,
  PalaceTimeState,
} from '../types';
import { getCraftWorkConfig, getCraftWorksByType, type NumericCraftWorkConfig } from '../numerics/numericCatalog';
import { evaluateCraftWorkFormula } from '../numerics/formulas/craftWorkFormulas';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(value)));

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 37), 0);

const normalizeCraftStat = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (Math.abs(value) <= 10) {
    return clamp(value * 10, 0, 100);
  }
  return clamp(value, 0, 100);
};

export const craftWorkTypeLabels = {
  embroidery: '绣花',
  painting: '字画',
  incense: '调香',
} as const;

export const craftWorkQualityLabels: Record<CraftWorkQuality, string> = {
  rough: '粗成',
  steady: '工稳',
  fine: '精妙',
};

const qualityMultipliers: Record<CraftWorkQuality, number> = {
  rough: 0.75,
  steady: 1,
  fine: 1.35,
};

export const resolveCraftWorkQuality = (score: number): CraftWorkQuality => {
  if (score >= 75) {
    return 'fine';
  }
  if (score >= 50) {
    return 'steady';
  }
  return 'rough';
};

const resolveCraftVariables = (
  work: NumericCraftWorkConfig,
  state: GameNumericsState,
  actionCount: number,
  variance = 0,
) => {
  const mainSkill = normalizeCraftStat(Number(state.stats[work.requiredStatKey] ?? 0));
  const supportSkill = normalizeCraftStat(Number(state.stats[work.supportStatKey] ?? 0));
  return {
    mainSkill,
    supportSkill,
    difficulty: work.difficulty,
    actionCount: Math.max(1, actionCount),
    variance,
  };
};

export const buildCraftWorkInstance = ({
  workId,
  instanceId,
  time,
}: {
  workId: string;
  instanceId: string;
  time: PalaceTimeState;
}): CraftWorkInstanceState => {
  const work = getCraftWorkConfig(workId);
  return {
    instanceId,
    workId: work.workId,
    type: work.type,
    name: work.name,
    rarity: work.rarity,
    progressPercent: 0,
    actionCount: 0,
    qualityScore: 0,
    startedAt: time,
  };
};

export const listCraftWorkConfigsByType = getCraftWorksByType;

export const estimateCraftWorkProgressGain = ({
  workId,
  state,
  actionCount = 1,
}: {
  workId: string;
  state: GameNumericsState;
  actionCount?: number;
}): number => {
  const work = getCraftWorkConfig(workId);
  return clamp(
    evaluateCraftWorkFormula('craftProgressGain', resolveCraftVariables(work, state, Math.max(1, actionCount), 0)),
    1,
    100,
  );
};

export interface CraftWorkAdvanceResolution {
  previous: CraftWorkInstanceState;
  next?: CraftWorkInstanceState;
  gain: number;
  completed: boolean;
  completedItem?: InventoryItem;
  quality?: CraftWorkQuality;
  qualityLabel?: string;
  salePrice?: number;
  favorDelta?: number;
}

export const resolveCraftWorkAdvance = ({
  instance,
  state,
  time,
  seed,
}: {
  instance: CraftWorkInstanceState;
  state: GameNumericsState;
  time: PalaceTimeState;
  seed: string;
}): CraftWorkAdvanceResolution => {
  const work = getCraftWorkConfig(instance.workId);
  const variance = (hashSeed(`${seed}:${instance.instanceId}:${instance.actionCount}`) % 5) - 2;
  const nextActionCount = instance.actionCount + 1;
  const gain = clamp(
    evaluateCraftWorkFormula('craftProgressGain', resolveCraftVariables(work, state, nextActionCount, variance)),
    1,
    100,
  );
  const progressPercent = clamp(instance.progressPercent + gain, 0, 100);
  const qualityScore = clamp(
    evaluateCraftWorkFormula('craftQualityScore', resolveCraftVariables(work, state, nextActionCount)),
    0,
    100,
  );
  const quality = resolveCraftWorkQuality(qualityScore);
  const qualityMultiplier = qualityMultipliers[quality];
  const salePrice = clamp(
    evaluateCraftWorkFormula('craftSalePrice', {
      basePrice: work.basePrice,
      difficulty: work.difficulty,
      qualityMultiplier,
    }),
    1,
    999999,
  );
  const favorDelta = clamp(
    evaluateCraftWorkFormula('craftFavorDelta', {
      baseFavorDelta: work.baseFavorDelta,
      qualityMultiplier,
    }),
    1,
    100,
  );
  const next: CraftWorkInstanceState = {
    ...instance,
    progressPercent,
    actionCount: nextActionCount,
    qualityScore,
    quality,
    lastWorkedAt: time,
  };

  if (progressPercent < 100) {
    return {
      previous: instance,
      next,
      gain,
      completed: false,
      quality,
      qualityLabel: craftWorkQualityLabels[quality],
      salePrice,
      favorDelta,
    };
  }

  const qualityLabel = craftWorkQualityLabels[quality];
  const completedItem: InventoryItem = {
    id: `crafted:${work.type}:${work.workId}:${quality}`,
    itemId: `crafted:${work.type}:${work.workId}:${quality}`,
    name: `${qualityLabel}${work.name}`,
    category: 'gift',
    rarity: work.rarity,
    color: work.rarity,
    quantity: 1,
    price: salePrice,
    favorDelta,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    canSell: true,
    canRecycle: true,
    recyclePriceOverride: salePrice,
    description: `${work.description} 成色：${qualityLabel}。`,
  };

  return {
    previous: instance,
    gain,
    completed: true,
    completedItem,
    quality,
    qualityLabel,
    salePrice,
    favorDelta,
  };
};

export const getActiveCraftWorksByType = (
  progress: CraftWorksProgressState,
  type: CraftWorkInstanceState['type'],
): CraftWorkInstanceState[] =>
  Object.values(progress.activeWorks)
    .filter((work) => work.type === type)
    .sort(
      (left, right) =>
        left.startedAt.year - right.startedAt.year ||
        left.startedAt.month - right.startedAt.month ||
        left.startedAt.xun - right.startedAt.xun ||
        left.startedAt.slotIndex - right.startedAt.slotIndex,
    );
