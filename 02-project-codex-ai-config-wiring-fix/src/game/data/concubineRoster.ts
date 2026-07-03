import {
  FAVOR_TIER_TABLE,
  LIFESPAN_LOSS_PER_MONTH_WHEN_STRESS_GT_THRESHOLD,
  PLAYER_AMBITION_RANGE,
  PLAYER_APPEARANCE_RANGE,
  PLAYER_FAVOR_RANGE,
  PLAYER_FORTUNE_RANGE,
  PLAYER_HEALTH_RANGE,
  PLAYER_INTRIGUE_RANGE,
  PLAYER_STRESS_RANGE,
  PLAYER_TEMPERAMENT_RANGE,
  NINE_CONSORT_RANK_LABELS,
  PRESTIGE_RANK_TABLE,
  PRESTIGE_RANGE,
  SPECIAL_PRESTIGE_RANK_TABLE,
  STRESS_THRESHOLD_LIFESPAN_LOSS,
  getFavorTierByValue,
  type FavorTierDefinition,
} from '../../config/constants';
import { RarityColorId } from '../../config/types';
import type { ConcubineProfile, ConcubineStatus, RouteId } from '../types';
import {
  getGeneratedConsortRuleValue,
  numericFixedConsortSeeds,
  numericGeneratedConsortTemplates,
} from '../numerics/numericCatalog';

type WomenPortraitId =
  | '陈妙仪'
  | '陈婉宁'
  | '崔令蓉'
  | '崔莺莺'
  | '杜若蘅'
  | '冯妙莲'
  | '顾雨杏'
  | '花棠'
  | '江晚晚'
  | '姜芷'
  | '李若瑶'
  | '柳仪芳'
  | '年欣兰'
  | '裴静姝'
  | '容可儿'
  | '沈妙清'
  | '水兰婷'
  | '孙玉娥'
  | '姚铃儿'
  | '叶琳珊'
  | '虞秋池'
  | '程雪砚'
  | '阿史那明珠'
  | '闻人照月'
  | '周怜星';

export const ALL_WOMEN_PORTRAIT_IDS: readonly WomenPortraitId[] = [
  '陈妙仪',
  '陈婉宁',
  '崔令蓉',
  '崔莺莺',
  '杜若蘅',
  '冯妙莲',
  '顾雨杏',
  '花棠',
  '江晚晚',
  '姜芷',
  '李若瑶',
  '柳仪芳',
  '年欣兰',
  '裴静姝',
  '容可儿',
  '沈妙清',
  '水兰婷',
  '孙玉娥',
  '姚铃儿',
  '叶琳珊',
  '虞秋池',
  '程雪砚',
  '阿史那明珠',
  '闻人照月',
  '周怜星',
];

type ConcubineSeed = Omit<ConcubineProfile, 'id' | 'source' | 'allies' | 'rivals'> & {
  allies?: string[];
  rivals?: string[];
};

type GeneratedConcubineTemplate = {
  portraitId: WomenPortraitId;
  name: string;
  familyBackground: string;
  personality: string;
  summary: string;
  ageRange: readonly [number, number];
  possibleRanks: readonly string[];
  possibleResidences: readonly string[];
  stats: ConcubineProfile['stats'];
};

const WOMEN_ASSET_BASE_PATH = '/assets/characters/women/';
const CONSORT_PORTRAIT_FALLBACK_FILENAME = 'feizi2.png';
const girlishConsortFilename = 'feizi1.png';
const gentleConsortFilename = 'feizi2.png';
const proudConsortFilename = 'feizi3.png';
const nobleConsortFilename = 'feizi4.png';
const northernConsortFilename = 'feizi5.png';
const matureGentleConsortFilename = 'feizi6.png';
const paleSorrowfulConsortFilename = 'feizi7.png';

