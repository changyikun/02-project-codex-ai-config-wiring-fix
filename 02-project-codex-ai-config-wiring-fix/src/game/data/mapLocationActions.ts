import type { AffairSourceLabel, MapAreaId } from '../types';

export interface MapLocationActionConfig {
  id: string;
  label: string;
  locationId: MapAreaId;
  narrativeLocationId: string;
  resultText: string;
  staminaCost?: number;
  effects?: {
    prestige?: number;
    stress?: number;
    trueHeart?: number;
    stats?: Record<string, number>;
  };
}

export interface MapLocationPanelActionConfig {
  id: string;
  label: string;
  locationId: MapAreaId;
  panel: 'chronicle' | 'affairs';
  affairsSource?: AffairSourceLabel;
}

export interface MapLocationInteractionConfig {
  locationId: MapAreaId;
  subtitle: string;
  idleText: string;
  actions: MapLocationActionConfig[];
  panelActions?: MapLocationPanelActionConfig[];
}

export const MAP_LOCATION_INTERACTION_CONFIGS: readonly MapLocationInteractionConfig[] = [
  {
    locationId: '御花园',
    subtitle: '花影宫道',
    idleText: '花木深处常有人停步，风声也容易把半句话送到旁人耳边。',
    actions: [
      {
        id: 'garden-stroll',
        label: '游园',
        locationId: '御花园',
        narrativeLocationId: 'imperial-garden',
        resultText: '花影与水声暂且压住宫中杂念，气质略有进益，压力稍减。',
        effects: { stress: -1, stats: { temperament: 1 } },
      },
      {
        id: 'listen-rumors',
        label: '听风',
        locationId: '御花园',
        narrativeLocationId: 'imperial-garden',
        resultText: '你在宫道转角听见几句未说尽的闲话，心计略有进益。',
        effects: { stats: { intrigue: 1 } },
      },
    ],
  },
  {
    locationId: '正阳门',
    subtitle: '朝门风声',
    idleText: '宫门内外礼数森严，散朝前后的脚步最容易带出消息。',
    actions: [
      {
        id: 'watch-court-road',
        label: '观朝路',
        locationId: '正阳门',
        narrativeLocationId: 'zhengyang-gate',
        resultText: '你在门侧候了片刻，看清几分朝臣进退与宫禁规矩，政治略有进益。',
        effects: { stats: { politics: 1 } },
      },
    ],
  },
  {
    locationId: '重华宫',
    subtitle: '课册旧殿',
    idleText: '殿中暂未启用皇嗣课业，案上旧册仍按规矩收得整齐。',
    actions: [
      {
        id: 'read-lessons',
        label: '阅课册',
        locationId: '重华宫',
        narrativeLocationId: 'chonghua-palace',
        resultText: '你翻过几页旧课册，对宫中教养与经义章法多明白了一分。',
        effects: { stats: { poetry: 1, politics: 1 } },
      },
    ],
  },
  {
    locationId: '御书房',
    subtitle: '书案札记',
    idleText: '书案与奏札都收得很严，能看见的只是一点边角。',
    actions: [
      {
        id: 'copy-notes',
        label: '抄读',
        locationId: '御书房',
        narrativeLocationId: 'imperial-study',
        resultText: '你照着旧札抄读一回，对朝中章法有了更清楚的分寸。',
        effects: { stats: { politics: 1 } },
      },
    ],
    panelActions: [
      {
        id: 'open-court-affairs',
        label: '朝堂事务',
        locationId: '御书房',
        panel: 'affairs',
        affairsSource: '朝堂事务',
      },
    ],
  },
  {
    locationId: '冷宫',
    subtitle: '旧门残影',
    idleText: '门锁与荒草都冷着，越是无人来的地方，越容易留下旧事。',
    actions: [
      {
        id: 'search-old-traces',
        label: '探旧',
        locationId: '冷宫',
        narrativeLocationId: 'cold-palace',
        resultText: '你在墙根与旧窗下看过一圈，心计略有进益，心头也压上一点寒意。',
        effects: { stress: 1, stats: { intrigue: 1 } },
      },
    ],
    panelActions: [
      {
        id: 'open-chronicle',
        label: '旧案纪事',
        locationId: '冷宫',
        panel: 'chronicle',
      },
    ],
  },
  {
    locationId: '养心殿',
    subtitle: '阶前候旨',
    idleText: '殿门外内侍来去极轻，一句通传也要先过好几重分寸。',
    actions: [
      {
        id: 'wait-at-steps',
        label: '候旨',
        locationId: '养心殿',
        narrativeLocationId: 'yangxin-hall',
        resultText: '你在阶前候了片刻，越发知道御前进退不能急，也不能乱。',
        effects: { stats: { politics: 1 } },
      },
    ],
  },
];

export const getMapLocationInteractionConfig = (locationId: MapAreaId): MapLocationInteractionConfig | undefined =>
  MAP_LOCATION_INTERACTION_CONFIGS.find((config) => config.locationId === locationId);
