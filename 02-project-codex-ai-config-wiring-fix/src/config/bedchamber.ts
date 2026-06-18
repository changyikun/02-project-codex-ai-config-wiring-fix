export type ChamberPanelId =
  | 'main'
  | 'map'
  | 'harem'
  | 'stats'
  | 'consorts'
  | 'bond'
  | 'chronicle'
  | 'inventory'
  | 'craft-works'
  | 'affairs'
  | 'yangxin'
  | 'misc'
  | 'jiaojiao';

export interface ChamberActionConfig {
  id: ChamberPanelId;
  label: string;
  description: string;
  requiresStamina: boolean;
  staminaCost: number;
  timeCost: number;
}

export const chamberActionConfigs: readonly ChamberActionConfig[] = [
  { id: 'main', label: '寝殿', description: '查看当前状态与娇娇提醒。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'map', label: '地图', description: '前往各宫殿与公共地点。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'harem', label: '后宫', description: '查看十二宫与各宫殿位布局。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'stats', label: '属性', description: '查看主副属性与当前成长。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'consorts', label: '妃嫔', description: '查看后宫妃嫔、宫殿与关系。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'bond', label: '情缘', description: '查看攻略对象、好感与倾情进度。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'chronicle', label: '纪事', description: '查看案件、纪事与传闻。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'inventory', label: '物品', description: '查看礼物、补品与关键道具。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'affairs', label: '宫务', description: '查看家族、朝堂与宫务入口。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'misc', label: '杂项', description: '查看设置、存档与预留功能。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
  { id: 'jiaojiao', label: '娇娇', description: '召见娇娇查看提示与引导。', requiresStamina: false, staminaCost: 0, timeCost: 0 },
] as const;
