import {
  EndingType,
  type RangeTuple,
  RarityColorId,
  RouteId,
  StoryNodeId,
  type 位分声望条目,
  BanquetTypeId,
  EmperorMoodTierId,
  type 宴会配置,
  PoisonId,
  type 毒药配置,
  type 皇帝心情区间配置,
} from './types';
import {
  getNumericRuleRange,
  getNumericRuleValue,
  getRouteInitialProfileConfig,
  numericFavorTiers,
  numericPrestigeRankTable,
  numericSpecialPrestigeRankTable,
} from '../game/numerics/numericCatalog';
import type { RouteId as GameRouteId } from '../game/types';

/* 本文件数据来源于《游戏架构目录》，版本号 v1.0.0，生成时间 2026-04-17 16:02 */

export const CONFIG_SOURCE_VERSION = 'v1.0.0' as const;
export const CONFIG_GENERATED_AT = '2026-04-17 16:02' as const;

export const RARITY_COLOR_LEGENDARY = '#FF0800' as const;
export const RARITY_COLOR_EPIC = '#E840B2' as const;
export const RARITY_COLOR_RARE = '#7371D8' as const;
export const RARITY_COLOR_COMMON = '#70D1D7' as const;
export const RARITY_COLOR_NEUTRAL = '#7C7B78' as const;

export const RARITY_COLOR_MAP: Record<RarityColorId, string> = {
  [RarityColorId.Legendary]: RARITY_COLOR_LEGENDARY,
  [RarityColorId.Epic]: RARITY_COLOR_EPIC,
  [RarityColorId.Rare]: RARITY_COLOR_RARE,
  [RarityColorId.Common]: RARITY_COLOR_COMMON,
  [RarityColorId.Neutral]: RARITY_COLOR_NEUTRAL,
};

export const TIME_SLOTS = ['清晨', '上午', '中午', '下午', '傍晚', '夜晚', '深夜'] as const;
export const TIME_SLOTS_PER_XUN = TIME_SLOTS.length;
export const XUNS_PER_MONTH = 3 as const;
export const MONTHS_PER_YEAR = 12 as const;

export const AGE_RANGE: RangeTuple = getNumericRuleRange('age_range');
export const PRESTIGE_RANGE: RangeTuple = getNumericRuleRange('prestige_range');
export const PLAYER_SILVER_RANGE: RangeTuple = getNumericRuleRange('player_silver_range');
export const PLAYER_FAVOR_RANGE: RangeTuple = getNumericRuleRange('player_favor_range');
export const PLAYER_FORTUNE_RANGE: RangeTuple = getNumericRuleRange('player_fortune_range');
export const PLAYER_AMBITION_RANGE: RangeTuple = getNumericRuleRange('player_ambition_range');
export const PLAYER_INTRIGUE_RANGE: RangeTuple = getNumericRuleRange('player_intrigue_range');
export const PLAYER_APPEARANCE_RANGE: RangeTuple = getNumericRuleRange('player_appearance_range');
export const PLAYER_TEMPERAMENT_RANGE: RangeTuple = getNumericRuleRange('player_temperament_range');
export const PLAYER_HEALTH_RANGE: RangeTuple = getNumericRuleRange('player_health_range');
export const PLAYER_STRESS_RANGE: RangeTuple = getNumericRuleRange('player_stress_range');

export const EMPEROR_MOOD_RANGE: RangeTuple = [-100, 100] as const;

export const MAIN_ATTRIBUTE_INITIAL_POINTS = getNumericRuleValue('main_attribute_initial_points');
export const MAIN_ATTRIBUTE_MAX_POINTS = getNumericRuleValue('main_attribute_max_points');
export const SECONDARY_ATTRIBUTE_MIN_LEVEL = getNumericRuleValue('secondary_attribute_min_level');
export const SECONDARY_ATTRIBUTE_MAX_LEVEL = getNumericRuleValue('secondary_attribute_max_level');
export const MEDICINE_LEVEL_CAP = getNumericRuleValue('medicine_level_cap');
export const POLITICS_LEVEL_CAP = getNumericRuleValue('politics_level_cap');
export const ADVANCED_ROUTE_POLITICS_LEVEL_CAP = getNumericRuleValue('advanced_route_politics_level_cap');

