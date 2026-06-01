export const LANYIN_THEME =
  '凤冠压顶，重逾千斤。是天下的国母，也是这深宫最尊贵的囚徒。';

export type LanyinEndingId =
  | 'only-me-supreme'
  | 'regent-pinnacle'
  | 'exclusive-heart'
  | 'harem-sovereign'
  | 'retire-mountains';

export interface LanyinStartState {
  name: string;
  familyBackgroundId: 'zhen_state_duke' | 'official_3' | 'official_2' | 'official_1';
  aptitudePoints: number;
  age: number;
  prestige: number;
  silver: number;
  stress: number;
  emperorFavor: number;
  emperorTrueHeart: number;
}

export interface PlayerStressState {
  stress: number;
  life: number;
}

export interface NpcStressState {
  npcId: string;
  stress: number;
  isMad: boolean;
  canServeEmperor: boolean;
}

export interface LanyinEndingContext {
  emperorAlive: boolean;
  emperorDeposed: boolean;
  emperorDead: boolean;
  selfEnthroned: boolean;
  hasCrownPrince: boolean;
  prestige: number;
  politics: number;
  ambition: number;
  emperorFavor: number;
  trueHeart: number;
  fatherOfficialRank: OfficialRank;
  courtLoyalty: number;
  hasTigerTally: boolean;
  heirAge?: number;
  intrigue: number;
  eventFlags: {
    trueHeartHardToGet: boolean;
    emperorDismissedHarem: boolean;
    fakeDeathTriggered: boolean;
    fakeDeathFlowCompleted: boolean;
    escapedPalace: boolean;
  };
  haremCount: number;
  allConsortsFavorAbove70: boolean;
  medicine: number;
  physique: number;
  craftedFakeDeathMedicine: boolean;
  taiyiFavor: number;
  taiyiWillingAssist: boolean;
  foziFavor: number;
  foziWillingAssist: boolean;
}

export interface EndingValidationResult {
  endingId: LanyinEndingId;
  title: string;
  color: '#FF0800' | '#E840B2' | '#7371D8' | '#70D1D7';
  achieved: boolean;
  continueFreePlay: boolean;
  failedReasons: string[];
}

export type OfficialRank =
  | '正一品'
  | '从一品'
  | '正二品'
  | '从二品'
  | '正三品'
  | '从三品'
  | '正四品'
  | '从四品'
  | '正五品'
  | '从五品';

const rankWeight: Record<OfficialRank, number> = {
  正一品: 10,
  从一品: 9,
  正二品: 8,
  从二品: 7,
  正三品: 6,
  从三品: 5,
  正四品: 4,
  从四品: 3,
  正五品: 2,
  从五品: 1,
};

const isHigherThanCongSanPin = (rank: OfficialRank): boolean => rankWeight[rank] > rankWeight['从三品'];

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export const createLanyinStartState = (overrides: Partial<LanyinStartState> = {}): LanyinStartState => {
  const aptitudePoints = overrides.aptitudePoints ?? randomInt(48, 51);
  if (aptitudePoints < 48 || aptitudePoints > 51) {
    throw new Error('LANYIN_APTITUDE_POINTS_OUT_OF_RANGE');
  }

  return {
    name: overrides.name ?? '谢令仪',
    familyBackgroundId: overrides.familyBackgroundId ?? 'zhen_state_duke',
    aptitudePoints,
    age: overrides.age ?? randomInt(15, 23),
    prestige: 2500,
    silver: 1000,
    stress: 30,
    emperorFavor: overrides.emperorFavor ?? randomInt(40, 60),
    emperorTrueHeart: overrides.emperorTrueHeart ?? randomInt(20, 50),
  };
};

export const applyGlobalStressLifeListener = (state: PlayerStressState, xunPassed = 1): PlayerStressState => {
  if (state.stress > 80) {
    return {
      ...state,
      life: Number((state.life - 0.2 * xunPassed).toFixed(4)),
    };
  }
  return state;
};

export const applyNpcMadnessCheck = (
  npc: NpcStressState,
  madnessProbability: number,
  randomValue: number,
): NpcStressState => {
  if (npc.isMad) {
    return {
      ...npc,
      canServeEmperor: false,
    };
  }
  const trigger = randomValue < madnessProbability;
  if (!trigger) {
    return npc;
  }
  return {
    ...npc,
    isMad: true,
    canServeEmperor: false,
  };
};

interface EndingRule {
  endingId: LanyinEndingId;
  title: string;
  color: '#FF0800' | '#E840B2' | '#7371D8' | '#70D1D7';
  continueFreePlay: boolean;
  validate: (ctx: LanyinEndingContext) => string[];
}

