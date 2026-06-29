import type {
  EmperorInteractionOutcomeTier,
  EmperorInteractionSource,
  EmperorMainInteractionActionId,
  GameNumericsState,
  InventoryItem,
  MapAreaId,
  PalaceTimeState,
  RouteId,
} from '../types';
import { getEmperorInteractionSeed, getMoodModifier } from './emperorActivityRuntime';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(value)));

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => (sum + char.charCodeAt(0) * (index + 31)) % 100000, 0);

const seededRoll = (seed: string, salt: string): number => (hashSeed(`${seed}:${salt}`) % 100) + 1;

const normalizeSkill = (value: number | undefined): number => {
  const numeric = Number(value ?? 0);
  return numeric > 10 ? numeric : numeric * 10;
};

const normalizeMainStat = (value: number | undefined): number => {
  const numeric = Number(value ?? 0);
  return numeric > 100 ? numeric / 10 : numeric * 10;
};

export const EMPEROR_DAY_AUDIENCE_INTERACTION_LIMIT = 2;

export const EMPEROR_DAY_AUDIENCE_ACTIONS: Array<{
  id: EmperorMainInteractionActionId;
  label: string;
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
      flat: '你在案旁研墨，轻重尚算稳当。容安批完一折，只点头让你坐回原处。',
      small: '你研墨的节奏正合他落笔。容安问起几句宫中近况，语气比方才缓和。',
      big: '你在他停笔时补上一句分寸合宜的话。容安抬眼看你，像是重新估量了你的心思。',
    },
  },
  {
    id: 'tea',
    label: '奉茶',
    statLabel: '气质',
    primaryEffect: 'favor',
    secondaryEffect: 'trueHeart',
    feedback: {
      flat: '你奉上热茶，礼数周全。容安接过，只说了一句有劳。',
      small: '你把茶递得正是时候。容安饮过半盏，眉间倦意淡了些。',
      big: '你没有多话，只把茶温和杯盏都照看妥当。容安搁下茶盏，难得多留你坐了一会儿。',
    },
  },
  {
    id: 'greeting',
    label: '问安',
    statLabel: '气质',
    primaryEffect: 'trueHeart',
    secondaryEffect: 'favor',
    feedback: {
      flat: '你依礼问安，话说得妥帖，却也只是寻常体面。',
      small: '你没有急着邀宠，只把关切说得很轻。容安听完，神色略松。',
      big: '你把话说到他的疲处，又及时收住。容安沉默片刻，终于应了一声“朕知道”。',
    },
  },
  {
    id: 'chat',
    label: '闲谈',
    statLabel: '诗词/政治',
    primaryEffect: 'favor',
    secondaryEffect: 'trueHeart',
    feedback: {
      flat: '你拣了几句闲话，容安听得温和，却没有顺势多问。',
      small: '你把话题绕得轻巧，既不冒进，也不无趣。容安顺着你的话笑了一声。',
      big: '你几句话便把殿中沉闷拆开。容安搁下朱笔，竟多留你坐了一盏茶。',
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
  {
    id: 'advise',
    label: '进言',
    statLabel: '政治/心计',
    primaryEffect: 'prestige',
    secondaryEffect: 'trueHeart',
    feedback: {
      flat: '你试着提起一桩宫中事务，话说得谨慎。容安听完，并未多作评判。',
      small: '你把轻重说得清楚，没有越过御前分寸。容安点了点案边折子，算是听进去了。',
      big: '你一句话点到关节，又懂得及时退开。容安看你许久，淡淡道：“你倒看得明白。”',
    },
  },
];

const getActionAbility = (actionId: EmperorMainInteractionActionId, state: GameNumericsState): number => {
  switch (actionId) {
    case 'ink':
      return normalizeSkill(state.stats.politics);
    case 'tea':
      return normalizeMainStat(state.stats.temperament);
    case 'greeting':
      return normalizeMainStat(state.stats.temperament);
    case 'chat':
      return Math.round((normalizeSkill(state.stats.poetry) + normalizeSkill(state.stats.politics)) / 2);
    case 'chess':
      return normalizeMainStat(state.stats.intrigue);
    case 'advise':
      return Math.round((normalizeSkill(state.stats.politics) + normalizeMainStat(state.stats.intrigue)) / 2);
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

export interface EmperorDayAudienceInteractionInput {
  routeId: RouteId;
  time: PalaceTimeState;
  location: MapAreaId;
  source: EmperorInteractionSource;
  actionId: EmperorMainInteractionActionId;
  state: GameNumericsState;
  emperorMood: number;
}

export interface EmperorDayAudienceInteractionResult {
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

export const resolveEmperorDayAudienceInteraction = (
  input: EmperorDayAudienceInteractionInput,
): EmperorDayAudienceInteractionResult => {
  const action = EMPEROR_DAY_AUDIENCE_ACTIONS.find((item) => item.id === input.actionId) ?? EMPEROR_DAY_AUDIENCE_ACTIONS[0];
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