export const MAIN_ATTRIBUTE_POINT_TO_VALUE_RATIO = getNumericRuleValue('main_attribute_point_to_value_ratio');
export const FORTUNE_POINT_TO_VALUE_RATIO = getNumericRuleValue('fortune_point_to_value_ratio');
export const FORTUNE_ATTRIBUTE_POINT_TO_VALUE_RATIO = getNumericRuleValue('fortune_attribute_point_to_value_ratio');
export const SKILL_LEVEL_TO_VALUE_RATIO = getNumericRuleValue('skill_level_to_value_ratio');

export const FAMILY_BACKGROUND_TOTAL_POINTS_MIN = getNumericRuleValue('family_background_total_points_min');
export const FAMILY_BACKGROUND_TOTAL_POINTS_MAX = getNumericRuleValue('family_background_total_points_max');

export const PLAYER_ACTIONS_PER_XUN = 7 as const;

export const FAVOR_TIER_TABLE = numericFavorTiers.map((tier) => ({
  label: tier.label,
  range: tier.range,
  color: RARITY_COLOR_MAP[tier.colorId],
  maxCount: tier.maxCount,
}));

export type FavorTierDefinition = (typeof FAVOR_TIER_TABLE)[number];

export const getFavorTierByValue = (favor: number): FavorTierDefinition => {
  const normalizedFavor = Math.max(PLAYER_FAVOR_RANGE[0], Math.min(PLAYER_FAVOR_RANGE[1], Number(favor ?? 0)));
  return FAVOR_TIER_TABLE.find((tier) => normalizedFavor >= tier.range[0] && normalizedFavor <= tier.range[1]) ?? FAVOR_TIER_TABLE[0];
};

export const ATTRIBUTE_STAGE_COLORS = [
  { label: '灰', range: [0, 0] as RangeTuple, color: RARITY_COLOR_NEUTRAL },
  { label: '青', range: [1, 20] as RangeTuple, color: RARITY_COLOR_COMMON },
  { label: '蓝', range: [21, 50] as RangeTuple, color: RARITY_COLOR_RARE },
  { label: '紫', range: [51, 80] as RangeTuple, color: RARITY_COLOR_EPIC },
  { label: '红', range: [81, 100] as RangeTuple, color: RARITY_COLOR_LEGENDARY },
] as const;

export const MAIN_ATTRIBUTE_STAGE_TEXT = {
  健康: ['娇柔', '寻常', '康健', '强健', '丰盈'],
  心计: ['天真', '直率', '世故', '深沉', '诡谲'],
  容貌: ['端正', '清丽', '秀美', '国色', '绝色'],
  气质: ['寻常', '恬淡', '灵秀', '绰约', '绝尘'],
} as const;

export const SECONDARY_ATTRIBUTE_STAGE_TEXT = ['不通', '入门', '熟练', '精通', '无双'] as const;

export const EMPEROR_MOOD_TIERS: readonly 皇帝心情区间配置[] = [
  { id: EmperorMoodTierId.Grief, 状态: '悲痛', 区间: [-100, -50] as RangeTuple },
  { id: EmperorMoodTierId.Sad, 状态: '悲伤', 区间: [-49, 0] as RangeTuple },
  { id: EmperorMoodTierId.Low, 状态: '低落', 区间: [1, 20] as RangeTuple },
  { id: EmperorMoodTierId.Normal, 状态: '平常', 区间: [21, 50] as RangeTuple },
  { id: EmperorMoodTierId.Pleasant, 状态: '愉悦', 区间: [51, 70] as RangeTuple },
  { id: EmperorMoodTierId.Joy, 状态: '喜悦', 区间: [71, 100] as RangeTuple },
] as const;

