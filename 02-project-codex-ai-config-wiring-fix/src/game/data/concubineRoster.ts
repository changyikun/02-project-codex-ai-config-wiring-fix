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
  PRESTIGE_RANGE,
  STRESS_THRESHOLD_LIFESPAN_LOSS,
  getFavorTierByValue,
  type FavorTierDefinition,
} from '../../config/constants';
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
  | '连翘'
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
  '连翘',
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
const quietConsortFallbackFilename = 'feizi1.png';
const lyricalConsortFallbackFilename = 'yueshi.png';

const WOMEN_ASSET_FILENAME_BY_ID: Partial<Record<WomenPortraitId | '阿翎' | '太后' | '杜娘' | '娇娇' | '方瑶', string>> = {
  花棠: 'feizi2.png',
  姜芷: 'feizi1.png',
  方瑶: '鏂圭憲.png',
  连翘: 'yueshi.png',
  阿翎: 'aling.jpg',
  太后: 'taihou.png',
  杜娘: 'du-niang.jpg',
  娇娇: 'jiaojiao.png',

  陈妙仪: quietConsortFallbackFilename,
  陈婉宁: 'chenwanning.png',
  崔令蓉: CONSORT_PORTRAIT_FALLBACK_FILENAME,
  崔莺莺: CONSORT_PORTRAIT_FALLBACK_FILENAME,
  杜若蘅: quietConsortFallbackFilename,
  冯妙莲: quietConsortFallbackFilename,
  顾雨杏: lyricalConsortFallbackFilename,
  江晚晚: quietConsortFallbackFilename,
  李若瑶: quietConsortFallbackFilename,
  柳仪芳: lyricalConsortFallbackFilename,
  年欣兰: CONSORT_PORTRAIT_FALLBACK_FILENAME,
  裴静姝: quietConsortFallbackFilename,
  容可儿: lyricalConsortFallbackFilename,
  沈妙清: quietConsortFallbackFilename,
  水兰婷: CONSORT_PORTRAIT_FALLBACK_FILENAME,
  孙玉娥: quietConsortFallbackFilename,
  姚铃儿: CONSORT_PORTRAIT_FALLBACK_FILENAME,
  叶琳珊: CONSORT_PORTRAIT_FALLBACK_FILENAME,
  虞秋池: quietConsortFallbackFilename,
  程雪砚: quietConsortFallbackFilename,
  阿史那明珠: CONSORT_PORTRAIT_FALLBACK_FILENAME,
  闻人照月: lyricalConsortFallbackFilename,
  周怜星: quietConsortFallbackFilename,
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

const CONCUBINE_PRESTIGE_RULES: readonly ConcubineRankRule[] = [
  { rankLabel: '皇后', minPrestige: 2500, maxPrestige: PRESTIGE_RANGE[1], paletteKey: 'sovereign', weight: 180 },
  { rankLabel: '皇贵妃', minPrestige: 2400, maxPrestige: 2499, paletteKey: 'sovereign', weight: 172 },
  { rankLabel: '贵妃', minPrestige: 2100, maxPrestige: 2399, paletteKey: 'high', weight: 166 },
  { rankLabel: '淑妃', minPrestige: 1800, maxPrestige: 2099, paletteKey: 'high', weight: 160 },
  { rankLabel: '德妃', minPrestige: 1800, maxPrestige: 2099, paletteKey: 'high', weight: 160 },
  { rankLabel: '贤妃', minPrestige: 1800, maxPrestige: 2099, paletteKey: 'high', weight: 160 },
  { rankLabel: '妃', minPrestige: 1500, maxPrestige: 1799, paletteKey: 'high', weight: 152 },
  { rankLabel: '昭仪', minPrestige: 1300, maxPrestige: 1499, paletteKey: 'high', weight: 146 },
  { rankLabel: '昭容', minPrestige: 1200, maxPrestige: 1299, paletteKey: 'high', weight: 142 },
  { rankLabel: '贵嫔', minPrestige: 1100, maxPrestige: 1199, paletteKey: 'high', weight: 138 },
  { rankLabel: '婕妤', minPrestige: 900, maxPrestige: 1099, paletteKey: 'middle', weight: 130 },
  { rankLabel: '容华', minPrestige: 750, maxPrestige: 899, paletteKey: 'middle', weight: 122 },
  { rankLabel: '嫔', minPrestige: 600, maxPrestige: 749, paletteKey: 'middle', weight: 116 },
  { rankLabel: '贵人', minPrestige: 450, maxPrestige: 599, paletteKey: 'low', weight: 108 },
  { rankLabel: '美人', minPrestige: 350, maxPrestige: 449, paletteKey: 'low', weight: 102 },
  { rankLabel: '才人', minPrestige: 250, maxPrestige: 349, paletteKey: 'low', weight: 96 },
  { rankLabel: '常在', minPrestige: 200, maxPrestige: 249, paletteKey: 'base', weight: 90 },
  { rankLabel: '御女', minPrestige: 150, maxPrestige: 199, paletteKey: 'base', weight: 88 },
  { rankLabel: '选侍', minPrestige: 100, maxPrestige: 149, paletteKey: 'base', weight: 86 },
  { rankLabel: '答应', minPrestige: 60, maxPrestige: 99, paletteKey: 'base', weight: 84 },
  { rankLabel: '更衣', minPrestige: 30, maxPrestige: 59, paletteKey: 'base', weight: 82 },
  { rankLabel: '官女子', minPrestige: 0, maxPrestige: 29, paletteKey: 'base', weight: 80 },
  { rankLabel: '庶人', minPrestige: PRESTIGE_RANGE[0], maxPrestige: -1, paletteKey: 'base', weight: 20 },
] as const;

const canonicalRanks = [
  '皇后',
  '皇贵妃',
  '贵妃',
  '淑妃',
  '德妃',
  '贤妃',
  '妃',
  '昭仪',
  '昭容',
  '贵嫔',
  '婕妤',
  '容华',
  '嫔',
  '贵人',
  '美人',
  '才人',
  '常在',
  '御女',
  '选侍',
  '答应',
  '更衣',
  '官女子',
  '庶人',
] as const;

const liveStatusIllHealthThreshold = getGeneratedConsortRuleValue('live_status_ill_health_threshold');
// Special NPCs and authority figures should never be treated as concubine-list members.
const NON_CONCUBINE_NAMES = new Set(['布自游', '卢安平', '当一', '杜娘', '娇娇', '简宁', '连翘']);
const NON_CONCUBINE_PATTERNS = [/太后/];

const getRosterIdentityTokens = (entity: { name: string; portraitId: string }): string[] =>
  [String(entity.name ?? '').trim(), String(entity.portraitId ?? '').trim()].filter((token) => token.length > 0);

const isConcubineRosterMember = (entity: { name: string; portraitId: string }): boolean =>
  getRosterIdentityTokens(entity).every(
    (token) => !NON_CONCUBINE_NAMES.has(token) && !NON_CONCUBINE_PATTERNS.some((pattern) => pattern.test(token)),
  );

const getCanonicalRankLabel = (label: string): string => {
  const normalized = String(label ?? '').trim();
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
  const matchedRule = CONCUBINE_PRESTIGE_RULES.find((rule) => prestige >= rule.minPrestige && prestige <= rule.maxPrestige);
  if (!matchedRule) {
    return CONCUBINE_PRESTIGE_RULES[CONCUBINE_PRESTIGE_RULES.length - 1];
  }

  const preferredRule = preferredRankLabel ? getPrestigeRuleByRankLabel(preferredRankLabel) : undefined;
  if (
    preferredRule &&
    preferredRule.minPrestige === matchedRule.minPrestige &&
    preferredRule.maxPrestige === matchedRule.maxPrestige
  ) {
    return preferredRule;
  }

  return matchedRule;
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
  return attachRelations(enforceConcubineFavorTierCaps(roster, occupiedFavorValues));
};

export const sortConcubinesByStatus = (
  concubines: ConcubineProfile[],
  status: ConcubineStatus,
): ConcubineProfile[] =>
  [...concubines]
    .filter((consort) => consort.status === status && isConcubineRosterMember(consort))
    .sort((left, right) => getConcubineSortWeight(right) - getConcubineSortWeight(left));
