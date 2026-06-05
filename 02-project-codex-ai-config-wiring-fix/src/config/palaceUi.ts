import type { MapAreaId, PlayerResidenceName, TimeSlot } from '../game/types';
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

export interface ChamberSceneButtonLayout {
  id: string;
  label: string;
  top: string;
  left: string;
  width: string;
  height: string;
  orientation: 'horizontal' | 'vertical';
}

export const MAP_BACKGROUND_BY_TIME_SLOT: Record<TimeSlot, string> = {
  清晨: '/assets/map/map_spring_dawn.png',
  上午: '/assets/map/map_spring_latemorning.png',
  中午: '/assets/map/map_spring_noon.png',
  下午: '/assets/map/map_spring_afternoon.png',
  傍晚: '/assets/map/map_spring_dusk.png',
  夜晚: '/assets/map/map_spring_night.png',
  深夜: '/assets/map/map_spring_latenight.png',
};

export const resolveMapBackgroundImage = (slot: TimeSlot): string => MAP_BACKGROUND_BY_TIME_SLOT[slot];

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
  { id: '冷宫', label: '冷宫', top: '2%', left: '15.8%', width: '4.4%', height: '18.2%', description: '冷宫阴气重，进去容易，出来难。多数时候这里只能探听旧案。', vertical: true },
  { id: '御花园', label: '御花园', top: '6.8%', left: '53%', width: '4.4%', height: '16.5%', description: '御花园最适合偶遇与闲逛，也是后宫流言最爱生根的地方。', vertical: true },
  { id: '宝华殿', label: '宝华殿', top: '3%', left: '78.5%', width: '4.4%', height: '17.2%', description: '宝华殿可祈福、静心，也会触发寿命与因果类提示。', vertical: true },
  { id: '华清池', label: '华清池', top: '20.4%', left: '31.5%', width: '4.4%', height: '18.8%', description: '华清池偏重养颜与休息，也会承接部分亲密事件。', vertical: true },
  { id: '建章宫', label: '建章宫', top: '15.5%', left: '66.7%', width: '4.4%', height: '15.7%', description: '建章宫多牵涉大事，往后部分主线会在这里推进。', vertical: true },
  { id: '后宫', label: '后宫', top: '33.2%', left: '18.3%', width: '4.4%', height: '18.7%', description: '后宫总览会汇聚各宫妃动向，是嫔妃与宫斗信息的集散地。', vertical: true, emphasis: 'large' },
  { id: '正阳门', label: '正阳门', top: '28%', left: '45%', width: '4.4%', height: '18.1%', description: '正阳门是宫城交通要道，部分节庆、出入与大事件会从这里过。', vertical: true },
  { id: '重华宫', label: '重华宫', top: '31.8%', left: '82.5%', width: '4.4%', height: '18.2%', description: '重华宫与皇嗣教育相关，后续孩子三岁后会在这里成长。', vertical: true },
  { id: '妙音堂', label: '妙音堂', top: '58.8%', left: '17.8%', width: '4.4%', height: '16.7%', description: '妙音堂可习舞奏乐，也容易撞见擅长才艺的角色。', vertical: true },
  { id: '太医院', label: '太医院', top: '67.3%', left: '25.9%', width: '4.4%', height: '18.1%', description: '太医院能请平安脉，也与怀孕、流产与下毒调查相关。', vertical: true },
  { id: '养心殿', label: '养心殿', top: '50.3%', left: '38.4%', width: '4.4%', height: '17.1%', description: '养心殿关系侍寝、陪伴与皇帝主线，重要剧情会在这里展开。', vertical: true },
  { id: '御书房', label: '御书房', top: '46.4%', left: '59.8%', width: '4.4%', height: '15.6%', description: '御书房牵涉政治、朝臣与皇帝，后期通关条件多半在此发力。', vertical: true },
  { id: '御膳房', label: '御膳房', top: '55.6%', left: '70.2%', width: '4.4%', height: '17.7%', description: '御膳房能采买膳食，也常牵连赏赐、补品与偶发小事。', vertical: true },
  { id: '宫门', label: '宫门', top: '73.8%', left: '57.4%', width: '4.4%', height: '18.2%', description: '宫门关系外来人物与特殊事件，也是部分路线支线的入口。', vertical: true },
  { id: '掖庭院', label: '掖庭院', top: '64.5%', left: '81.7%', width: '4.4%', height: '18.2%', description: '掖庭院多为宫中差役、旧档与杂务所在，影落掖庭旧事也常从这里翻起。', vertical: true },
] as const;

