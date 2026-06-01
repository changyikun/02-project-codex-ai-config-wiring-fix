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
  | '虞秋池';

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
const CONSORT_PORTRAIT_FALLBACK_FILENAME = '鑺辨.png';
const quietConsortFallbackFilename = '濮滆姺.png';
const lyricalConsortFallbackFilename = 'lianqiao.jpg';

const WOMEN_ASSET_FILENAME_BY_ID: Partial<Record<WomenPortraitId | '阿翎' | '太后' | '杜娘' | '娇娇' | '方瑶', string>> = {
  花棠: '鑺辨.png',
  姜芷: '濮滆姺.png',
  方瑶: '鏂圭憲.png',
  连翘: 'lianqiao.jpg',
  阿翎: 'aling.jpg',
  太后: 'taihou-cutout.png',
  杜娘: 'du-niang.jpg',
  娇娇: 'jiaojiao.jpg',

  陈妙仪: quietConsortFallbackFilename,
  陈婉宁: quietConsortFallbackFilename,
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

const liveStatusIllHealthThreshold = 400;
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
  lanyinxuguo: [
    {
      routeScope: 'lanyinxuguo',
      portraitId: '姚铃儿',
    name: '姚铃儿',
      rankLabel: '贵妃',
      status: 'live',
      residence: '长春宫主殿',
      stateLabel: '寻常',
      age: 19,
      familyBackground: '三品文官嫡女',
      personality: '骄矜、好胜、重脸面、嫉妒、权位',
      summary: '贵妃，十九岁，三品文官嫡女，得宠而高傲，极重体面。她与皇帝有旧情，前期把后宫权位看得极重，中后期也可能因敬重或利益而重整立场。',
      stats: {
        prestige: 2180,
        favor: 72,
        familyInfluence: 86,
        health: 720,
        appearance: 860,
        relationToPlayer: -20,
        childrenCount: 1,
        ambition: 48,
        stress: 32,
        intrigue: 780,
        temperament: 780,
        affection: 0,
        fortune: 8,
      },
    },
    {
      routeScope: 'lanyinxuguo',
      portraitId: '江晚晚',
      name: '江晚晚',
      rankLabel: '淑妃',
      status: 'live',
      residence: '钟粹宫主殿',
      stateLabel: '寻常',
      age: 22,
      familyBackground: '四品文官庶女',
      personality: '清醒、克制、守密、温柔、敏锐',
      summary: '淑妃，二十二岁，四品文官庶女，端方从容，知礼寡言。她早已看透帝王与宫闱本质，擅守秘密，也最难被寻常示好撬开真心。',
      stats: {
        prestige: 1860,
        favor: 48,
        familyInfluence: 70,
        health: 690,
        appearance: 760,
        relationToPlayer: 12,
        childrenCount: 0,
        ambition: 22,
        stress: 18,
        intrigue: 860,
        temperament: 880,
        affection: 0,
        fortune: 16,
      },
    },
    {
      routeScope: 'lanyinxuguo',
      portraitId: '柳仪芳',
      name: '柳仪芳',
      rankLabel: '美人',
      status: 'live',
      residence: '延禧宫东偏殿',
      stateLabel: '寻常',
      age: 18,
      familyBackground: '商贾之女',
      personality: '温顺、钦慕、主动、体贴、敏感',
      summary: '美人，十八岁，商贾之女，表面安静知趣。她对情感与自我认同都格外敏感，常把温顺与体贴藏在最细微的照拂里。',
      stats: {
        prestige: 390,
        favor: 56,
        familyInfluence: 42,
        health: 640,
        appearance: 830,
        relationToPlayer: 45,
        childrenCount: 0,
        ambition: 14,
        stress: 24,
        intrigue: 520,
        temperament: 690,
        affection: 30,
        fortune: 12,
      },
    },
  ],
  fushengrumeng: [
    {
      routeScope: 'fushengrumeng',
      portraitId: '年欣兰',
      name: '年欣兰',
      rankLabel: '妃',
      status: 'live',
      residence: '启祥宫主殿',
      stateLabel: '寻常',
      age: 20,
      familyBackground: '四品武将嫡女',
      personality: '傲娇、嘴硬、嫉妒、试探、不服软',
      summary: '妃位，二十岁，四品武将嫡女，最爱拿规矩压人，看似总在挑刺，实则把旧友、脸面与不肯认输都压在心口。',
      stats: {
        prestige: 1580,
        favor: 49,
        familyInfluence: 74,
        health: 730,
        appearance: 780,
        relationToPlayer: -8,
        childrenCount: 0,
        ambition: 24,
        stress: 20,
        intrigue: 610,
        temperament: 760,
        affection: 0,
        fortune: 10,
      },
    },
    {
      routeScope: 'fushengrumeng',
      portraitId: '沈妙清',
      name: '沈妙清',
      rankLabel: '常在',
      status: 'live',
      residence: '储秀宫东偏殿',
      stateLabel: '寻常',
      age: 15,
      familyBackground: '六品武将嫡女',
      personality: '清冷、护短、跟随、寡言、认死理',
      summary: '常在，十五岁，六品武将嫡女，表面安静冷淡，骨子里却极护短。她入宫后的许多选择都系在旧情旧义上，也最容易在风浪里同人并肩。',
      stats: {
        prestige: 215,
        favor: 22,
        familyInfluence: 58,
        health: 710,
        appearance: 700,
        relationToPlayer: 78,
        childrenCount: 0,
        ambition: 6,
        stress: 14,
        intrigue: 430,
        temperament: 750,
        affection: 52,
        fortune: 20,
      },
    },
  ],
  yingluoyeting: [
    {
      routeScope: 'yingluoyeting',
      portraitId: '陈婉宁',
      name: '陈婉宁',
      rankLabel: '妃',
      status: 'live',
      residence: '昭阳宫主殿',
      stateLabel: '寻常',
      age: 20,
      familyBackground: '二品文官庶女',
      personality: '端方、克制、温柔、封口、动摇',
      summary: '妃位，二十岁，二品文官庶女，说话得体，也最懂分寸。她知晓旧案与旧债，却总把真正的摇摆、心软与背离都藏在温柔之后。',
      stats: {
        prestige: 1680,
        favor: 58,
        familyInfluence: 78,
        health: 760,
        appearance: 810,
        relationToPlayer: 0,
        childrenCount: 0,
        ambition: 46,
        stress: 22,
        intrigue: 900,
        temperament: 840,
        affection: 0,
        fortune: 6,
      },
    },
  ],
  chenyuansucuo: [
    {
      routeScope: 'chenyuansucuo',
      portraitId: '裴静姝',
      name: '杜云嫣',
      rankLabel: '贵嫔',
      status: 'live',
      residence: '永和宫主殿',
      stateLabel: '寻常',
      age: 19,
      familyBackground: '江南名门嫡女',
      personality: '娇气、病弱、依赖、体贴、成全',
      summary: '贵嫔，十九岁，江南名门嫡女，娇气怕苦，也最怕冷。她身体一向不好，因此格外贪恋陪伴，最终却往往把不舍都化作成全。',
      stats: {
        prestige: 1180,
        favor: 44,
        familyInfluence: 78,
        health: 420,
        appearance: 820,
        relationToPlayer: 32,
        childrenCount: 1,
        ambition: 8,
        stress: 26,
        intrigue: 420,
        temperament: 870,
        affection: 10,
        fortune: 18,
      },
    },
  ],
};

