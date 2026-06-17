import type {
  EmperorInteractionOutcomeTier,
  EmperorInteractionSource,
  EmperorMainInteractionActionId,
  GameNumericsState,
  InventoryItem,
  MapAreaId,
  PalaceTimeState,
  RouteId,
  TimeSlot,
} from '../types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(value)));

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => (sum + char.charCodeAt(0) * (index + 31)) % 100000, 0);

const seededRoll = (seed: string, salt: string): number => (hashSeed(`${seed}:${salt}`) % 100) + 1;

const getXunKey = (time: PalaceTimeState): string => `${time.year}-${time.month}-${time.xun}`;

const getMoodModifier = (mood: number): number => {
  if (mood < 0) return -10;
  if (mood <= 20) return -5;
  if (mood <= 50) return 0;
  if (mood <= 70) return 5;
  return 10;
};

const getSlotAudienceModifier = (slot: TimeSlot): number => {
  switch (slot) {
    case '上午':
      return -15;
    case '中午':
      return 0;
    case '下午':
      return 5;
    case '傍晚':
      return -5;
    default:
      return -999;
  }
};

const normalizeSkill = (value: number | undefined): number => {
  const numeric = Number(value ?? 0);
  return numeric > 10 ? numeric : numeric * 10;
};

const normalizeMainStat = (value: number | undefined): number => {
  const numeric = Number(value ?? 0);
  return numeric > 100 ? numeric / 10 : numeric * 10;
};

export const EMPEROR_AUDIENCE_OPEN_SLOTS: readonly TimeSlot[] = ['上午', '中午', '下午', '傍晚'] as const;
export const EMPEROR_PUBLIC_SLOTS: readonly TimeSlot[] = ['中午', '下午', '傍晚'] as const;

export const getEmperorInteractionSeed = (
  routeId: RouteId,
  time: PalaceTimeState,
  location: MapAreaId,
  source: EmperorInteractionSource,
): string => `${routeId}:${getXunKey(time)}:${time.slot}:${location}:${source}`;

export const resolveEmperorScheduledLocation = (routeId: RouteId, time: PalaceTimeState): MapAreaId => {
  if (time.slot === '清晨') {
    return '正阳门';
  }
  if (time.slot === '夜晚' || time.slot === '深夜' || time.slot === '上午') {
    return '养心殿';
  }
  const roll = seededRoll(`${routeId}:${getXunKey(time)}:${time.slot}`, 'emperor-location');
  if (roll <= 18) {
    return '御花园';
  }
  if (roll <= 32) {
    return '建章宫';
  }
  return '养心殿';
};

export const isEmperorPublicEncounterAvailable = (
  routeId: RouteId,
  time: PalaceTimeState,
  location: MapAreaId,
): boolean => EMPEROR_PUBLIC_SLOTS.includes(time.slot) && resolveEmperorScheduledLocation(routeId, time) === location;

export interface EmperorAudienceRequestInput {
  routeId: RouteId;
  time: PalaceTimeState;
  playerFavor: number;
  playerTrueHeart: number;
  emperorMood: number;
}

export interface EmperorAudienceRequestResult {
  success: boolean;
  chance: number;
  roll: number;
  line: string;
}

export const resolveEmperorAudienceRequest = (input: EmperorAudienceRequestInput): EmperorAudienceRequestResult => {
  const slotModifier = getSlotAudienceModifier(input.time.slot);
  if (slotModifier <= -900) {
    return {
      success: false,
      chance: 0,
      roll: 100,
      line: input.time.slot === '清晨'
        ? '内侍垂手回话：“皇上尚在前朝，娘娘此时求见，怕是见不着圣驾。”'
        : '内侍低声劝道：“夜色已深，养心殿不再通传后宫求见，请娘娘回宫歇息。”',
    };
  }

  const seed = `${input.routeId}:${getXunKey(input.time)}:${input.time.slot}:yangxin-request`;
  const chance = clamp(
    18 + input.playerFavor * 0.35 + Math.max(0, input.playerTrueHeart) * 0.25 + getMoodModifier(input.emperorMood) + slotModifier,
    5,
    88,
  );
  const roll = seededRoll(seed, 'request');
  return {
    success: roll <= chance,
    chance,
    roll,
    line:
      roll <= chance
        ? '内侍入殿通传片刻，躬身出来：“皇上准了，请娘娘随奴才入殿。”'
        : '内侍入殿通传许久，回来时声音压得更低：“皇上政务未毕，今日恐不得空，请娘娘先回。”',
  };
};