export const buildMapHotspots = (_residenceName: PlayerResidenceName): readonly MapHotspotConfig[] => MAP_HOTSPOTS;

export const CHAMBER_ACTION_BUTTONS: readonly ChamberActionButtonConfig[] = [
  { id: 'study', label: '诵读经典', summary: '静心温书', timeCost: 1, staminaCost: 1, statDeltas: { poetry: 2 } },
  { id: 'painting', label: '泼墨作画', summary: '铺纸试墨', timeCost: 1, staminaCost: 1, statDeltas: { painting: 2 } },
  { id: 'music', label: '习舞奏乐', summary: '校音习舞', timeCost: 1, staminaCost: 2, statDeltas: { talent: 2, temperament: 3, appearance: 3 } },
  { id: 'embroidery', label: '镂月裁云', summary: '理线补绣', timeCost: 1, staminaCost: 1, statDeltas: { embroidery: 2 } },
  { id: 'incense', label: '调制香薰', summary: '辨香调方', timeCost: 1, staminaCost: 1, statDeltas: { medicine: 2 } },
  { id: 'pulse', label: '请平安脉', summary: '请医问诊', timeCost: 1, staminaCost: 0, statDeltas: { health: 3 }, stressDelta: -1 },
  { id: 'nap', label: '殿内小酣', summary: '闭目养神', timeCost: 1, staminaCost: -3 },
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

export const CHAMBER_HOME_ACTION_LAYOUTS: readonly ChamberSceneButtonLayout[] = [
  { id: 'explore', label: '外出探索', top: '14.4%', left: '33.5%', width: '3.6%', height: '20.8%', orientation: 'vertical' },
  { id: 'incense', label: '调制香薰', top: '50.0%', left: '37.8%', width: '3.6%', height: '20.8%', orientation: 'vertical' },
  { id: 'study', label: '诵读经典', top: '36.8%', left: '47.1%', width: '3.6%', height: '20.8%', orientation: 'vertical' },
  { id: 'embroidery', label: '镂月裁云', top: '50.0%', left: '58.4%', width: '3.6%', height: '20.8%', orientation: 'vertical' },
  { id: 'nap', label: '殿内小酣', top: '24.6%', left: '65.1%', width: '3.6%', height: '20.8%', orientation: 'vertical' },
  { id: 'music', label: '习舞奏乐', top: '41.8%', left: '73.8%', width: '3.6%', height: '20.8%', orientation: 'vertical' },
  { id: 'painting', label: '泼墨作画', top: '51.2%', left: '83.3%', width: '3.6%', height: '20.8%', orientation: 'vertical' },
  { id: 'pulse', label: '请平安脉', top: '67.6%', left: '92.7%', width: '3.6%', height: '20.8%', orientation: 'vertical' },
  { id: 'end-xun', label: '结束本旬', top: '28.0%', left: '87.0%', width: '11.0%', height: '5.2%', orientation: 'horizontal' },
] as const;

export const JIAOJIAO_COMMAND_LAYOUTS: readonly ChamberSceneButtonLayout[] = [
  { id: '举办宴席', label: '举办宴席', top: '28.0%', left: '44.3%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: '宫斗事务', label: '宫斗事务', top: '28.0%', left: '58.9%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: '查看属性', label: '查看属性', top: '36.7%', left: '44.3%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: '家族事务', label: '家族事务', top: '36.7%', left: '58.9%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: '道具管理', label: '道具管理', top: '45.3%', left: '44.3%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: '朝堂事务', label: '朝堂事务', top: '45.3%', left: '58.9%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: '情缘管理', label: '情缘管理', top: '54.0%', left: '44.3%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: '调整用度', label: '调整用度', top: '54.0%', left: '58.9%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: '皇嗣管理', label: '皇嗣管理', top: '62.7%', left: '44.3%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: '其他信息', label: '其他信息', top: '62.7%', left: '58.9%', width: '13.0%', height: '7.4%', orientation: 'horizontal' },
  { id: 'dismiss', label: '无事，且先退下吧', top: '64.2%', left: '74.5%', width: '17.0%', height: '7.0%', orientation: 'horizontal' },
] as const;