const SPECIAL_START_CONSORTS: readonly ConcubineSeed[] = [
  {
    routeScope: 'all',
    portraitId: '杜若蘅',
    name: '杜若蘅',
    rankLabel: '庶人',
    status: 'limbo',
    residence: '冷宫北院',
    stateLabel: '冷宫',
    age: 21,
    familyBackground: '清流寒门女',
    personality: '寡言清醒',
    summary: '昔年也曾得宠，如今被废入冷宫，只剩一身清明和旧账。',
    stats: {
      prestige: 22,
      favor: 8,
      familyInfluence: 34,
      health: 57,
      appearance: 68,
      relationToPlayer: 14,
      childrenCount: 0,
      ambition: 41,
      stress: 67,
      intrigue: 63,
      temperament: 74,
      affection: 6,
      fortune: 35,
    },
  },
  {
    routeScope: 'all',
    portraitId: '崔莺莺',
    name: '崔莺莺',
    rankLabel: '庶人',
    status: 'limbo',
    residence: '冷宫西偏院',
    stateLabel: '冷宫',
    age: 23,
    familyBackground: '罪臣家眷',
    personality: '偏执刚烈',
    summary: '一朝失势后再不肯低头，眼底只剩被废前后的因果。',
    stats: {
      prestige: 14,
      favor: 0,
      familyInfluence: 16,
      health: 48,
      appearance: 62,
      relationToPlayer: -22,
      childrenCount: 0,
      ambition: 53,
      stress: 79,
      intrigue: 66,
      temperament: 58,
      affection: 0,
      fortune: 22,
    },
  },
  {
    routeScope: 'all',
    portraitId: '冯妙莲',
    name: '冯妙莲',
    rankLabel: '嫔',
    posthumousTitle: '悼嫔',
    status: 'deceased',
    residence: '旧居披香殿',
    stateLabel: '已逝',
    age: 20,
    familyBackground: '太医院世家女',
    personality: '温柔敏慧',
    summary: '谥号仍在，旧居亦在，宫里关于她的旧事却始终没有真正散尽。',
    stats: {
      prestige: 58,
      favor: 46,
      familyInfluence: 60,
      health: 0,
      appearance: 85,
      relationToPlayer: 0,
      childrenCount: 0,
      ambition: 37,
      stress: 0,
      intrigue: 48,
      temperament: 86,
      affection: 0,
      fortune: 44,
    },
  },
];