const WOMEN_ASSET_FILENAME_BY_ID: Partial<Record<WomenPortraitId | '阿翎' | '太后' | '杜娘' | '娇娇' | '方瑶', string>> = {
  花棠: nobleConsortFilename,
  姜芷: gentleConsortFilename,
  方瑶: nobleConsortFilename,
  阿翎: girlishConsortFilename,
  太后: 'taihou.png',
  杜娘: 'duniang.png',
  娇娇: 'jiaojiao.png',

  陈妙仪: gentleConsortFilename,
  陈婉宁: 'chenwanning.png',
  崔令蓉: nobleConsortFilename,
  崔莺莺: proudConsortFilename,
  杜若蘅: matureGentleConsortFilename,
  冯妙莲: paleSorrowfulConsortFilename,
  顾雨杏: nobleConsortFilename,
  江晚晚: matureGentleConsortFilename,
  李若瑶: nobleConsortFilename,
  柳仪芳: gentleConsortFilename,
  年欣兰: proudConsortFilename,
  裴静姝: paleSorrowfulConsortFilename,
  容可儿: girlishConsortFilename,
  沈妙清: gentleConsortFilename,
  水兰婷: northernConsortFilename,
  孙玉娥: matureGentleConsortFilename,
  姚铃儿: proudConsortFilename,
  叶琳珊: proudConsortFilename,
  虞秋池: nobleConsortFilename,
  程雪砚: gentleConsortFilename,
  阿史那明珠: northernConsortFilename,
  闻人照月: gentleConsortFilename,
  周怜星: gentleConsortFilename,
};

const officialRankPaletteMap = {
  sovereign: { rankColor: '#FF0800', nameColor: '#FF5C57', accentColor: '#FF9A96' },
  high: { rankColor: '#E840B2', nameColor: '#EC67C2', accentColor: '#F3A0DA' },
  middle: { rankColor: '#7371D8', nameColor: '#8D8AE3', accentColor: '#B3B1EE' },
  low: { rankColor: '#70D1D7', nameColor: '#89DCE1', accentColor: '#B5ECEF' },
  base: { rankColor: '#7C7B78', nameColor: '#989792', accentColor: '#C7C5C0' },
} as const;

type RankPaletteKey = keyof typeof officialRankPaletteMap;

interface ConcubineRankRule {
  rankLabel: string;
  minPrestige: number;
  maxPrestige: number;
  paletteKey: RankPaletteKey;
  weight: number;
}

const rankPaletteKeyByColorId: Record<RarityColorId, RankPaletteKey> = {
  [RarityColorId.Legendary]: 'sovereign',
  [RarityColorId.Epic]: 'high',
  [RarityColorId.Rare]: 'middle',
  [RarityColorId.Common]: 'low',
  [RarityColorId.Neutral]: 'base',
};

const splitRankLabels = (rankLabel: string): string[] =>
  rankLabel
    .split('/')
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
const NINE_CONSORT_RANK_LABEL_SET = new Set<string>(NINE_CONSORT_RANK_LABELS);
const NINE_CONSORT_PRESTIGE_MIN = 1300;
const NINE_CONSORT_PRESTIGE_MAX = 1499;
const NINE_CONSORT_FALLBACK_RANK_LABEL = '贵嫔';

const isNineConsortRankLabel = (rankLabel: string): boolean => NINE_CONSORT_RANK_LABEL_SET.has(rankLabel);
const isNineConsortPrestige = (prestige: number): boolean =>
  prestige >= NINE_CONSORT_PRESTIGE_MIN && prestige <= NINE_CONSORT_PRESTIGE_MAX;

const buildConcubinePrestigeRules = (): readonly ConcubineRankRule[] => {
  const rankEntries = [...PRESTIGE_RANK_TABLE, ...SPECIAL_PRESTIGE_RANK_TABLE].sort(
    (left, right) => left.所需声望值 - right.所需声望值,
  );

  const prestigeRules = rankEntries.flatMap((entry, index) => {
    const nextEntry = rankEntries[index + 1];
    const minPrestige = entry.所需声望值;
    const maxPrestige = nextEntry ? nextEntry.所需声望值 - 1 : PRESTIGE_RANGE[1];
    const paletteKey = rankPaletteKeyByColorId[entry.对应颜色标识];
    const weight = Math.round(entry.所需声望值 / 20) + 80;
    return splitRankLabels(entry.位分名称).map((rankLabel) => ({
      rankLabel,
      minPrestige,
      maxPrestige,
      paletteKey,
      weight,
    }));
  });

  return [
    ...prestigeRules,
    {
      rankLabel: '庶人',
      minPrestige: PRESTIGE_RANGE[0],
      maxPrestige: -1,
      paletteKey: 'base',
      weight: 20,
    },
  ];
};

