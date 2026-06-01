import {
  CHENYUAN_DYNASTIC_OVERTHROW_REQUIRED_PRESTIGE,
  CHENYUAN_ETERNAL_LOVE_REQUIRED_PRESTIGE,
  CHENYUAN_RETREAT_REQUIRED_PRESTIGE,
  LANYIN_ENDING_REQUIRED_PRESTIGE,
  LANYIN_HAREM_SOVEREIGN_REQUIRED_PRESTIGE,
  LANYIN_REGENCY_REQUIRED_PRESTIGE,
  LANYIN_RETREAT_REQUIRED_PRESTIGE,
  LANYIN_SOLE_BELOVED_REQUIRED_PRESTIGE,
  RARITY_COLOR_COMMON,
  RARITY_COLOR_EPIC,
  RARITY_COLOR_LEGENDARY,
  RARITY_COLOR_RARE,
  ROUTE_CLEAR_ENDING_TYPES,
  ROUTE_CLEAR_KEY_STORY_NODE_IDS,
  ROUTE_CLEAR_REQUIRED_PRESTIGE,
  ROUTE_INITIAL_FAVOR_RANGE,
  ROUTE_INITIAL_SILVER_RANGE,
  ROUTE_INITIAL_STRESS_RANGE,
  YINGLUO_CLEAR_REQUIRED_PRESTIGE,
} from './constants';
import { EndingType, RouteId, StoryNodeId, type 路线配置 } from './types';

/* 本文件数据来源于《游戏架构目录》，版本号 v1.0.0，生成时间 2026-04-17 16:02 */