export const EMPEROR_MOOD_RECOVERY_PER_MONTH_WHEN_MOOD_LT_ZERO = 10 as const;
export const EMPEROR_MOOD_RECOVERY_PER_MONTH_WHEN_MOOD_GT_ZERO = 5 as const;
export const EMPEROR_MOOD_LOCK_PROMOTION_MAX = 0 as const;
export const EMPEROR_MOOD_LOCK_MAIN_RANK_MAX = 20 as const;
export const EMPEROR_MOOD_LOCK_EMPRESS_MAX = 50 as const;

export const EMPEROR_SOLO_SLEEP_PROBABILITY_WHEN_MOOD_LT_ZERO = 0.5 as const;
export const EMPEROR_SOLO_SLEEP_PROBABILITY_WHEN_MOOD_GT_ZERO = 0.2 as const;

export const BANQUET_CONFIGS: readonly 宴会配置[] = [
  { id: BanquetTypeId.Simple, 名称: '简单', 每人花费银两: 10, 单妃最大声望收益: 5 },
  { id: BanquetTypeId.Deluxe, 名称: '华美', 每人花费银两: 20, 单妃最大声望收益: 10 },
  { id: BanquetTypeId.Luxury, 名称: '奢侈', 每人花费银两: 40, 单妃最大声望收益: 25 },
] as const;

export const POISON_CONFIGS: readonly 毒药配置[] = [
  { id: PoisonId.Hedandinghong, 名称: '鹤顶红', 价格银两: 500, 效果描述: '下毒成功则目标必死' },
  { id: PoisonId.Shexiang, 名称: '麝香', 价格银两: 250, 效果描述: '下毒成功则必定流产且后续概率不孕不育；10%概率一尸两命' },
  { id: PoisonId.Yunyandan, 名称: '陨颜丹', 价格银两: 150, 效果描述: '下毒成功则容貌与气质必定下降（-250~400）' },
] as const;

export const IMPERIAL_STUDY_ENTRY_BASE_PROBABILITY_RANGE: RangeTuple = [0.2, 0.6] as const;
export const IMPERIAL_STUDY_ENTRY_BRIBE_SILVER = 10 as const;
export const IMPERIAL_STUDY_ENTRY_BRIBE_BONUS_PROBABILITY = 0.25 as const;
export const FOOD_COST_DELICACY_SILVER = 3 as const;
export const FOOD_COST_SNACK_SILVER = 2 as const;
export const FOOD_STAMINA_GAIN_DELICACY = 2 as const;
export const FOOD_STAMINA_GAIN_SNACK = 1 as const;
export const STAMINA_RECOVER_NAP = 3 as const;
export const STRESS_REDUCE_LISTEN_MUSIC = 4 as const;

export const STAMINA_MAX = getNumericRuleValue('stamina_max');
export const STAMINA_INITIAL_PER_XUN = getNumericRuleValue('stamina_initial_per_xun');
export const STAMINA_MIN = getNumericRuleValue('stamina_min');

export const STRESS_THRESHOLD_LIFESPAN_LOSS = 80 as const;
export const LIFESPAN_LOSS_PER_MONTH_WHEN_STRESS_GT_THRESHOLD = 0.2 as const;

export const STRESS_INCREASE_KILL_SEQUENCE = [20, 10, 5] as const;
export const STRESS_INCREASE_KILL_AFTER_THREE = 5 as const;
export const STRESS_INCREASE_RUMOR_OR_FRAME = 3 as const;

export const PREGNANCY_DISABLED_WHEN_FORTUNE_LT = 0 as const;
export const PREGNANCY_MISSCARRIAGE_NEXT_MONTH_WHEN_FORTUNE_LT_ZERO = true as const;

export const MUSIC_SCORE_COMPLETION_REQUIRED_PERCENT = 100 as const;
export const MUSIC_SCORE_PERFECT_THRESHOLD_PERCENT = 150 as const;
export const MUSIC_SCORE_PERFECT_PRESTIGE_REWARD = 30 as const;

