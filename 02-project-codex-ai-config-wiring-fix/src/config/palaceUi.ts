import type { MapAreaId } from '../game/types';
import { MONTHLY_EXPENSE_STRATEGIES } from './monthlyExpenseStrategy';

export interface GuideTendencyOption {
  id: 'frugal' | 'balanced' | 'luxury';
  label: string;
  effectHint: string;
  summary: string;
  openingTendency: string;
  effects?: undefined;
}

export interface PalaceSidebarButtonConfig {
  id: string;
  label: string;
  top: string;
}

export interface MapHotspotConfig {
  id: MapAreaId | '后宫';
  label: string;
  top: string;
  left: string;
  width: string;
  height: string;
  description: string;
  vertical?: boolean;
  emphasis?: 'large';
}

export interface ChamberActionButtonConfig {
  id: string;
  label: string;
  summary: string;
  timeCost?: number;
  staminaCost?: number;
  statDeltas?: Record<string, number>;
  favorDelta?: number;
  stressDelta?: number;
}

export const GUIDE_TENDENCY_OPTIONS: readonly GuideTendencyOption[] = MONTHLY_EXPENSE_STRATEGIES.map((strategy) => ({
  id: strategy.id,
  label: strategy.label,
  effectHint: `每月用度约为月俸${Math.round(strategy.expenseRate * 100)}%，声望${strategy.prestigeDelta >= 0 ? '+' : ''}${strategy.prestigeDelta}，健康${strategy.healthDelta >= 0 ? '+' : ''}${strategy.healthDelta}。`,
  summary: strategy.summary,
  openingTendency: strategy.label,
}));

export const MAP_GUIDE_LINES = [
  '娘娘先记着，宫中大事多半都要从地图上走。御书房与宝华殿最常去，若有宫务、朝堂、祈福与偶遇，也多从这里起头。',
  '左侧五个菱形是常驻入口，能随时查看妃嫔、自己、纪事与情缘。等娘娘认过这些地方，咱们便回寝殿安排行程。',
] as const;

export const MAP_SIDEBAR_BUTTONS: readonly PalaceSidebarButtonConfig[] = [
  { id: 'consorts', label: '嫔妃', top: '18%' },
  { id: 'stats', label: '查看', top: '32%' },
  { id: 'return', label: '回宫', top: '46%' },
  { id: 'chronicle', label: '纪事', top: '60%' },
  { id: 'bond', label: '情缘', top: '74%' },
] as const;

export const CHAMBER_SIDEBAR_BUTTONS: readonly PalaceSidebarButtonConfig[] = [
  { id: 'consorts', label: '嫔妃', top: '18%' },
  { id: 'stats', label: '查看', top: '32%' },
  { id: 'map-main', label: '外出', top: '46%' },
  { id: 'chronicle', label: '纪事', top: '60%' },
  { id: 'bond', label: '情缘', top: '74%' },
] as const;