export const ROUTES_CONFIG: Record<RouteId, 路线配置> = {
  [RouteId.Lanyinxuguo]: {
    routeId: RouteId.Lanyinxuguo,
    routeName: '兰因絮果',
    initialSilverRange: ROUTE_INITIAL_SILVER_RANGE[RouteId.Lanyinxuguo],
    initialStressRange: ROUTE_INITIAL_STRESS_RANGE[RouteId.Lanyinxuguo],
    initialFavorRange: ROUTE_INITIAL_FAVOR_RANGE[RouteId.Lanyinxuguo],
    clearCondition: {
      所需声望: ROUTE_CLEAR_REQUIRED_PRESTIGE[RouteId.Lanyinxuguo],
      关键剧情节点ID: ROUTE_CLEAR_KEY_STORY_NODE_IDS[RouteId.Lanyinxuguo],
      结局类型: ROUTE_CLEAR_ENDING_TYPES[RouteId.Lanyinxuguo],
    },
    endings: [
      {
        结局名称: '唯我独尊',
        结局类型: EndingType.SoleRuler,
        所需声望: LANYIN_ENDING_REQUIRED_PRESTIGE,
        关键剧情节点ID: [StoryNodeId.ItemTigerTally, StoryNodeId.QuestCourtLoyalty],
        结局颜色: RARITY_COLOR_LEGENDARY,
      },
      {
        结局名称: '权力巅峰',
        结局类型: EndingType.Regency,
        所需声望: LANYIN_REGENCY_REQUIRED_PRESTIGE,
        关键剧情节点ID: [StoryNodeId.QuestObtainPrinceHeir],
        结局颜色: RARITY_COLOR_LEGENDARY,
      },
      {
        结局名称: '独占帝心',
        结局类型: EndingType.SoleBeloved,
        所需声望: LANYIN_SOLE_BELOVED_REQUIRED_PRESTIGE,
        关键剧情节点ID: [StoryNodeId.EventTrueLoveHardToFind],
        结局颜色: RARITY_COLOR_EPIC,
      },
      {
        结局名称: '后宫共主',
        结局类型: EndingType.HaremSovereign,
        所需声望: LANYIN_HAREM_SOVEREIGN_REQUIRED_PRESTIGE,
        关键剧情节点ID: [StoryNodeId.QuestHaremSubmission],
        结局颜色: RARITY_COLOR_RARE,
      },
      {
        结局名称: '归隐山林',
        结局类型: EndingType.Retreat,
        所需声望: LANYIN_RETREAT_REQUIRED_PRESTIGE,
        关键剧情节点ID: [StoryNodeId.EventFakeDeath, StoryNodeId.QuestCraftFakeDeathMedicine],
        结局颜色: RARITY_COLOR_COMMON,
      },
    ],
  },
  [RouteId.Fushengrumeng]: {
    routeId: RouteId.Fushengrumeng,
    routeName: '浮生如梦',
    initialSilverRange: ROUTE_INITIAL_SILVER_RANGE[RouteId.Fushengrumeng],
    initialStressRange: ROUTE_INITIAL_STRESS_RANGE[RouteId.Fushengrumeng],
    initialFavorRange: ROUTE_INITIAL_FAVOR_RANGE[RouteId.Fushengrumeng],
    clearCondition: {
      所需声望: ROUTE_CLEAR_REQUIRED_PRESTIGE[RouteId.Fushengrumeng],
      关键剧情节点ID: ROUTE_CLEAR_KEY_STORY_NODE_IDS[RouteId.Fushengrumeng],
      结局类型: ROUTE_CLEAR_ENDING_TYPES[RouteId.Fushengrumeng],
    },
    endings: [
      {
        结局名称: '任意非意外死亡剧情',
        结局类型: EndingType.NonAccidentalEnding,
        所需声望: ROUTE_CLEAR_REQUIRED_PRESTIGE[RouteId.Fushengrumeng],
        关键剧情节点ID: [StoryNodeId.RouteFushengrumengComplete],
        结局颜色: RARITY_COLOR_RARE,
      },
    ],
  },
  [RouteId.Yingluoyeting]: {
    routeId: RouteId.Yingluoyeting,
    routeName: '影落掖庭',
    initialSilverRange: ROUTE_INITIAL_SILVER_RANGE[RouteId.Yingluoyeting],
    initialStressRange: ROUTE_INITIAL_STRESS_RANGE[RouteId.Yingluoyeting],
    initialFavorRange: ROUTE_INITIAL_FAVOR_RANGE[RouteId.Yingluoyeting],
    clearCondition: {
      所需声望: ROUTE_CLEAR_REQUIRED_PRESTIGE[RouteId.Yingluoyeting],
      关键剧情节点ID: ROUTE_CLEAR_KEY_STORY_NODE_IDS[RouteId.Yingluoyeting],
      结局类型: ROUTE_CLEAR_ENDING_TYPES[RouteId.Yingluoyeting],
    },
    endings: [
      {
        结局名称: '沉冤得雪',
        结局类型: EndingType.ClearFamilyName,
        所需声望: YINGLUO_CLEAR_REQUIRED_PRESTIGE,
        关键剧情节点ID: [StoryNodeId.RouteYingluoyetingVindication, StoryNodeId.ItemEvidence],
        结局颜色: RARITY_COLOR_RARE,
      },
    ],
  },
  [RouteId.Chenyuansucuo]: {
    routeId: RouteId.Chenyuansucuo,
    routeName: '尘缘夙错',
    initialSilverRange: ROUTE_INITIAL_SILVER_RANGE[RouteId.Chenyuansucuo],
    initialStressRange: ROUTE_INITIAL_STRESS_RANGE[RouteId.Chenyuansucuo],
    initialFavorRange: ROUTE_INITIAL_FAVOR_RANGE[RouteId.Chenyuansucuo],
    clearCondition: {
      所需声望: ROUTE_CLEAR_REQUIRED_PRESTIGE[RouteId.Chenyuansucuo],
      关键剧情节点ID: ROUTE_CLEAR_KEY_STORY_NODE_IDS[RouteId.Chenyuansucuo],
      结局类型: ROUTE_CLEAR_ENDING_TYPES[RouteId.Chenyuansucuo],
    },
    endings: [
      {
        结局名称: '改朝换代',
        结局类型: EndingType.DynasticOverthrow,
        所需声望: CHENYUAN_DYNASTIC_OVERTHROW_REQUIRED_PRESTIGE,
        关键剧情节点ID: [StoryNodeId.RouteChenyuansucuoHeqinQueen, StoryNodeId.ItemTigerTally],
        结局颜色: RARITY_COLOR_LEGENDARY,
      },
      {
        结局名称: '绝代红颜',
        结局类型: EndingType.EternalLove,
        所需声望: CHENYUAN_ETERNAL_LOVE_REQUIRED_PRESTIGE,
        关键剧情节点ID: [StoryNodeId.RouteChenyuansucuoHeqinQueen, StoryNodeId.EventTrueLoveHardToFind],
        结局颜色: RARITY_COLOR_EPIC,
      },
      {
        结局名称: '隐姓埋名',
        结局类型: EndingType.Retreat,
        所需声望: CHENYUAN_RETREAT_REQUIRED_PRESTIGE,
        关键剧情节点ID: [StoryNodeId.EventFakeDeath, StoryNodeId.QuestHomelandReturn],
        结局颜色: RARITY_COLOR_COMMON,
      },
    ],
  },
};

export const ROUTE_CONFIG_LIST = Object.values(ROUTES_CONFIG);