const CONCUBINE_PRESTIGE_RULES: readonly ConcubineRankRule[] = buildConcubinePrestigeRules();

const canonicalRanks = [...PRESTIGE_RANK_TABLE, ...SPECIAL_PRESTIGE_RANK_TABLE]
  .sort((left, right) => left.等级 - right.等级)
  .flatMap((entry) => splitRankLabels(entry.位分名称))
  .concat('庶人');

const liveStatusIllHealthThreshold = getGeneratedConsortRuleValue('live_status_ill_health_threshold');
// Special NPCs and authority figures should never be treated as concubine-list members.
const NON_CONCUBINE_NAMES = new Set(['布自游', '卢安平', '当一', '杜娘', '娇娇', '简宁']);
const NON_CONCUBINE_PATTERNS = [/太后/];

const getRosterIdentityTokens = (entity: { name: string; portraitId: string }): string[] =>
  [String(entity.name ?? '').trim(), String(entity.portraitId ?? '').trim()].filter((token) => token.length > 0);

const isConcubineRosterMember = (entity: { name: string; portraitId: string }): boolean =>
  getRosterIdentityTokens(entity).every(
    (token) => !NON_CONCUBINE_NAMES.has(token) && !NON_CONCUBINE_PATTERNS.some((pattern) => pattern.test(token)),
  );