export const PALACE_COUNT = 12 as const;
export const PALACE_MAX_RESIDENTS = 6 as const;
export const PALACE_MAIN_HALL_COUNT = 1 as const;
export const PALACE_SIDE_HALL_COUNT = 2 as const;
export const PALACE_MINOR_HALL_COUNT = 3 as const;
export const PALACE_MAIN_HALL_MIN_RANK_NAME = '婕好' as const;
export const PALACE_SIDE_HALL_MIN_RANK_NAME = '美人' as const;

export const HOT_SPRING_MIN_RANK_NAME = '容华' as const;
export const HOT_SPRING_SOLO_STAMINA_RECOVER = 3 as const;
export const HOT_SPRING_SOLO_STRESS_REDUCE = 3 as const;
export const HOT_SPRING_SHARED_AFFECTION_REQUIREMENT = 40 as const;
export const HOT_SPRING_SHARED_FAVORABILITY_REQUIREMENT = 80 as const;
export const HOT_SPRING_SHARED_FAVORABILITY_GAIN = 5 as const;
export const HOT_SPRING_SHARED_AFFECTION_GAIN = 5 as const;
export const HOT_SPRING_SHARED_STRESS_REDUCE = 6 as const;

export const AFFECTION_INTERACTION_WHISPER_STAMINA_COST = 1 as const;
export const AFFECTION_INTERACTION_CLOUD_RAIN_STAMINA_COST = 3 as const;
export const NIGHTLY_SERVICE_STAMINA_COST = 0 as const;
export const NIGHTLY_SERVICE_TRIGGER_SLOT = '夜晚' as const;
export const DEEP_NIGHT_SLOT_AVAILABLE_WHEN_NO_NIGHTLY_SERVICE = true as const;

export const POISONING_FAIL_MAX_INVESTIGATION_XUN = 3 as const;
export const POISONING_CASE_DISMISS_CONVICTION_THRESHOLD_PERCENT = 100 as const;

export const ACTION_STAMINA_RULES = [
  { 行为: '看书', 体力消耗: 1, 时间格消耗: 1 },
  { 行为: '字画', 体力消耗: 1, 时间格消耗: 1 },
  { 行为: '刺绣', 体力消耗: 1, 时间格消耗: 1 },
  { 行为: '调香', 体力消耗: 1, 时间格消耗: 1 },
  { 行为: '乐理', 体力消耗: 2, 时间格消耗: 1 },
  { 行为: '会诊', 体力消耗: 0, 时间格消耗: 1 },
  { 行为: '拜访妃子', 体力消耗: 1, 时间格消耗: 1 },
  { 行为: '口角', 体力消耗: 1, 时间格消耗: 1 },
  { 行为: '外出（寺庙）', 体力消耗: 3, 时间格消耗: 1 },
  { 行为: '系统宫宴', 体力消耗: 0, 时间格消耗: 2 },
  { 行为: '小酣', 体力消耗: -3, 时间格消耗: 1 },
  { 行为: '就寝', 体力消耗: 0, 时间格消耗: 0 },
] as const;

export const SYSTEM_EVENT_RULES = {
  selection: {
    cycleYears: 3,
    candidatesPerEvent: 15,
    timeSlots: ['上午', '中午'] as const,
    playerAccompanyAskOpinionAlways: true,
    emperorStrongCrushProbability: 0.1,
  },
  palaceBanquet: {
    month: 3,
    xun: 1,
    timeSlots: ['傍晚', '夜晚'] as const,
  },
  familyBanquet: {
    month: 12,
    xun: 3,
    timeSlots: ['傍晚', '夜晚'] as const,
    toastPrestigeRewardWhenFavorGt: 60,
    toastPrestigeReward: 10,
    dowagerPraisePrestigeRewardWhenDowagerFavorGte: 80,
    dowagerPraisePrestigeReward: 20,
  },
  summerTravel: {
    month: 8,
    carriedConsortCountRange: [1, 3] as RangeTuple,
    prestigeReward: 100,
  },
} as const;

