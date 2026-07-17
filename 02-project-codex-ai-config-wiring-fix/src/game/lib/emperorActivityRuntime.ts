import type {
  EmperorInteractionProgressState,
  EmperorInteractionSource,
  EmperorScheduleSlotState,
  EmperorScheduleState,
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

export const EMPEROR_SCHEDULE_SLOTS: readonly TimeSlot[] = ['清晨', '上午', '中午', '下午', '傍晚', '夜晚', '深夜'] as const;

const slotIndexes = EMPEROR_SCHEDULE_SLOTS.reduce(
  (acc, slot, index) => ({
    ...acc,
    [slot]: index,
  }),
  {} as Record<TimeSlot, number>,
);

const buildSlotTime = (time: PalaceTimeState, slot: TimeSlot): PalaceTimeState => ({
  ...time,
  slot,
  slotIndex: slotIndexes[slot],
  slotProgress: 0,
});

export const getMoodModifier = (mood: number): number => {
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

export const createEmperorSchedule = (routeId: RouteId, time: PalaceTimeState): EmperorScheduleState => {
  const xunKey = getXunKey(time);
  const slots = EMPEROR_SCHEDULE_SLOTS.reduce((acc, slot) => {
    const slotTime = buildSlotTime(time, slot);
    acc[slot] = {
      slot,
      slotIndex: slotIndexes[slot],
      location: resolveEmperorScheduledLocation(routeId, slotTime),
    };
    return acc;
  }, {} as Record<TimeSlot, EmperorScheduleSlotState>);

  return {
    xunKey,
    slots,
  };
};

export const createEmperorInteractionProgress = (
  routeId: RouteId,
  time: PalaceTimeState,
  mood: number,
): EmperorInteractionProgressState => ({
  xunKey: getXunKey(time),
  triggeredEncounterIds: [],
  schedule: createEmperorSchedule(routeId, time),
  mood,
});

export const ensureEmperorInteractionProgress = (
  progress: EmperorInteractionProgressState,
  routeId: RouteId,
  time: PalaceTimeState,
  mood = progress.mood,
): EmperorInteractionProgressState => {
  const xunKey = getXunKey(time);
  if (progress.xunKey !== xunKey || progress.schedule.xunKey !== xunKey) {
    return createEmperorInteractionProgress(routeId, time, mood);
  }
  if (progress.mood !== mood) {
    return {
      ...progress,
      mood,
    };
  }
  return progress;
};

export const getEmperorScheduledLocation = (
  progress: EmperorInteractionProgressState,
  time: PalaceTimeState,
): MapAreaId => progress.schedule.slots[time.slot]?.location ?? '养心殿';

export const isEmperorPublicEncounterAvailable = (
  progress: EmperorInteractionProgressState,
  time: PalaceTimeState,
  location: MapAreaId,
): boolean => EMPEROR_PUBLIC_SLOTS.includes(time.slot) && getEmperorScheduledLocation(progress, time) === location;

export interface EmperorAudienceRequestInput {
  routeId: RouteId;
  time: PalaceTimeState;
  playerFavor: number;
  playerTrueHeart: number;
  emperorMood: number;
  gatekeeperAffinity?: number;
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
        ? '内侍垂手回话：“皇上尚在前朝，小主此时求见，怕是见不着圣驾。”'
        : '内侍低声劝道：“夜色已深，养心殿不再通传后宫求见，请小主回宫歇息。”',
    };
  }

  const seed = `${input.routeId}:${getXunKey(input.time)}:${input.time.slot}:yangxin-request`;
  const gatekeeperModifier = clamp((input.gatekeeperAffinity ?? 0) * 0.25, 0, 24);
  const chance = clamp(
    18 +
      input.playerFavor * 0.35 +
      Math.max(0, input.playerTrueHeart) * 0.25 +
      getMoodModifier(input.emperorMood) +
      slotModifier +
      gatekeeperModifier,
    5,
    92,
  );
  const roll = seededRoll(seed, 'request');
  return {
    success: roll <= chance,
    chance,
    roll,
    line:
      roll <= chance
        ? '内侍入殿通传片刻，躬身出来：“皇上准了，请小主随奴才入殿。”'
        : '内侍入殿通传许久，回来时声音压得更低：“皇上政务未毕，今日恐不得空，请小主先回。”',
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