const getCanonicalRankLabel = (label: string): string => {
  const normalized = String(label ?? '').trim();
  if (normalized === '九嫔') {
    return NINE_CONSORT_RANK_LABELS[0];
  }
  for (const rank of canonicalRanks) {
    if (normalized === rank || normalized.endsWith(rank)) {
      return rank;
    }
  }
  return normalized;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const normalizeThousandScaleStat = (value: number): number => (Math.abs(value) > 100 ? value : value * 10);

const formatOneDecimal = (value: number): number => Number(Number(value).toFixed(1));

const FAVOR_TIER_LIMITS = FAVOR_TIER_TABLE.filter((tier) => tier.maxCount > 0)
  .sort((left, right) => right.range[0] - left.range[0])
  .map((tier) => ({
    ...tier,
    demoteTo: tier.range[0] - 1,
  }));

const getOccupiedFavorTierCounts = (favorValues: readonly number[]): Map<FavorTierDefinition['label'], number> => {
  const counts = new Map<FavorTierDefinition['label'], number>();
  favorValues.forEach((favor) => {
    const tier = getFavorTierByValue(Number(favor ?? 0));
    if (tier.maxCount <= 0) {
      return;
    }
    counts.set(tier.label, (counts.get(tier.label) ?? 0) + 1);
  });
  return counts;
};

const normalizeConcubineStats = (stats: ConcubineProfile['stats']): ConcubineProfile['stats'] => ({
  prestige: clamp(Number(stats.prestige ?? 0), PRESTIGE_RANGE[0], PRESTIGE_RANGE[1]),
  favor: clamp(Number(stats.favor ?? 0), PLAYER_FAVOR_RANGE[0], PLAYER_FAVOR_RANGE[1]),
  familyInfluence: clamp(Number(stats.familyInfluence ?? 0), 0, 100),
  health: formatOneDecimal(clamp(normalizeThousandScaleStat(Number(stats.health ?? 0)), PLAYER_HEALTH_RANGE[0], PLAYER_HEALTH_RANGE[1])),
  appearance: formatOneDecimal(
    clamp(normalizeThousandScaleStat(Number(stats.appearance ?? 0)), PLAYER_APPEARANCE_RANGE[0], PLAYER_APPEARANCE_RANGE[1]),
  ),
  relationToPlayer: clamp(Number(stats.relationToPlayer ?? 0), -100, 100),
  childrenCount: clamp(Math.round(Number(stats.childrenCount ?? 0)), 0, 10),
  ambition: clamp(Number(stats.ambition ?? 0), PLAYER_AMBITION_RANGE[0], PLAYER_AMBITION_RANGE[1]),
  stress: clamp(Number(stats.stress ?? 0), PLAYER_STRESS_RANGE[0], PLAYER_STRESS_RANGE[1]),
  intrigue: formatOneDecimal(
    clamp(normalizeThousandScaleStat(Number(stats.intrigue ?? 0)), PLAYER_INTRIGUE_RANGE[0], PLAYER_INTRIGUE_RANGE[1]),
  ),
  temperament: formatOneDecimal(
    clamp(normalizeThousandScaleStat(Number(stats.temperament ?? 0)), PLAYER_TEMPERAMENT_RANGE[0], PLAYER_TEMPERAMENT_RANGE[1]),
  ),
  affection: clamp(Number(stats.affection ?? 0), 0, 100),
  fortune: clamp(Number(stats.fortune ?? 0), PLAYER_FORTUNE_RANGE[0], PLAYER_FORTUNE_RANGE[1]),
});

const getPrestigeRuleByRankLabel = (rankLabel: string): ConcubineRankRule | undefined =>
  CONCUBINE_PRESTIGE_RULES.find((rule) => rule.rankLabel === getCanonicalRankLabel(rankLabel));

const getPrestigeRuleByValue = (prestige: number, preferredRankLabel?: string): ConcubineRankRule => {
  const matchedRules = CONCUBINE_PRESTIGE_RULES.filter((rule) => prestige >= rule.minPrestige && prestige <= rule.maxPrestige);
  if (matchedRules.length === 0) {
    return CONCUBINE_PRESTIGE_RULES[CONCUBINE_PRESTIGE_RULES.length - 1];
  }

  const preferredRule = preferredRankLabel ? getPrestigeRuleByRankLabel(preferredRankLabel) : undefined;
  const firstMatchedRule = matchedRules[0];
  if (
    preferredRule &&
    preferredRule.minPrestige === firstMatchedRule.minPrestige &&
    preferredRule.maxPrestige === firstMatchedRule.maxPrestige
  ) {
    return preferredRule;
  }

  const matchedNineConsortRule = matchedRules.find((rule) => isNineConsortRankLabel(rule.rankLabel));
  if (matchedNineConsortRule) {
    return getPrestigeRuleByRankLabel(NINE_CONSORT_FALLBACK_RANK_LABEL) ?? matchedNineConsortRule;
  }

  return matchedRules[0];
};

export const assignLimitedNineConsortRanks = (roster: ConcubineProfile[]): ConcubineProfile[] => {
  const occupiedRankLabels = new Set<string>();
  const assignedRankLabels = new Map<string, string>();

  roster.forEach((consort) => {
    const prestige = Number(consort.stats.prestige ?? 0);
    const currentRankLabel = getCanonicalRankLabel(consort.rankLabel);
    if (consort.status !== 'live' || !isNineConsortPrestige(prestige) || !isNineConsortRankLabel(currentRankLabel)) {
      return;
    }
    if (occupiedRankLabels.has(currentRankLabel)) {
      return;
    }
    occupiedRankLabels.add(currentRankLabel);
    assignedRankLabels.set(consort.id, currentRankLabel);
  });

  roster.forEach((consort) => {
    const prestige = Number(consort.stats.prestige ?? 0);
    if (consort.status !== 'live' || !isNineConsortPrestige(prestige) || assignedRankLabels.has(consort.id)) {
      return;
    }
    const availableRankLabel = NINE_CONSORT_RANK_LABELS.find((rankLabel) => !occupiedRankLabels.has(rankLabel));
    if (!availableRankLabel) {
      assignedRankLabels.set(consort.id, NINE_CONSORT_FALLBACK_RANK_LABEL);
      return;
    }
    occupiedRankLabels.add(availableRankLabel);
    assignedRankLabels.set(consort.id, availableRankLabel);
  });

  return roster.map((consort) => {
    const assignedRankLabel = assignedRankLabels.get(consort.id);
    if (!assignedRankLabel || getCanonicalRankLabel(consort.rankLabel) === assignedRankLabel) {
      return consort;
    }
    return normalizeConcubineProfile({
      ...consort,
      rankLabel: assignedRankLabel,
    });
  });
};

const resolveGeneratedPrestige = (rankLabel: string, random: () => number): number => {
  const rule = getPrestigeRuleByRankLabel(rankLabel) ?? CONCUBINE_PRESTIGE_RULES[CONCUBINE_PRESTIGE_RULES.length - 1];
  if (rule.maxPrestige <= rule.minPrestige) {
    return rule.minPrestige;
  }
  return clamp(rule.minPrestige + Math.round(random() * (rule.maxPrestige - rule.minPrestige)), rule.minPrestige, rule.maxPrestige);
};

export const normalizeConcubineProfile = (consort: ConcubineProfile): ConcubineProfile => {
  const normalized: ConcubineProfile = {
    ...consort,
    rankLabel: getCanonicalRankLabel(consort.rankLabel),
    stats: normalizeConcubineStats(consort.stats),
    allies: consort.allies ?? [],
    rivals: consort.rivals ?? [],
  };

  return {
    ...normalized,
    stateLabel: getConcubineConditionLabel(normalized),
  };
};

const isConcubineIll = (consort: ConcubineProfile): boolean =>
  consort.conditionFlags?.illness === true || Number(consort.stats.health) <= liveStatusIllHealthThreshold;

const getRankTierKey = (rankLabel: string): keyof typeof officialRankPaletteMap => {
  return getPrestigeRuleByRankLabel(rankLabel)?.paletteKey ?? 'base';
};

export const getConcubineDisplayRankText = (consort: ConcubineProfile): string => {
  if (consort.status === 'limbo') {
    return '庶人';
  }
  if (consort.status === 'deceased') {
    return consort.posthumousTitle ?? consort.rankLabel;
  }
  return getPrestigeRuleByValue(Number(consort.stats.prestige ?? 0), consort.rankLabel).rankLabel;
};

export const getConcubineRankWeightByLabel = (rankLabel: string): number =>
  getPrestigeRuleByRankLabel(rankLabel)?.weight ?? 0;

export const getConcubineRankPalette = (
  consort: ConcubineProfile,
): { rankColor: string; nameColor: string; accentColor: string } =>
  officialRankPaletteMap[getRankTierKey(getConcubineDisplayRankText(consort))];

export const getConcubineRankShiftNotice = (consort: ConcubineProfile): string | null => {
  if (consort.status !== 'live') {
    return null;
  }

  const explicitRank = getCanonicalRankLabel(consort.rankLabel);
  const prestigeRank = getConcubineDisplayRankText(consort);
  if (explicitRank === prestigeRank) {
    return null;
  }

  return `声望波动触发位分重算：${explicitRank} → ${prestigeRank}`;
};

export const getConcubineFavorTier = (consort: ConcubineProfile): FavorTierDefinition =>
  getFavorTierByValue(Number(consort.stats.favor ?? 0));

export const getConcubineConditionLabel = (consort: ConcubineProfile): string => {
  if (consort.status === 'deceased') {
    return '已逝';
  }
  if (consort.status === 'limbo') {
    return '冷宫';
  }
  if (consort.conditionFlags?.pregnant) {
    return '有孕';
  }
  if (consort.conditionFlags?.madness) {
    return '疯癫';
  }
  if (isConcubineIll(consort)) {
    return '有恙';
  }
  return '寻常';
};

export const applyConcubinePressureHealthPenalty = (consort: ConcubineProfile, xunSteps = 1): ConcubineProfile => {
  if (consort.status !== 'live' || Number(consort.stats.stress) <= STRESS_THRESHOLD_LIFESPAN_LOSS || xunSteps <= 0) {
    return consort;
  }

  const nextHealth = formatOneDecimal(
    clamp(
      Number(consort.stats.health) - LIFESPAN_LOSS_PER_MONTH_WHEN_STRESS_GT_THRESHOLD * xunSteps,
      PLAYER_HEALTH_RANGE[0],
      PLAYER_HEALTH_RANGE[1],
    ),
  );

  if (nextHealth === Number(consort.stats.health)) {
    return consort;
  }

  return normalizeConcubineProfile({
    ...consort,
    stats: {
      ...consort.stats,
      health: nextHealth,
    },
  });
};

export const enforceConcubineFavorTierCaps = (
  roster: ConcubineProfile[],
  occupiedFavorValues: readonly number[] = [],
): ConcubineProfile[] => {
  const normalizedRoster = roster.map(normalizeConcubineProfile);
  const nextRoster = [...normalizedRoster];
  const occupiedCounts = getOccupiedFavorTierCounts(occupiedFavorValues);

  for (const tier of FAVOR_TIER_LIMITS) {
    const availableCount = Math.max(0, tier.maxCount - (occupiedCounts.get(tier.label) ?? 0));
    const matchingIndexes = nextRoster
      .map((consort, index) => ({ consort, index }))
      .filter(({ consort }) => consort.status === 'live')
      .filter(({ consort }) => {
        const favor = Number(consort.stats.favor ?? 0);
        return favor >= tier.range[0] && favor <= tier.range[1];
      })
      .sort((left, right) => {
        const favorDelta = Number(right.consort.stats.favor ?? 0) - Number(left.consort.stats.favor ?? 0);
        if (favorDelta !== 0) {
          return favorDelta;
        }
        return Number(right.consort.stats.prestige ?? 0) - Number(left.consort.stats.prestige ?? 0);
      });

    matchingIndexes.slice(availableCount).forEach(({ consort, index }) => {
      nextRoster[index] = normalizeConcubineProfile({
        ...consort,
        stats: {
          ...consort.stats,
          favor: clamp(tier.demoteTo, PLAYER_FAVOR_RANGE[0], PLAYER_FAVOR_RANGE[1]),
        },
      });
    });
  }

  return nextRoster;
};

const ROUTE_FIXED_CONSORTS: Record<RouteId, readonly ConcubineSeed[]> = {
  lanyinxuguo: numericFixedConsortSeeds.filter((seed) => seed.routeScope === 'lanyinxuguo') as readonly ConcubineSeed[],
  fushengrumeng: numericFixedConsortSeeds.filter((seed) => seed.routeScope === 'fushengrumeng') as readonly ConcubineSeed[],
  yingluoyeting: numericFixedConsortSeeds.filter((seed) => seed.routeScope === 'yingluoyeting') as readonly ConcubineSeed[],
  chenyuansucuo: numericFixedConsortSeeds.filter((seed) => seed.routeScope === 'chenyuansucuo') as readonly ConcubineSeed[],
};

const SPECIAL_START_CONSORTS: readonly ConcubineSeed[] = numericFixedConsortSeeds.filter(
  (seed) => seed.routeScope === 'all',
) as readonly ConcubineSeed[];
const GENERATED_CONSORT_TEMPLATES_FROM_CSV =
  numericGeneratedConsortTemplates as readonly unknown[] as readonly GeneratedConcubineTemplate[];
const TARGET_LIVE_CONSORT_COUNT = getGeneratedConsortRuleValue('target_live_consort_count');

const createSeededRandom = (seedSource: string): (() => number) => {
  let seed = 0;
  for (let index = 0; index < seedSource.length; index += 1) {
    seed = (seed * 31 + seedSource.charCodeAt(index)) >>> 0;
  }

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
};

const jitterStat = (value: number, random: () => number, spread: number, min: number, max: number): number =>
  clamp(value + Math.round((random() - 0.5) * spread * 2), min, max);

const pickOne = <T,>(items: readonly T[], random: () => number): T =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))];