export const MYSTERIOUS_MERCHANT_GIFT_TIERS = [
  { 品质颜色: RARITY_COLOR_COMMON, 价格银两: 70, 好感提升: 5 },
  { 品质颜色: RARITY_COLOR_RARE, 价格银两: 130, 好感提升: 10 },
  { 品质颜色: RARITY_COLOR_EPIC, 价格银两: 180, 好感提升: 15 },
  { 品质颜色: RARITY_COLOR_LEGENDARY, 价格银两: 250, 好感提升: 20 },
] as const;

export const LIFESPAN_INITIAL_RANGE: RangeTuple = [60, 80] as const;

const toGameRouteId = (routeId: RouteId): GameRouteId => routeId as unknown as GameRouteId;
const buildRouteRangeRecord = (resolveRange: (routeId: GameRouteId) => RangeTuple): Record<RouteId, RangeTuple> => ({
  [RouteId.Lanyinxuguo]: resolveRange(toGameRouteId(RouteId.Lanyinxuguo)),
  [RouteId.Fushengrumeng]: resolveRange(toGameRouteId(RouteId.Fushengrumeng)),
  [RouteId.Yingluoyeting]: resolveRange(toGameRouteId(RouteId.Yingluoyeting)),
  [RouteId.Chenyuansucuo]: resolveRange(toGameRouteId(RouteId.Chenyuansucuo)),
});

export const EMPEROR_TRUE_HEART_RANGE_BY_ROUTE: Record<RouteId, RangeTuple> = buildRouteRangeRecord(
  (routeId) => getRouteInitialProfileConfig(routeId).trueHeartRange,
);

export const NIGHTLY_SERVICE_PROBABILITY_GAIN_PER_XUN_PERCENT = 2 as const;
export const NIGHTLY_SERVICE_PROBABILITY_MAX_PERCENT = 100 as const;

export const NIGHTLY_INTEREST_MIN = 20 as const;
export const NIGHTLY_INTEREST_MAX = 100 as const;
export const NIGHTLY_INTEREST_NEXT_BASE_RATIO_AFTER_SERVICE = 0.5 as const;
export const NIGHTLY_INTEREST_EXTRA_PRESTIGE_REWARD_WHEN_MAX = 10 as const;

export const NIGHTLY_INTEREST_BASE_BY_FAVOR_TIER = [
  { 宠爱状态: '盛宠', baseInterest: 60 },
  { 宠爱状态: '独宠', baseInterest: 70 },
] as const;

export const NIGHTLY_INTEREST_ACTION_RULES = [
  { 行为: '鼓瑟抚琴', 条件: [{ 指标: '乐理', gte: 81, 兴致变化: 15 }, { 指标: '乐理', gte: 51, 兴致变化: 5 }], 否则兴致变化: 0 },
  { 行为: '吟诗作对', 条件: [{ 指标: '诗词', gte: 81, 兴致变化: 15 }], 否则兴致变化: -10 },
  { 行为: '羞却还从', 条件: [{ 指标: '气质', gte: 901, 兴致变化: 25 }, { 指标: '气质', gte: 801, 兴致变化: 20 }, { 指标: '气质', gte: 601, 兴致变化: 10 }], 否则兴致变化: -10 },
  { 行为: '帷幔戏语', 条件: [{ 指标: '容貌', gte: 901, 兴致变化: 25 }, { 指标: '容貌', gte: 801, 兴致变化: 20 }, { 指标: '容貌', gte: 601, 兴致变化: 10 }], 否则兴致变化: -10 },
  { 行为: '温言絮语', 结果: [{ 分支: '温柔抚慰', 兴致变化: 20 }, { 分支: '诉苦', 兴致变化: 0 }, { 分支: '美言', 兴致变化: 0 }] },
] as const;