const GENERATED_CONSORT_TEMPLATES: readonly GeneratedConcubineTemplate[] = [
  {
    portraitId: '陈妙仪',
    name: '陈妙仪',
    familyBackground: '画院供奉之女',
    personality: '清疏自持',
    summary: '擅丹青，最懂如何把情绪藏进笑意和笔墨之间。',
    ageRange: [16, 20],
    possibleRanks: ['美人', '才人', '贵人'],
    possibleResidences: ['披香殿东偏殿', '临华殿西偏殿', '永宁宫西偏殿'],
    stats: {
      prestige: 58,
      favor: 41,
      familyInfluence: 46,
      health: 69,
      appearance: 80,
      relationToPlayer: 8,
      childrenCount: 0,
      ambition: 49,
      stress: 26,
      intrigue: 56,
      temperament: 84,
      affection: 16,
      fortune: 60,
    },
  },
  {
    portraitId: '花棠',
    name: '花棠',
    familyBackground: '南曲名伶抬籍',
    personality: '明媚轻狂',
    summary: '进退都像唱词，越是人多的地方，她越显得光彩夺目。',
    ageRange: [17, 21],
    possibleRanks: ['贵人', '美人', '才人'],
    possibleResidences: ['昭华殿西偏殿', '长春宫东偏殿', '玉清宫东偏殿'],
    stats: {
      prestige: 62,
      favor: 56,
      familyInfluence: 38,
      health: 72,
      appearance: 91,
      relationToPlayer: -10,
      childrenCount: 0,
      ambition: 61,
      stress: 29,
      intrigue: 47,
      temperament: 79,
      affection: 22,
      fortune: 58,
    },
  },
  {
    portraitId: '姜芷',
    name: '姜芷',
    familyBackground: '太医院旁支医女',
    personality: '沉静耐心',
    summary: '看诊时比谁都温和，轮到自己谋算时却从不手软。',
    ageRange: [18, 22],
    possibleRanks: ['贵人', '常在', '美人'],
    possibleResidences: ['永和宫东偏殿', '钟粹宫西偏殿', '临华殿东偏殿'],
    stats: {
      prestige: 54,
      favor: 35,
      familyInfluence: 44,
      health: 86,
      appearance: 72,
      relationToPlayer: 18,
      childrenCount: 0,
      ambition: 42,
      stress: 19,
      intrigue: 64,
      temperament: 75,
      affection: 12,
      fortune: 67,
    },
  },
  {
    portraitId: '李若瑶',
    name: '李若瑶',
    familyBackground: '礼部侍郎嫡女',
    personality: '端肃守矩',
    summary: '在规矩里长大，也最擅借规矩钳制旁人。',
    ageRange: [17, 22],
    possibleRanks: ['嫔', '贵人', '婕妤'],
    possibleResidences: ['永宁宫主殿', '昭阳宫东偏殿', '启祥宫东偏殿'],
    stats: {
      prestige: 68,
      favor: 44,
      familyInfluence: 78,
      health: 70,
      appearance: 76,
      relationToPlayer: -5,
      childrenCount: 1,
      ambition: 58,
      stress: 31,
      intrigue: 69,
      temperament: 83,
      affection: 15,
      fortune: 52,
    },
  },
  {
    portraitId: '连翘',
    name: '连翘',
    familyBackground: '御前女官抬位',
    personality: '灵巧细致',
    summary: '看着总是笑意盈盈，可每一眼都落在最要紧的地方。',
    ageRange: [16, 20],
    possibleRanks: ['才人', '美人', '常在'],
    possibleResidences: ['玉清宫西偏殿', '延禧宫东偏殿', '临华殿西偏殿'],
    stats: {
      prestige: 52,
      favor: 39,
      familyInfluence: 35,
      health: 71,
      appearance: 77,
      relationToPlayer: 22,
      childrenCount: 0,
      ambition: 47,
      stress: 24,
      intrigue: 58,
      temperament: 81,
      affection: 19,
      fortune: 69,
    },
  },
  {
    portraitId: '容可儿',
    name: '容可儿',
    familyBackground: '商贾义女',
    personality: '甜软机敏',
    summary: '最会看人下菜碟，一张笑脸能哄住半个宫。',
    ageRange: [16, 19],
    possibleRanks: ['美人', '贵人', '才人'],
    possibleResidences: ['昭华殿东偏殿', '启祥宫西偏殿', '钟粹宫西偏殿'],
    stats: {
      prestige: 50,
      favor: 34,
      familyInfluence: 42,
      health: 74,
      appearance: 82,
      relationToPlayer: 16,
      childrenCount: 0,
      ambition: 55,
      stress: 22,
      intrigue: 63,
      temperament: 71,
      affection: 14,
      fortune: 74,
    },
  },
  {
    portraitId: '水兰婷',
    name: '水兰婷',
    familyBackground: '边地贡女',
    personality: '冷艳寡言',
    summary: '平日里话少，动起念头来却极果断，很少给人第二次机会。',
    ageRange: [18, 22],
    possibleRanks: ['贵人', '嫔', '美人'],
    possibleResidences: ['永和宫主殿', '长春宫西偏殿', '启祥宫东偏殿'],
    stats: {
      prestige: 66,
      favor: 46,
      familyInfluence: 58,
      health: 80,
      appearance: 88,
      relationToPlayer: -12,
      childrenCount: 0,
      ambition: 72,
      stress: 35,
      intrigue: 74,
      temperament: 78,
      affection: 13,
      fortune: 45,
    },
  },
  {
    portraitId: '孙玉娥',
    name: '孙玉娥',
    familyBackground: '工部郎中庶女',
    personality: '务实隐忍',
    summary: '宫里的账、人情和短长，她都记得很牢，从不白白吃亏。',
    ageRange: [18, 23],
    possibleRanks: ['常在', '贵人', '才人'],
    possibleResidences: ['临华殿主殿', '延禧宫西偏殿', '玉清宫东偏殿'],
    stats: {
      prestige: 48,
      favor: 27,
      familyInfluence: 51,
      health: 68,
      appearance: 70,
      relationToPlayer: 11,
      childrenCount: 1,
      ambition: 57,
      stress: 28,
      intrigue: 67,
      temperament: 64,
      affection: 10,
      fortune: 57,
    },
  },
  {
    portraitId: '叶琳珊',
    name: '叶琳珊',
    familyBackground: '旧勋门第嫡女',
    personality: '傲气清贵',
    summary: '门第好，气性也高，最看不起靠取巧上位的人。',
    ageRange: [17, 21],
    possibleRanks: ['婕妤', '贵人', '嫔'],
    possibleResidences: ['昭阳宫西偏殿', '永宁宫东偏殿', '钟粹宫主殿'],
    stats: {
      prestige: 72,
      favor: 43,
      familyInfluence: 82,
      health: 75,
      appearance: 79,
      relationToPlayer: -9,
      childrenCount: 0,
      ambition: 64,
      stress: 33,
      intrigue: 60,
      temperament: 85,
      affection: 18,
      fortune: 51,
    },
  },
  {
    portraitId: '虞秋池',
    name: '虞秋池',
    familyBackground: '地方守臣嫡女',
    personality: '沉静孤高',
    summary: '极少主动亲近谁，偏偏越是如此，越容易让人记住。',
    ageRange: [18, 22],
    possibleRanks: ['嫔', '贵人', '美人'],
    possibleResidences: ['昭华殿主殿', '启祥宫西偏殿', '长春宫东偏殿'],
    stats: {
      prestige: 70,
      favor: 40,
      familyInfluence: 75,
      health: 77,
      appearance: 84,
      relationToPlayer: -3,
      childrenCount: 0,
      ambition: 69,
      stress: 30,
      intrigue: 72,
      temperament: 87,
      affection: 12,
      fortune: 50,
    },
  },
];