const shuffle = <T,>(items: readonly T[], random: () => number): T[] => {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
};

const createConcubineFromSeed = (
  seed: ConcubineSeed,
  source: ConcubineProfile['source'],
  idPrefix: string,
  index: number,
): ConcubineProfile => {
  return normalizeConcubineProfile({
    ...seed,
    id: `${idPrefix}-${seed.portraitId}-${index}`,
    source,
    allies: seed.allies ?? [],
    rivals: seed.rivals ?? [],
  });
};

const createGeneratedConcubine = (
  template: GeneratedConcubineTemplate,
  routeId: RouteId,
  random: () => number,
  index: number,
): ConcubineProfile => {
  const age = clamp(
    template.ageRange[0] + Math.floor(random() * (template.ageRange[1] - template.ageRange[0] + 1)),
    getGeneratedConsortRuleValue('age_min'),
    getGeneratedConsortRuleValue('age_max'),
  );
  const rankLabel = pickOne(template.possibleRanks, random);
  const favor = jitterStat(
    template.stats.favor,
    random,
    getGeneratedConsortRuleValue('jitter_favor'),
    PLAYER_FAVOR_RANGE[0],
    PLAYER_FAVOR_RANGE[1],
  );
  const childrenCount =
    template.stats.childrenCount > 0
      ? clamp(
          template.stats.childrenCount + Math.round(random() - getGeneratedConsortRuleValue('children_random_bias')),
          getGeneratedConsortRuleValue('children_min'),
          getGeneratedConsortRuleValue('children_max'),
        )
      : 0;
  return normalizeConcubineProfile({
    id: `generated-${routeId}-${template.portraitId}-${index}`,
    routeScope: routeId,
    portraitId: template.portraitId,
    name: template.name,
    rankLabel,
    status: 'live',
    residence: pickOne(template.possibleResidences, random),
    stateLabel: '寻常',
    age,
    familyBackground: template.familyBackground,
    personality: template.personality,
    summary: template.summary,
    source: 'generated',
    stats: {
      prestige: resolveGeneratedPrestige(rankLabel, random),
      favor,
      familyInfluence: jitterStat(template.stats.familyInfluence, random, getGeneratedConsortRuleValue('jitter_family_influence'), 0, 100),
      health: jitterStat(
        normalizeThousandScaleStat(template.stats.health),
        random,
        getGeneratedConsortRuleValue('jitter_health'),
        PLAYER_HEALTH_RANGE[0],
        PLAYER_HEALTH_RANGE[1],
      ),
      appearance: jitterStat(
        normalizeThousandScaleStat(template.stats.appearance),
        random,
        getGeneratedConsortRuleValue('jitter_appearance'),
        PLAYER_APPEARANCE_RANGE[0],
        PLAYER_APPEARANCE_RANGE[1],
      ),
      relationToPlayer: jitterStat(
        template.stats.relationToPlayer,
        random,
        getGeneratedConsortRuleValue('jitter_relation_to_player'),
        getGeneratedConsortRuleValue('relation_to_player_min'),
        getGeneratedConsortRuleValue('relation_to_player_max'),
      ),
      childrenCount,
      ambition: jitterStat(
        template.stats.ambition,
        random,
        getGeneratedConsortRuleValue('jitter_ambition'),
        PLAYER_AMBITION_RANGE[0],
        PLAYER_AMBITION_RANGE[1],
      ),
      stress: jitterStat(
        template.stats.stress,
        random,
        getGeneratedConsortRuleValue('jitter_stress'),
        PLAYER_STRESS_RANGE[0],
        PLAYER_STRESS_RANGE[1],
      ),
      intrigue: jitterStat(
        normalizeThousandScaleStat(template.stats.intrigue),
        random,
        getGeneratedConsortRuleValue('jitter_intrigue'),
        PLAYER_INTRIGUE_RANGE[0],
        PLAYER_INTRIGUE_RANGE[1],
      ),
      temperament: jitterStat(
        normalizeThousandScaleStat(template.stats.temperament),
        random,
        getGeneratedConsortRuleValue('jitter_temperament'),
        PLAYER_TEMPERAMENT_RANGE[0],
        PLAYER_TEMPERAMENT_RANGE[1],
      ),
      affection: jitterStat(template.stats.affection, random, getGeneratedConsortRuleValue('jitter_affection'), 0, 100),
      fortune: jitterStat(
        template.stats.fortune,
        random,
        getGeneratedConsortRuleValue('jitter_fortune'),
        PLAYER_FORTUNE_RANGE[0],
        PLAYER_FORTUNE_RANGE[1],
      ),
    },
    allies: [],
    rivals: [],
  });
};

