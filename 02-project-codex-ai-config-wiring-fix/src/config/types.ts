export enum RarityColorId {
  Neutral = 'neutral',
  Common = 'common',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
}

export enum RouteId {
  Lanyinxuguo = 'lanyinxuguo',
  Fushengrumeng = 'fushengrumeng',
  Yingluoyeting = 'yingluoyeting',
  Chenyuansucuo = 'chenyuansucuo',
}

export enum RouteScope {
  All = 'all',
}

export enum EndingType {
  AnyEnding = 'any-ending',
  NonAccidentalEnding = 'non-accidental-ending',
  SoleRuler = 'sole-ruler',
  Regency = 'regency',
  SoleBeloved = 'sole-beloved',
  HaremSovereign = 'harem-sovereign',
  Retreat = 'retreat',
  ClearFamilyName = 'clear-family-name',
  DynasticOverthrow = 'dynastic-overthrow',
  EternalLove = 'eternal-love',
}

export enum StoryNodeId {
  RouteLanyinxuguoComplete = 'route.lanyinxuguo.complete',
  RouteFushengrumengComplete = 'route.fushengrumeng.complete',
  RouteYingluoyetingVindication = 'route.yingluoyeting.vindication',
  RouteChenyuansucuoHeqinQueen = 'route.chenyuansucuo.heqin-queen',
  EventTrueLoveHardToFind = 'event.true-love-hard-to-find',
  EventFakeDeath = 'event.fake-death',
  ItemTigerTally = 'item.tiger-tally',
  ItemEvidence = 'item.evidence',
  QuestCraftFakeDeathMedicine = 'quest.craft-fake-death-medicine',
  QuestObtainPrinceHeir = 'quest.obtain-prince-heir',
  QuestHaremSubmission = 'quest.harem-submission',
  QuestCourtLoyalty = 'quest.court-loyalty',
  QuestMotherFamilyVindication = 'quest.mother-family-vindication',
  QuestHomelandReturn = 'quest.homeland-return',
}

export enum NpcId {
  YaoLinger = 'npc-yao-linger',
  LiuYifang = 'npc-liu-yifang',
  JiangWanwan = 'npc-jiang-wanwan',
  ShenMiaoqing = 'npc-shen-miaoqing',
  ChenWanning = 'npc-chen-wanning',
  BuZiyou = 'npc-bu-ziyou',
  JianNing = 'npc-jian-ning',
  LianQiao = 'npc-lian-qiao',
  DangYi = 'npc-dang-yi',
  LuAnping = 'npc-lu-anping',
  DuNiang = 'npc-du-niang',
}

export type RangeTuple = readonly [min: number, max: number];

export type StoryConditionExpression = string;

export type 特殊剧情触发标志 = boolean | StoryConditionExpression;

export type 位分声望条目 = {
  等级: number;
  位分名称: string;
  所需声望值: number;
  对应颜色标识: RarityColorId;
  图标路径: string;
};

export type 通关条件配置 = {
  所需声望: number;
  关键剧情节点ID: readonly StoryNodeId[];
  结局类型: readonly EndingType[];
};

export type 路线结局配置 = {
  结局名称: string;
  结局类型: EndingType;
  所需声望: number;
  关键剧情节点ID: readonly StoryNodeId[];
  结局颜色: string;
};

export type 路线配置 = {
  routeId: RouteId;
  routeName: string;
  initialSilverRange: RangeTuple;
  initialStressRange: RangeTuple;
  initialFavorRange: RangeTuple;
  clearCondition: 通关条件配置;
  endings: readonly 路线结局配置[];
};

export type NPC初始配置 = {
  id: NpcId;
  姓名: string;
  年龄: number;
  基础好感值: number;
  特殊剧情触发标志: 特殊剧情触发标志;
  所属路线: RouteId | RouteScope;
  头像资源路径: string;
};

export type TimeSlotLabel = '清晨' | '上午' | '中午' | '下午' | '傍晚' | '夜晚' | '深夜';

export enum EmperorMoodTierId {
  Grief = 'grief',
  Sad = 'sad',
  Low = 'low',
  Normal = 'normal',
  Pleasant = 'pleasant',
  Joy = 'joy',
}

export type 皇帝心情区间配置 = {
  id: EmperorMoodTierId;
  状态: string;
  区间: RangeTuple;
};

export enum BanquetTypeId {
  Simple = 'simple',
  Deluxe = 'deluxe',
  Luxury = 'luxury',
}

export type 宴会配置 = {
  id: BanquetTypeId;
  名称: string;
  每人花费银两: number;
  单妃最大声望收益: number;
};

export enum PoisonId {
  Hedandinghong = 'hedandinghong',
  Shexiang = 'shexiang',
  Yunyandan = 'yunyandan',
}

export type 毒药配置 = {
  id: PoisonId;
  名称: string;
  价格银两: number;
  效果描述: string;
};

export type 地点开放配置 = {
  地点: string;
  开放时间段: readonly TimeSlotLabel[];
};

export enum LocationOpenMode {
  AllDay = 'all-day',
  Slots = 'slots',
  EventOnly = 'event-only',
}

export type LocationOpenTimeConfig = {
  mode: LocationOpenMode;
  openSlots: readonly TimeSlotLabel[];
  requiredEvent?: GameEventId;
};

export enum GameEventId {
  NightlyService = 'event.nightly-service',
}