export const CHARACTER_STATUS_THRESHOLDS = {
  player: {
    stressBreakdownThreshold: 80,
    stressLifespanLossPerMonth: 0.2,
  },
  npc: {
    stressPersonalityMutationThreshold: 80,
    stressMadnessTriggerProbability: 0.2,
  },
  emperor: {
    moodGriefThreshold: -50,
    moodNoPromotionThreshold: 0,
  },
} as const;

export const PRESTIGE_RANK_TABLE: readonly 位分声望条目[] = numericPrestigeRankTable;

export const SPECIAL_PRESTIGE_RANK_TABLE: readonly 位分声望条目[] = numericSpecialPrestigeRankTable;

export const PRESTIGE_RANK_BY_NAME = Object.fromEntries([...PRESTIGE_RANK_TABLE, ...SPECIAL_PRESTIGE_RANK_TABLE].map((entry) => [entry.位分名称, entry])) as Record<
  string,
  位分声望条目
>;

export const ROUTE_INITIAL_SILVER_RANGE: Record<RouteId, RangeTuple> = buildRouteRangeRecord(
  (routeId) => getRouteInitialProfileConfig(routeId).silverRange,
);

export const ROUTE_INITIAL_STRESS_RANGE: Record<RouteId, RangeTuple> = buildRouteRangeRecord(
  (routeId) => getRouteInitialProfileConfig(routeId).stressRange,
);

export const ROUTE_INITIAL_FAVOR_RANGE: Record<RouteId, RangeTuple> = buildRouteRangeRecord(
  (routeId) => getRouteInitialProfileConfig(routeId).favorRange,
);

export const ROUTE_CLEAR_REQUIRED_PRESTIGE: Record<RouteId, number> = {
  [RouteId.Lanyinxuguo]: 0,
  [RouteId.Fushengrumeng]: 0,
  [RouteId.Yingluoyeting]: 1500,
  [RouteId.Chenyuansucuo]: 0,
};

export const ROUTE_CLEAR_KEY_STORY_NODE_IDS: Record<RouteId, readonly StoryNodeId[]> = {
  [RouteId.Lanyinxuguo]: [StoryNodeId.RouteLanyinxuguoComplete],
  [RouteId.Fushengrumeng]: [StoryNodeId.RouteFushengrumengComplete],
  [RouteId.Yingluoyeting]: [StoryNodeId.RouteYingluoyetingVindication, StoryNodeId.ItemEvidence],
  [RouteId.Chenyuansucuo]: [StoryNodeId.RouteChenyuansucuoHeqinQueen],
};

export const ROUTE_CLEAR_ENDING_TYPES: Record<RouteId, readonly EndingType[]> = {
  [RouteId.Lanyinxuguo]: [
    EndingType.AnyEnding,
    EndingType.SoleRuler,
    EndingType.Regency,
    EndingType.SoleBeloved,
    EndingType.HaremSovereign,
    EndingType.Retreat,
  ],
  [RouteId.Fushengrumeng]: [EndingType.NonAccidentalEnding],
  [RouteId.Yingluoyeting]: [EndingType.ClearFamilyName],
  [RouteId.Chenyuansucuo]: [EndingType.AnyEnding, EndingType.DynasticOverthrow, EndingType.EternalLove, EndingType.Retreat],
};

export const LANYIN_ENDING_REQUIRED_PRESTIGE = 4000 as const;
export const LANYIN_REGENCY_REQUIRED_PRESTIGE = 0 as const;
export const LANYIN_SOLE_BELOVED_REQUIRED_PRESTIGE = 0 as const;
export const LANYIN_HAREM_SOVEREIGN_REQUIRED_PRESTIGE = 0 as const;
export const LANYIN_RETREAT_REQUIRED_PRESTIGE = 0 as const;

export const YINGLUO_CLEAR_REQUIRED_PRESTIGE = 1500 as const;

export const CHENYUAN_DYNASTIC_OVERTHROW_REQUIRED_PRESTIGE = 4000 as const;
export const CHENYUAN_ETERNAL_LOVE_REQUIRED_PRESTIGE = 0 as const;
export const CHENYUAN_RETREAT_REQUIRED_PRESTIGE = 0 as const;