const attachRelations = (roster: ConcubineProfile[]): ConcubineProfile[] => {
  const livePool = roster.filter((item) => item.status === 'live');
  const fallbackPool = roster;

  return roster.map((item, index) => {
    const pool = (livePool.length > 1 ? livePool : fallbackPool).filter((other) => other.id !== item.id);
    if (pool.length === 0) {
      return item;
    }

    const allies =
      item.allies.length > 0
        ? item.allies.slice(0, 3)
        : [pool[index % pool.length]?.name, pool[(index + 2) % pool.length]?.name].filter(
            (value, currentIndex, array): value is string => Boolean(value) && array.indexOf(value) === currentIndex,
          );

    const rivals =
      item.rivals.length > 0
        ? item.rivals.slice(0, 3)
        : [pool[(index + 1) % pool.length]?.name, pool[(index + 3) % pool.length]?.name]
            .filter((value): value is string => Boolean(value) && !allies.includes(value))
            .slice(0, 2);

    return {
      ...item,
      allies,
      rivals,
    };
  });
};

const normalizeCustomConsort = (consort: ConcubineProfile, index: number): ConcubineProfile => {
  return normalizeConcubineProfile({
    ...consort,
    id: consort.id || `custom-${consort.portraitId}-${index}`,
    source: 'custom',
    status: consort.status ?? 'live',
    stateLabel: consort.stateLabel || '寻常',
    allies: consort.allies ?? [],
    rivals: consort.rivals ?? [],
    isCustomConsort: true,
    customSource: consort.customSource ?? 'player',
  });
};