const GENERATED_CONSORT_COUNT = 5;

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
    15,
    23,
  );
  const rankLabel = pickOne(template.possibleRanks, random);
  const favor = jitterStat(template.stats.favor, random, 10, PLAYER_FAVOR_RANGE[0], PLAYER_FAVOR_RANGE[1]);
  const childrenCount =
    template.stats.childrenCount > 0 ? clamp(template.stats.childrenCount + Math.round(random() - 0.45), 0, 3) : 0;
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
      familyInfluence: jitterStat(template.stats.familyInfluence, random, 6, 0, 100),
      health: jitterStat(normalizeThousandScaleStat(template.stats.health), random, 55, PLAYER_HEALTH_RANGE[0], PLAYER_HEALTH_RANGE[1]),
      appearance: jitterStat(
        normalizeThousandScaleStat(template.stats.appearance),
        random,
        55,
        PLAYER_APPEARANCE_RANGE[0],
        PLAYER_APPEARANCE_RANGE[1],
      ),
      relationToPlayer: clamp(template.stats.relationToPlayer + Math.round((random() - 0.5) * 20), -100, 100),
      childrenCount,
      ambition: jitterStat(template.stats.ambition, random, 10, PLAYER_AMBITION_RANGE[0], PLAYER_AMBITION_RANGE[1]),
      stress: jitterStat(template.stats.stress, random, 12, PLAYER_STRESS_RANGE[0], PLAYER_STRESS_RANGE[1]),
      intrigue: jitterStat(
        normalizeThousandScaleStat(template.stats.intrigue),
        random,
        55,
        PLAYER_INTRIGUE_RANGE[0],
        PLAYER_INTRIGUE_RANGE[1],
      ),
      temperament: jitterStat(
        normalizeThousandScaleStat(template.stats.temperament),
        random,
        50,
        PLAYER_TEMPERAMENT_RANGE[0],
        PLAYER_TEMPERAMENT_RANGE[1],
      ),
      affection: jitterStat(template.stats.affection, random, 12, 0, 100),
      fortune: jitterStat(template.stats.fortune, random, 10, PLAYER_FORTUNE_RANGE[0], PLAYER_FORTUNE_RANGE[1]),
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
    GENERATED_CONSORT_TEMPLATES.filter(
      (template) => !usedPortraitIds.has(template.portraitId) && isConcubineRosterMember(template),
    ),
    random,
  ).slice(0, GENERATED_CONSORT_COUNT);

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