const endingRules: EndingRule[] = [
  {
    endingId: 'only-me-supreme',
    title: '唯我独尊（凤御天下）',
    color: '#FF0800',
    continueFreePlay: false,
    validate: (ctx) => {
      const failed: string[] = [];
      if (!ctx.emperorDeposed) failed.push('EMPEROR_NOT_DEPOSED');
      if (!ctx.selfEnthroned) failed.push('SELF_NOT_ENTHRONED');
      if (ctx.hasCrownPrince) failed.push('CROWN_PRINCE_EXISTS');
      if (ctx.prestige < 4000) failed.push('PRESTIGE_LT_4000');
      if (ctx.politics < 95) failed.push('POLITICS_LT_95');
      if (!(ctx.ambition > 80)) failed.push('AMBITION_NOT_GT_80');
      if (ctx.emperorFavor < 80) failed.push('EMPEROR_FAVOR_LT_80');
      if (!(ctx.trueHeart > 80)) failed.push('TRUE_HEART_NOT_GT_80');
      if (!isHigherThanCongSanPin(ctx.fatherOfficialRank)) failed.push('FATHER_RANK_NOT_HIGHER_THAN_CONG_SAN_PIN');
      if (ctx.courtLoyalty < 80) failed.push('COURT_LOYALTY_LT_80');
      if (!ctx.hasTigerTally) failed.push('TIGER_TALLY_MISSING');
      return failed;
    },
  },
  {
    endingId: 'regent-pinnacle',
    title: '权力巅峰（垂帘听政）',
    color: '#FF0800',
    continueFreePlay: false,
    validate: (ctx) => {
      const failed: string[] = [];
      if (!ctx.emperorDead) failed.push('EMPEROR_NOT_DEAD');
      if (!(typeof ctx.heirAge === 'number' && ctx.heirAge < 10)) failed.push('HEIR_NOT_UNDER_10');
      if (ctx.politics < 80) failed.push('POLITICS_LT_80');
      if (ctx.intrigue < 800) failed.push('INTRIGUE_LT_800');
      if (!(ctx.ambition > 80)) failed.push('AMBITION_NOT_GT_80');
      return failed;
    },
  },
  {
    endingId: 'exclusive-heart',
    title: '独占帝心（六宫虚设）',
    color: '#E840B2',
    continueFreePlay: true,
    validate: (ctx) => {
      const failed: string[] = [];
      if (!ctx.emperorAlive) failed.push('EMPEROR_NOT_ALIVE');
      if (!ctx.eventFlags.trueHeartHardToGet) failed.push('EVENT_TRUE_HEART_HARD_TO_GET_MISSING');
      if (!ctx.eventFlags.emperorDismissedHarem) failed.push('EVENT_DISMISS_HAREM_MISSING');
      if (!(ctx.emperorFavor > 90)) failed.push('EMPEROR_FAVOR_NOT_GT_90');
      if (!(ctx.trueHeart > 90)) failed.push('TRUE_HEART_NOT_GT_90');
      return failed;
    },
  },
  {
    endingId: 'harem-sovereign',
    title: '后宫共主（母仪千古）',
    color: '#7371D8',
    continueFreePlay: true,
    validate: (ctx) => {
      const failed: string[] = [];
      if (!ctx.emperorAlive) failed.push('EMPEROR_NOT_ALIVE');
      if (ctx.haremCount < 8) failed.push('HAREM_COUNT_LT_8');
      if (!ctx.allConsortsFavorAbove70) failed.push('CONSORT_FAVOR_NOT_ALL_ABOVE_70');
      if (ctx.ambition > 40) failed.push('AMBITION_GT_40');
      return failed;
    },
  },
  {
    endingId: 'retire-mountains',
    title: '归隐山林（相忘江湖）',
    color: '#70D1D7',
    continueFreePlay: false,
    validate: (ctx) => {
      const failed: string[] = [];
      if (!ctx.eventFlags.fakeDeathTriggered) failed.push('EVENT_FAKE_DEATH_NOT_TRIGGERED');
      if (!(ctx.medicine > 80)) failed.push('MEDICINE_NOT_GT_80');
      if (!(ctx.physique > 700)) failed.push('PHYSIQUE_NOT_GT_700');
      if (!ctx.craftedFakeDeathMedicine) failed.push('FAKE_DEATH_MEDICINE_NOT_CRAFTED');
      const helperOk =
        (ctx.taiyiFavor > 80 && ctx.taiyiWillingAssist) || (ctx.foziFavor > 80 && ctx.foziWillingAssist);
      if (!helperOk) failed.push('NO_VALID_HELPER');
      if (!ctx.eventFlags.fakeDeathFlowCompleted) failed.push('FAKE_DEATH_FLOW_NOT_COMPLETED');
      if (!ctx.eventFlags.escapedPalace) failed.push('NOT_ESCAPED_PALACE');
      return failed;
    },
  },
];

export const endingValidationTable = endingRules.map((rule) => ({
  endingId: rule.endingId,
  title: rule.title,
  color: rule.color,
  continueFreePlay: rule.continueFreePlay,
}));

export const validateLanyinEndings = (ctx: LanyinEndingContext): EndingValidationResult[] => {
  return endingRules.map((rule) => {
    const failedReasons = rule.validate(ctx);
    return {
      endingId: rule.endingId,
      title: rule.title,
      color: rule.color,
      continueFreePlay: rule.continueFreePlay,
      achieved: failedReasons.length === 0,
      failedReasons,
    };
  });
};
