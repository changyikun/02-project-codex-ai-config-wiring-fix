import { TIME_SLOTS } from './constants';
import { GameEventId, LocationOpenMode, type LocationOpenTimeConfig, type TimeSlotLabel } from './types';

/* 本文件数据来源于《游戏架构目录》，版本号 v1.0.0，生成时间 2026-04-17 16:02 */

/**
 * 全时段开放的标准时间段列表（与 TIME_SLOTS 保持一致）。
 */
export const LOCATION_FULL_DAY_OPEN_SLOTS = TIME_SLOTS;

/**
 * 正阳门开放时间：清晨到傍晚（含）。
 */
export const LOCATION_ZHENGYANGMEN_OPEN: readonly TimeSlotLabel[] = ['清晨', '上午', '中午', '下午', '傍晚'] as const;

/**
 * 宫门开放时间：上午到傍晚（含）。
 */
export const LOCATION_GONGMEN_OPEN: readonly TimeSlotLabel[] = ['上午', '中午', '下午', '傍晚'] as const;

/**
 * 重华宫开放时间：清晨到傍晚（含）。
 */
export const LOCATION_CHONGHUAGONG_OPEN: readonly TimeSlotLabel[] = ['清晨', '上午', '中午', '下午', '傍晚'] as const;

/**
 * 冷宫：全天开放（新增地点）。
 */
export const PALACE_COLD_PALACE_FULL_DAY = LOCATION_FULL_DAY_OPEN_SLOTS;

/**
 * 养心殿：仅在玩家触发“侍寝”事件时开放（新增地点）。
 */
export const PALACE_YANGXINDIAN_EVENT_ONLY = {
  mode: LocationOpenMode.EventOnly,
  openSlots: LOCATION_FULL_DAY_OPEN_SLOTS,
  requiredEvent: GameEventId.NightlyService,
} as const satisfies LocationOpenTimeConfig;

export const LOCATION_NAME_LIST = [
  '正阳门',
  '宫门',
  '重华宫',
  '冷宫',
  '养心殿',
  '御书房',
  '御膳房',
  '建章宫',
  '太医院',
  '妙音堂',
  '宝华殿',
  '御花园',
  '椒房殿',
  '掖庭院',
  '储秀宫',
  '长春宫',
  '启祥宫',
  '钟粹宫',
  '昭阳宫',
  '玉清宫',
  '永宁宫',
  '永和宫',
  '延禧宫',
  '临华殿',
  '昭华殿',
  '披香殿',
] as const;

export type LocationName = (typeof LOCATION_NAME_LIST)[number];

/**
 * 地点开放时间总表：包含所有地点与开放规则。
 * - mode=all-day：默认全天开放
 * - mode=slots：仅在 openSlots 内开放
 * - mode=event-only：仅在 requiredEvent 生效时开放（时间段按 openSlots 进一步限制）
 */
export const LOCATION_OPEN_TIME: Record<LocationName, LocationOpenTimeConfig> = {
  正阳门: { mode: LocationOpenMode.Slots, openSlots: LOCATION_ZHENGYANGMEN_OPEN },
  宫门: { mode: LocationOpenMode.Slots, openSlots: LOCATION_GONGMEN_OPEN },
  重华宫: { mode: LocationOpenMode.Slots, openSlots: LOCATION_CHONGHUAGONG_OPEN },
  冷宫: { mode: LocationOpenMode.AllDay, openSlots: PALACE_COLD_PALACE_FULL_DAY },
  养心殿: PALACE_YANGXINDIAN_EVENT_ONLY,

  御书房: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  御膳房: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  建章宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  太医院: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  妙音堂: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  宝华殿: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  御花园: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  椒房殿: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  掖庭院: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },

  储秀宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  长春宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  启祥宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  钟粹宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  昭阳宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  玉清宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  永宁宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  永和宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  延禧宫: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  临华殿: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  昭华殿: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
  披香殿: { mode: LocationOpenMode.AllDay, openSlots: LOCATION_FULL_DAY_OPEN_SLOTS },
};

/**
 * 拒绝参加宴会的声望扣除范围：[MIN_REPUTATION_PENALTY, MAX_REPUTATION_PENALTY]（含）。
 */
export const MIN_REPUTATION_PENALTY = 20 as const;
export const MAX_REPUTATION_PENALTY = 30 as const;

/**
 * 事件惩罚规则汇总（供核心逻辑统一引用）。
 */
export const EVENT_PENALTY = {
  banquetRefuse: {
    minReputationPenalty: MIN_REPUTATION_PENALTY,
    maxReputationPenalty: MAX_REPUTATION_PENALTY,
  },
} as const;