export const MAP_HOTSPOTS: readonly MapHotspotConfig[] = [
  { id: '御花园', label: '御花园', top: '12%', left: '18%', width: '5.4%', height: '17%', description: '御花园最适合偶遇与闲逛，也是后宫流言最爱生根的地方。', vertical: true },
  { id: '建章宫', label: '建章宫', top: '8%', left: '34.5%', width: '5.6%', height: '20%', description: '建章宫多牵涉大事，往后部分主线会在这里推进。', vertical: true },
  { id: '冷宫', label: '冷宫', top: '6.8%', left: '66.4%', width: '5.2%', height: '17.2%', description: '冷宫阴气重，进去容易，出来难。多数时候这里只能探听旧案。', vertical: true },
  { id: '宝华殿', label: '宝华殿', top: '34%', left: '23%', width: '5.4%', height: '18%', description: '宝华殿可祈福、静心，也会触发寿命与因果类提示。', vertical: true },
  { id: '御书房', label: '御书房', top: '24%', left: '44.5%', width: '5.3%', height: '20%', description: '御书房牵涉政治、朝臣与皇帝，后期通关条件多半在此发力。', vertical: true },
  { id: '养心殿', label: '养心殿', top: '22%', left: '58.2%', width: '5.7%', height: '22%', description: '养心殿关系侍寝、陪伴与皇帝主线，重要剧情会在这里展开。', vertical: true },
  { id: '后宫', label: '后宫', top: '36%', left: '73.5%', width: '7.5%', height: '28%', description: '后宫总览会汇聚各宫妃动向，是嫔妃与宫斗信息的集散地。', vertical: true, emphasis: 'large' },
  { id: '椒房殿', label: '椒房殿', top: '33%', left: '89.5%', width: '6.2%', height: '21%', description: '椒房殿是中宫所在，也象征权力中心。', vertical: true },
  { id: '妙音堂', label: '妙音堂', top: '57%', left: '14%', width: '5.4%', height: '18%', description: '妙音堂可习舞奏乐，也容易撞见擅长才艺的角色。', vertical: true },
  { id: '御膳房', label: '御膳房', top: '52%', left: '34%', width: '5.2%', height: '20%', description: '御膳房能采买膳食，也常牵连赏赐、补品与偶发小事。', vertical: true },
  { id: '正阳门', label: '正阳门', top: '49%', left: '54.8%', width: '5.4%', height: '19%', description: '正阳门是宫城交通要道，部分节庆、出入与大事件会从这里过。', vertical: true },
  { id: '华清池', label: '华清池', top: '62%', left: '79%', width: '5.3%', height: '17%', description: '华清池偏重养颜与休息，也会承接部分亲密事件。', vertical: true },
  { id: '太医院', label: '太医院', top: '73%', left: '22%', width: '5.2%', height: '18%', description: '太医院能请平安脉，也与怀孕、流产与下毒调查相关。', vertical: true },
  { id: '宫门', label: '宫门', top: '78%', left: '50.2%', width: '5.2%', height: '17%', description: '宫门关系外来人物与特殊事件，也是部分路线支线的入口。', vertical: true },
  { id: '重华宫', label: '重华宫', top: '71%', left: '90%', width: '5.8%', height: '19%', description: '重华宫与皇嗣教育相关，后续孩子三岁后会在这里成长。', vertical: true },
  { id: '长春宫', label: '长春宫', top: '39%', left: '82.5%', width: '5.6%', height: '18%', description: '长春宫是陈婉宁所在宫室，影落掖庭中后段的交易、证物与立场变化会在这里推进。', vertical: true },
] as const;

const buildResidenceHotspotDescription = (residenceName: MapAreaId): string =>
  `${residenceName}是娘娘当前居所。点这里会直接回宫，不再额外消耗时辰。`;

export const buildMapHotspots = (residenceName: MapAreaId): readonly MapHotspotConfig[] =>
  MAP_HOTSPOTS.map((hotspot) =>
    hotspot.id === '椒房殿'
      ? {
          ...hotspot,
          id: residenceName,
          label: residenceName,
          description: buildResidenceHotspotDescription(residenceName),
        }
      : hotspot,
  );

export const CHAMBER_ACTION_BUTTONS: readonly ChamberActionButtonConfig[] = [
  { id: 'study', label: '诵读经典', summary: '诗词 +2', timeCost: 1, staminaCost: 1, statDeltas: { poetry: 0.2 } },
  { id: 'painting', label: '泼墨作画', summary: '丹青 +2', timeCost: 1, staminaCost: 1, statDeltas: { painting: 0.2 } },
  { id: 'music', label: '习舞奏乐', summary: '乐理 +2，气质 +3，容貌 +3', timeCost: 1, staminaCost: 2, statDeltas: { talent: 0.2, temperament: 0.03, appearance: 0.03 } },
  { id: 'embroidery', label: '镂月裁云', summary: '刺绣 +2', timeCost: 1, staminaCost: 1, statDeltas: { embroidery: 0.2 } },
  { id: 'incense', label: '调制香薰', summary: '药理 +2', timeCost: 1, staminaCost: 1, statDeltas: { medicine: 0.2 } },
  { id: 'pulse', label: '请平安脉', summary: '健康 +3，压力 -1', timeCost: 1, staminaCost: 0, statDeltas: { health: 0.03 }, stressDelta: -1 },
  { id: 'nap', label: '殿内小酣', summary: '体力 +3', timeCost: 1, staminaCost: -3 },
  { id: 'explore', label: '外出探索', summary: '前往宫廷地图', timeCost: 0, staminaCost: 0 },
  { id: 'end-xun', label: '结束本旬', summary: '推进至下一旬', timeCost: 0, staminaCost: 0 },
] as const;

export const CHAMBER_BOTTOM_TOOLS = [
  '举办宴席',
  '调整用度',
  '宫斗事务',
  '家族事务',
  '朝堂事务',
  '道具管理',
  '皇嗣管理',
  '查看属性',
  '其他信息',
  '情缘管理',
] as const;