export const getConcubinePortraitPath = (portraitId: string): string => {
  const filename = WOMEN_ASSET_FILENAME_BY_ID[portraitId as keyof typeof WOMEN_ASSET_FILENAME_BY_ID] ?? CONSORT_PORTRAIT_FALLBACK_FILENAME;
  return `${WOMEN_ASSET_BASE_PATH}${filename}`;
};

export const getConcubineListLabel = (consort: ConcubineProfile): string => {
  return `${getConcubineDisplayRankText(consort)} ${consort.name}`;
};

export const getConcubineSortWeight = (consort: ConcubineProfile): number => {
  if (consort.status === 'deceased') {
    return consort.stats.prestige;
  }
  if (consort.status === 'limbo') {
    return consort.stats.intrigue;
  }
  const displayRank = getConcubineDisplayRankText(consort);
  const rankRule = getPrestigeRuleByRankLabel(displayRank);
  return (rankRule?.weight ?? 0) * 100 + Number(consort.stats.prestige ?? 0);
};

export const buildInitialConcubineRoster = (
  routeId: RouteId,
  customConsorts: ConcubineProfile[] = [],
  occupiedFavorValues: readonly number[] = [],
): ConcubineProfile[] => {
  const random = createSeededRandom(`concubine-roster:${routeId}`);
  const fixed = ROUTE_FIXED_CONSORTS[routeId].map((seed, index) => createConcubineFromSeed(seed, 'fixed', routeId, index));
  const specials = SPECIAL_START_CONSORTS.map((seed, index) => createConcubineFromSeed(seed, 'fixed', 'special', index));
  const usedPortraitIds = new Set([...fixed, ...specials].map((item) => item.portraitId));
  const generatedTemplates = shuffle(
    GENERATED_CONSORT_TEMPLATES_FROM_CSV.filter(
      (template) => !usedPortraitIds.has(template.portraitId) && isConcubineRosterMember(template),
    ),
    random,
  ).slice(0, Math.max(0, TARGET_LIVE_CONSORT_COUNT - fixed.filter((consort) => consort.status === 'live').length));

  const generated = generatedTemplates.map((template, index) => createGeneratedConcubine(template, routeId, random, index));
  const availableCustomConsorts = customConsorts
    .filter((consort) => !consort.routeScope || consort.routeScope === 'all' || consort.routeScope === routeId)
    .filter((consort) => isConcubineRosterMember(consort))
    .map((consort, index) => normalizeCustomConsort(consort, index));

  const roster = [...fixed, ...specials, ...generated, ...availableCustomConsorts].filter(isConcubineRosterMember);
  return attachRelations(assignLimitedNineConsortRanks(enforceConcubineFavorTierCaps(roster, occupiedFavorValues)));
};

export const sortConcubinesByStatus = (
  concubines: ConcubineProfile[],
  status: ConcubineStatus,
): ConcubineProfile[] =>
  [...concubines]
    .filter((consort) => consort.status === status && isConcubineRosterMember(consort))
    .sort((left, right) => getConcubineSortWeight(right) - getConcubineSortWeight(left));