export interface ZhengyangGateEncounterInput {
  routeId: RouteId;
  time: PalaceTimeState;
  playerFavor: number;
  emperorMood: number;
}

export interface ZhengyangGateEncounterResult {
  success: boolean;
  chance: number;
  roll: number;
  favorDelta: number;
  line: string;
}

export const resolveZhengyangGateEncounter = (input: ZhengyangGateEncounterInput): ZhengyangGateEncounterResult => {
  const chance = clamp(34 + Math.max(0, input.playerFavor) * 0.12 + getMoodModifier(input.emperorMood), 12, 68);
  const roll = seededRoll(`${input.routeId}:${getXunKey(input.time)}:${input.time.slot}:zhengyangmen`, 'court-dismissal');
  const success = input.time.slot === '清晨' && roll <= chance;
  return {
    success,
    chance: input.time.slot === '清晨' ? chance : 0,
    roll,
    favorDelta: success ? 1 : 0,
    line: success
      ? '你在正阳门外等到散朝。容安从丹陛下来，目光在人群间停了一瞬，向你微微颔首。'
      : input.time.slot === '清晨'
        ? '你在正阳门外等到散朝，銮驾却从侧门转入内廷，只余宫人低声催你避让。'
        : '正阳门此刻已非散朝时分，宫人只劝你莫在门前久候。',
  };
};

