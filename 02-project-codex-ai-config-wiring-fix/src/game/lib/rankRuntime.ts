import { HOT_SPRING_MIN_RANK_NAME, PRESTIGE_RANK_TABLE, SPECIAL_PRESTIGE_RANK_TABLE } from '../../config/constants';
import { YINGLUOYETING_INITIAL_RESIDENCE } from '../../config/haremPalaces';
import type { PlayerResidenceName, RouteId } from '../types';

const ALL_PLAYER_RANKS = [...SPECIAL_PRESTIGE_RANK_TABLE, ...PRESTIGE_RANK_TABLE];
const PLAYER_RANK_PROGRESS_ORDER = [...ALL_PLAYER_RANKS]
  .sort((left, right) => left.等级 - right.等级)
  .map((entry) => entry.位分名称);
const SPECIAL_TRACKED_RANK_ALIAS: Record<string, string> = {
  和亲入宫: '妃',
  公主: '妃',
};
const PLAYER_RESIDENCE_PLAN_BY_ROUTE: Record<
  RouteId,
  {
    high: PlayerResidenceName;
    mid: PlayerResidenceName;
    low: PlayerResidenceName;
    exile: PlayerResidenceName;
  }
> = {
  lanyinxuguo: {
    high: '长春宫',
    mid: '长春宫',
    low: '披香殿',
    exile: '储秀宫西偏殿',
  },
  fushengrumeng: {
    high: '储秀宫',
    mid: '储秀宫',
    low: '延禧宫西偏殿',
    exile: '储秀宫西偏殿',
  },
  yingluoyeting: {
    high: '永宁宫',
    mid: '临华殿',
    low: YINGLUOYETING_INITIAL_RESIDENCE,
    exile: YINGLUOYETING_INITIAL_RESIDENCE,
  },
  chenyuansucuo: {
    high: '玉清宫',
    mid: '玉清宫',
    low: '玉清宫西偏殿',
    exile: '玉清宫西偏殿',
  },
};

export const PLAYER_RANK_WEIGHT_LIST = Object.fromEntries(
  ALL_PLAYER_RANKS.map((entry) => [entry.位分名称, entry.等级]),
) as Record<string, number>;

export const resolvePlayerRankByPrestige = (prestige: number): string => {
  const numericPrestige = Number(prestige ?? 0);
  const matched = [...ALL_PLAYER_RANKS]
    .sort((left, right) => right.所需声望值 - left.所需声望值)
    .find((entry) => numericPrestige >= entry.所需声望值);

  return matched?.位分名称 ?? '官女子';
};

export const resolveNextPlayerRankPrestigeRequirement = (rankName: string): number | undefined => {
  if (rankName === '皇后') {
    return undefined;
  }

  const currentWeight = getRankWeight(rankName);
  const nextRank = [...ALL_PLAYER_RANKS]
    .filter((entry) => entry.等级 < currentWeight)
    .sort((left, right) => right.等级 - left.等级)[0];

  return nextRank?.所需声望值;
};

export const getRankWeight = (rankName: string): number => PLAYER_RANK_WEIGHT_LIST[rankName] ?? Number.MAX_SAFE_INTEGER;

export const isRankAtLeast = (currentRankName: string, targetRankName: string): boolean =>
  getRankWeight(currentRankName) <= getRankWeight(targetRankName);

export const canAccessHotSpringByPrestige = (prestige: number): boolean =>
  isRankAtLeast(resolvePlayerRankByPrestige(prestige), HOT_SPRING_MIN_RANK_NAME);

export const normalizeTrackedPlayerRankLabel = (rankName?: string): string | undefined => {
  if (!rankName) {
    return undefined;
  }

  if (rankName in PLAYER_RANK_WEIGHT_LIST) {
    return rankName;
  }

  return SPECIAL_TRACKED_RANK_ALIAS[rankName];
};

export const resolvePlayerActualRankLabel = (
  currentRankName: string | undefined,
  prestige: number,
  maxStep = 2,
): string => {
  const targetRankName = resolvePlayerRankByPrestige(prestige);
  const normalizedCurrentRank = normalizeTrackedPlayerRankLabel(currentRankName);
  if (!normalizedCurrentRank || maxStep <= 0) {
    return targetRankName;
  }

  const currentIndex = PLAYER_RANK_PROGRESS_ORDER.indexOf(normalizedCurrentRank);
  const targetIndex = PLAYER_RANK_PROGRESS_ORDER.indexOf(targetRankName);
  if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) {
    return targetRankName;
  }

  if (targetIndex > currentIndex) {
    return PLAYER_RANK_PROGRESS_ORDER[Math.min(currentIndex + maxStep, targetIndex)];
  }

  return PLAYER_RANK_PROGRESS_ORDER[Math.max(currentIndex - maxStep, targetIndex)];
};

export const resolvePlayerResidenceByRank = (routeId: RouteId, rankName: string): PlayerResidenceName => {
  if (rankName === '皇后') {
    return '椒房殿';
  }

  const weight = getRankWeight(rankName);
  const plan = PLAYER_RESIDENCE_PLAN_BY_ROUTE[routeId];
  if (weight <= getRankWeight('妃')) {
    return plan.high;
  }
  if (weight <= getRankWeight('才人')) {
    return plan.mid;
  }
  if (weight <= getRankWeight('答应')) {
    return plan.low;
  }
  return plan.exile;
};