export const EMPEROR_MAIN_INTERACTION_ACTIONS: Array<{
  id: EmperorMainInteractionActionId;
  label: string;
  requiredFavor?: number;
  statLabel: string;
  primaryEffect: 'favor' | 'prestige' | 'trueHeart';
  secondaryEffect?: 'favor' | 'prestige' | 'trueHeart';
  feedback: Record<EmperorInteractionOutcomeTier, string>;
}> = [
  {
    id: 'ink',
    label: '研墨',
    statLabel: '政治',
    primaryEffect: 'prestige',
    secondaryEffect: 'trueHeart',
    feedback: {
      flat: '你执墨在侧，分寸不差，却也未能真正接上容安此刻的政务心思。',
      small: '你研墨的轻重正合他下笔节奏。容安看过折子，随口问了你一句朝中风向。',
      big: '你不只研墨，也在他停笔时补上一句恰到好处的话。容安眼中笑意深了些，像是重新估量了你。',
    },
  },
  {
    id: 'massage',
    label: '按摩',
    statLabel: '药理/气质',
    primaryEffect: 'favor',
    secondaryEffect: 'trueHeart',
    feedback: {
      flat: '你替他按揉肩颈，力道略显生涩。容安温声道了句辛苦，便让你坐回下首。',
      small: '你的指尖避开僵处，慢慢替他舒开疲意。容安合眼片刻，语气比方才缓和。',
      big: '你按得极稳，连他紧绷的指节都松了下来。容安睁眼看你，低声道：“有劳了。”',
    },
  },
  {
    id: 'concern',
    label: '关心',
    statLabel: '气质',
    primaryEffect: 'trueHeart',
    secondaryEffect: 'favor',
    feedback: {
      flat: '你问起他的起居，话语妥帖，却也像宫中人人都会说的体面话。',
      small: '你没有急着邀宠，只把担忧说得很轻。容安笑了笑，未曾打断你。',
      big: '你把话说到他最不愿示人的疲处，又及时收住。容安沉默片刻，终于应了一声“朕明白”。',
    },
  },
  {
    id: 'music',
    label: '抚琴',
    statLabel: '乐理',
    primaryEffect: 'favor',
    secondaryEffect: 'prestige',
    feedback: {
      flat: '琴音落在殿中，尚算清稳，只是未能压过案上政务留下的冷意。',
      small: '你拢弦一转，曲意清润。容安听完半阙，指尖在案上轻轻点了两下。',
      big: '你的曲子起落有度，收音时殿中静了许久。容安抬眼，像是终于从折子里抽身。',
    },
  },
  {
    id: 'chat',
    label: '闲聊',
    statLabel: '诗词/政治',
    primaryEffect: 'favor',
    secondaryEffect: 'trueHeart',
    feedback: {
      flat: '你拣了几句宫中闲话，容安听得温和，却没有顺势多问。',
      small: '你把话题绕得轻巧，既不冒进，也不无趣。容安顺着你的话笑了一声。',
      big: '你几句话便把殿中沉闷拆开。容安搁下朱笔，竟多留你坐了一盏茶。',
    },
  },
  {
    id: 'coquetry',
    label: '撒娇',
    statLabel: '容貌/气质',
    primaryEffect: 'favor',
    secondaryEffect: 'trueHeart',
    feedback: {
      flat: '你把语气放软，容安仍是含笑听着，只没有给出更多回应。',
      small: '你进退有度地放轻话尾，容安眼底笑意一闪，准了你一句小小讨巧。',
      big: '你把亲近拿捏得正好，不轻浮，也不生硬。容安伸手扶了你一下，语气难得纵容。',
    },
  },
  {
    id: 'embrace',
    label: '入怀',
    requiredFavor: 51,
    statLabel: '容貌/宠爱',
    primaryEffect: 'favor',
    secondaryEffect: 'trueHeart',
    feedback: {
      flat: '你靠近一步，容安并未斥退，却也只虚扶了你一把，让你坐稳。',
      small: '你顺势近前，容安没有避开，袖底的手停了停，像是默许这一刻亲近。',
      big: '你靠入他怀中时，容安低声笑了笑，掌心在你肩上停得比平日更久。',
    },
  },
  {
    id: 'chess',
    label: '对弈',
    statLabel: '心计',
    primaryEffect: 'prestige',
    secondaryEffect: 'trueHeart',
    feedback: {
      flat: '你落子谨慎，却被容安三步拆尽。棋局收得体面，未见锋芒。',
      small: '你在中盘藏了一手，容安看破时反而笑了，称你比上回更有章法。',
      big: '你逼得他多思了半盏茶。容安拈着棋子看你，温声道：“这一步，有意思。”',
    },
  },
];

const getActionAbility = (actionId: EmperorMainInteractionActionId, state: GameNumericsState): number => {
  switch (actionId) {
    case 'ink':
      return normalizeSkill(state.stats.politics);
    case 'massage':
      return Math.round((normalizeSkill(state.stats.medicine) + normalizeMainStat(state.stats.temperament)) / 2);
    case 'concern':
      return normalizeMainStat(state.stats.temperament);
    case 'music':
      return normalizeSkill(state.stats.talent);
    case 'chat':
      return Math.round((normalizeSkill(state.stats.poetry) + normalizeSkill(state.stats.politics)) / 2);
    case 'coquetry':
      return Math.round((normalizeMainStat(state.stats.appearance) + normalizeMainStat(state.stats.temperament)) / 2);
    case 'embrace':
      return Math.round((normalizeMainStat(state.stats.appearance) + Math.max(0, state.favor)) / 2);
    case 'chess':
      return normalizeMainStat(state.stats.intrigue);
    default:
      return 0;
  }
};

const applyDelta = (
  effects: { favorDelta: number; prestigeDelta: number; trueHeartDelta: number },
  key: 'favor' | 'prestige' | 'trueHeart',
  value: number,
) => {
  if (key === 'favor') {
    effects.favorDelta += value;
  } else if (key === 'prestige') {
    effects.prestigeDelta += value;
  } else {
    effects.trueHeartDelta += value;
  }
};

export interface EmperorMainInteractionInput {
  routeId: RouteId;
  time: PalaceTimeState;
  location: MapAreaId;
  source: EmperorInteractionSource;
  actionId: EmperorMainInteractionActionId;
  state: GameNumericsState;
  emperorMood: number;
}

export interface EmperorMainInteractionResult {
  success: boolean;
  actionId: EmperorMainInteractionActionId;
  label: string;
  tier: EmperorInteractionOutcomeTier;
  score: number;
  effects: {
    favorDelta: number;
    prestigeDelta: number;
    trueHeartDelta: number;
  };
  line: string;
}

export const resolveEmperorMainInteraction = (input: EmperorMainInteractionInput): EmperorMainInteractionResult => {
  const action = EMPEROR_MAIN_INTERACTION_ACTIONS.find((item) => item.id === input.actionId) ?? EMPEROR_MAIN_INTERACTION_ACTIONS[0];
  if (action.requiredFavor != null && input.state.favor < action.requiredFavor) {
    return {
      success: false,
      actionId: input.actionId,
      label: action.label,
      tier: 'flat',
      score: 0,
      effects: { favorDelta: 0, prestigeDelta: 0, trueHeartDelta: 0 },
      line: '你尚未得他这般纵容，殿中宫人也不敢让你再近一步。',
    };
  }

  const ability = getActionAbility(input.actionId, input.state);
  const roll = seededRoll(getEmperorInteractionSeed(input.routeId, input.time, input.location, input.source), input.actionId);
  const variance = roll - 50;
  const score = clamp(
    ability * 0.68 + Math.max(0, input.state.favor) * 0.18 + Math.max(0, input.state.trueHeart) * 0.22 + getMoodModifier(input.emperorMood) + variance * 0.35,
    0,
    120,
  );
  const tier: EmperorInteractionOutcomeTier = score >= 86 ? 'big' : score >= 56 ? 'small' : 'flat';
  const effects = { favorDelta: 0, prestigeDelta: 0, trueHeartDelta: 0 };
  if (tier === 'small') {
    applyDelta(effects, action.primaryEffect, 2);
    if (action.secondaryEffect) applyDelta(effects, action.secondaryEffect, 1);
  } else if (tier === 'big') {
    applyDelta(effects, action.primaryEffect, 4);
    if (action.secondaryEffect) applyDelta(effects, action.secondaryEffect, 3);
  }

  return {
    success: true,
    actionId: input.actionId,
    label: action.label,
    tier,
    score,
    effects,
    line: action.feedback[tier],
  };
};

export const resolveEmperorGiftEffects = (
  item: InventoryItem,
): { favorDelta: number; prestigeDelta: number; trueHeartDelta: number; line: string } => {
  const rarityValue: Record<string, number> = {
    green: 1,
    blue: 2,
    purple: 3,
    red: 4,
  };
  const magnitude = rarityValue[item.rarity] ?? 1;
  const categoryLine =
    item.category === 'food'
      ? '你将食盒奉上，容安命人收下，笑说你倒记得这些细处。'
      : item.name.includes('画') || item.name.includes('帖') || item.name.includes('卷')
        ? '你将字画呈上，容安展开看了两眼，语气比方才多了几分兴味。'
        : '你将绣品奉上，针脚与配色都挑不出错处，正合御前体面。';
  return {
    favorDelta: magnitude,
    prestigeDelta: item.rarity === 'red' ? 2 : 0,
    trueHeartDelta: item.rarity === 'purple' || item.rarity === 'red' ? 1 : 0,
    line: categoryLine,
  };
};
