import type {
  ConcubineProfile,
  NightlyServiceGentleBranchId,
  NightlyServiceInteractionActionId,
  NightlyServiceInteractionChoice,
  NightlyServiceNightNotice,
  NightlyServiceOutcome,
  NightlyServicePendingEvent,
  NightlyServiceReport,
  NightlyServiceRolls,
  RouteId,
} from '../types';
import { convertFortunePoints } from '../../config/formulas';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(value)));

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => (sum + char.charCodeAt(0) * (index + 41)) % 10000, 0);

const seededRoll = (seed: string, salt: string): number => (hashSeed(`${seed}:${salt}`) % 100) + 1;

const normalizeRoll = (value: number | undefined, seed: string, salt: string): number =>
  clamp(Number.isFinite(value) ? Number(value) : seededRoll(seed, salt), 1, 100);

const getEmperorAloneRate = (mood: number): number => {
  if (mood <= -50) return 50;
  if (mood <= 0) return 35;
  if (mood <= 20) return 25;
  if (mood <= 50) return 15;
  if (mood <= 70) return 10;
  return 5;
};

const getFavorWeight = (favor: number): number => {
  if (favor <= 0) return 0;
  if (favor <= 20) return 10;
  if (favor <= 40) return 20;
  if (favor <= 60) return 35;
  if (favor <= 80) return 50;
  return 65;
};

const getInterestEffects = (interest: number) => {
  if (interest < 40) {
    return { emperorMoodDelta: -3, favorDelta: -2, trueHeartDelta: -1, prestigeDelta: 0 };
  }
  if (interest < 70) {
    return { emperorMoodDelta: 3, favorDelta: 2, trueHeartDelta: 1, prestigeDelta: 0 };
  }
  if (interest < 90) {
    return { emperorMoodDelta: 5, favorDelta: 4, trueHeartDelta: 2, prestigeDelta: 0 };
  }
  if (interest < 100) {
    return { emperorMoodDelta: 7, favorDelta: 6, trueHeartDelta: 4, prestigeDelta: 0 };
  }
  return { emperorMoodDelta: 10, favorDelta: 8, trueHeartDelta: 6, prestigeDelta: 10 };
};

export const NIGHTLY_SERVICE_INTERACTION_ACTIONS: {
  id: NightlyServiceInteractionActionId;
  label: string;
  feedback: string;
}[] = [
  {
    id: 'music',
    label: '鼓瑟抚琴',
    feedback: '你按住弦音，先避开锋芒，再让曲调一点点转暖。殿中灯影微动，皇帝听完半阙，神色比方才缓了些。',
  },
  {
    id: 'poetry',
    label: '吟诗作对',
    feedback: '你顺着案上诗句接了一联，不急着卖弄，只把用典落在恰到好处的地方。皇帝抬眼看你，似是终于听进去了。',
  },
  {
    id: 'shy',
    label: '羞却还从',
    feedback: '你退了半步，又在他开口前垂眸应声。进退之间不失分寸，殿内原本冷淡的气息稍稍松开。',
  },
  {
    id: 'curtain',
    label: '帷幔戏语',
    feedback: '你隔着帷幔轻声回话，字句不重，却带着一点不肯尽露的灵动。皇帝的目光在帘影间停了片刻。',
  },
  {
    id: 'gentle',
    label: '温言絮语',
    feedback: '你没有急着求赏，只把今日见闻慢慢说给他听。话到末处，殿中静下来，像是连烛火也跟着温顺了些。',
  },
];

const getScaledStat = (stats: Record<string, number>, key: string): number => {
  const value = Number(stats[key] ?? 0);
  return value <= 10 ? value * 100 : value;
};

export const resolveNightlyServiceActionDelta = (
  actionId: NightlyServiceInteractionActionId,
  stats: Record<string, number>,
): number => {
  switch (actionId) {
    case 'music': {
      const talent = Number(stats.talent ?? 0);
      if (talent > 8) return 15;
      if (talent > 5) return 5;
      return 0;
    }
    case 'poetry':
      return Number(stats.poetry ?? 0) > 8 ? 15 : -10;
    case 'shy': {
      const temperament = getScaledStat(stats, 'temperament');
      if (temperament > 900) return 25;
      if (temperament > 800) return 20;
      if (temperament > 600) return 10;
      return -10;
    }
    case 'curtain': {
      const appearance = getScaledStat(stats, 'appearance');
      if (appearance > 900) return 25;
      if (appearance > 800) return 20;
      if (appearance > 600) return 10;
      return -10;
    }
    case 'gentle':
      return 20;
    default:
      return 0;
  }
};

const normalizeNightlyServiceChoice = (choice: NightlyServiceInteractionActionId | NightlyServiceInteractionChoice): NightlyServiceInteractionChoice =>
  typeof choice === 'string' ? { actionId: choice } : choice;

export const resolveNightlyServiceChoiceDelta = (
  choice: NightlyServiceInteractionActionId | NightlyServiceInteractionChoice,
  stats: Record<string, number>,
): number => {
  const normalized = normalizeNightlyServiceChoice(choice);
  if (normalized.actionId !== 'gentle') {
    return resolveNightlyServiceActionDelta(normalized.actionId, stats);
  }

  return !normalized.gentleBranchId || normalized.gentleBranchId === 'comfort' ? 20 : 0;
};

const getThirdPartyFavorMagnitude = (seed: string): number => 3 + (hashSeed(seed) % 3);

const resolveOtherConsortPlayerFavorEffect = (
  consort: ConcubineProfile,
  roll: number,
  seed: string,
): { playerFavorDelta: number; line?: string } => {
  const relationToPlayer = Number(consort.stats.relationToPlayer ?? 0);
  const consortLabel = `${consort.rankLabel}${consort.name}`;

  if (relationToPlayer > 0 && roll <= 80) {
    const playerFavorDelta = getThirdPartyFavorMagnitude(`${seed}:other-consort-praise:${consort.id}`);
    return {
      playerFavorDelta,
      line: `${consortLabel}侍寝后替玩家美言，玩家宠爱+${playerFavorDelta}。`,
    };
  }

  if (relationToPlayer < 0 && roll <= 20) {
    const playerFavorDelta = -getThirdPartyFavorMagnitude(`${seed}:other-consort-smear:${consort.id}`);
    return {
      playerFavorDelta,
      line: `${consortLabel}侍寝后向皇帝抹黑玩家，玩家宠爱${playerFavorDelta}。`,
    };
  }

  return { playerFavorDelta: 0 };
};

const resolveGentleThirdPartyEffect = (
  choices: NightlyServiceInteractionChoice[],
  concubines: ConcubineProfile[] = [],
  pendingEvent: NightlyServicePendingEvent,
):
  | {
      targetConsortId: string;
      targetName: string;
      favorDelta: number;
      branchId: Exclude<NightlyServiceGentleBranchId, 'comfort'>;
    }
  | undefined => {
  const thirdPartyChoice = choices.find(
    (choice) =>
      choice.actionId === 'gentle' &&
      (choice.gentleBranchId === 'praise' || choice.gentleBranchId === 'smear') &&
      Boolean(choice.targetConsortId),
  );

  if (!thirdPartyChoice?.targetConsortId || (thirdPartyChoice.gentleBranchId !== 'praise' && thirdPartyChoice.gentleBranchId !== 'smear')) {
    return undefined;
  }

  const target = concubines.find((consort) => consort.id === thirdPartyChoice.targetConsortId);
  if (!target) {
    return undefined;
  }

  const magnitude = getThirdPartyFavorMagnitude(`${pendingEvent.id}:${thirdPartyChoice.gentleBranchId}:${target.id}`);
  return {
    targetConsortId: target.id,
    targetName: `${target.rankLabel}${target.name}`,
    favorDelta: thirdPartyChoice.gentleBranchId === 'praise' ? magnitude : -magnitude,
    branchId: thirdPartyChoice.gentleBranchId,
  };
};

const resolvePlayerServicePregnancy = (
  pendingEvent: NightlyServicePendingEvent,
  stats: Record<string, number>,
): { succeeded: boolean; rate: number; roll: number } | undefined => {
  if (pendingEvent.outcome !== 'player-service') {
    return undefined;
  }

  const rate = clamp(convertFortunePoints(Number(stats.fortune ?? 0)), 0, 100);
  const roll = normalizeRoll(pendingEvent.pregnancyRoll, pendingEvent.id, 'pregnancy-result');
  return {
    succeeded: rate > 0 && roll <= rate,
    rate,
    roll,
  };
};

const isAvailableConsort = (consort: ConcubineProfile): boolean =>
  consort.status === 'live' &&
  !consort.conditionFlags?.madness &&
  !consort.residence.includes('冷宫') &&
  consort.stats.favor > 0;

const buildReport = ({
  routeId,
  timeKey,
  outcome,
  targetId,
  targetName,
  interest,
  playerFavorDelta,
  playerTrueHeartDelta,
  playerPrestigeDelta,
  emperorMoodDelta,
  lines,
}: {
  routeId: RouteId;
  timeKey: string;
  outcome: NightlyServiceOutcome;
  targetId?: string;
  targetName?: string;
  interest: number;
  playerFavorDelta: number;
  playerTrueHeartDelta: number;
  playerPrestigeDelta: number;
  emperorMoodDelta: number;
  lines: string[];
}): NightlyServiceReport => {
  const [year = 1, month = 1, xun = 1] = timeKey.split('-').map((part) => Number(part));
  const summary = lines.join(' ');
  return {
    id: `nightly-${routeId}-${timeKey}-${outcome}`,
    xunKey: timeKey,
    year,
    month,
    xun,
    outcome,
    targetId,
    targetName,
    interest,
    playerFavorDelta,
    playerTrueHeartDelta,
    playerPrestigeDelta,
    emperorMoodDelta,
    summary,
    lines,
  };
};

const buildNightNotice = ({
  routeId,
  timeKey,
  outcome,
  targetName,
  lines,
}: {
  routeId: RouteId;
  timeKey: string;
  outcome: NightlyServiceOutcome;
  targetName?: string;
  lines: string[];
}): NightlyServiceNightNotice => ({
  id: `nightly-notice-${routeId}-${timeKey}-${outcome}`,
  timeKey,
  outcome,
  targetName,
  lines,
});

export interface NightlyServiceInput {
  routeId: RouteId;
  timeKey: string;
  player: {
    name: string;
    favor: number;
    trueHeart: number;
    rankLabel: string;
    pregnant: boolean;
  };
  concubines: ConcubineProfile[];
  emperorMood: number;
  playerNightFavorGauge: number;
  deferPlayerService?: boolean;
  rolls?: NightlyServiceRolls;
}

export interface NightlyServiceResolution {
  outcome: NightlyServiceOutcome;
  nextPlayerNightFavorGauge: number;
  nextEmperorMood: number;
  targetConsortId?: string;
  targetConsortFavorDelta: number;
  effects: {
    playerFavorDelta: number;
    playerTrueHeartDelta: number;
    playerPrestigeDelta: number;
    emperorMoodDelta: number;
  };
  report: NightlyServiceReport;
  pendingEvent?: NightlyServicePendingEvent;
  notice: NightlyServiceNightNotice;
  morningLines: string[];
  lines: string[];
}

export interface PlayerNightlyServiceEventInput {
  routeId: RouteId;
  pendingEvent: NightlyServicePendingEvent;
  player: {
    name: string;
    favor: number;
    trueHeart: number;
    rankLabel: string;
    stats: Record<string, number>;
  };
  emperorMood: number;
  actionIds: NightlyServiceInteractionActionId[];
  actionChoices?: NightlyServiceInteractionChoice[];
  concubines?: ConcubineProfile[];
}

export interface PlayerNightlyServiceEventResolution {
  finalInterest: number;
  nextEmperorMood: number;
  nextPlayerNightFavorGauge: number;
  effects: {
    playerFavorDelta: number;
    playerTrueHeartDelta: number;
    playerPrestigeDelta: number;
    emperorMoodDelta: number;
  };
  thirdPartyEffect?: {
    targetConsortId: string;
    targetName: string;
    favorDelta: number;
      branchId: Exclude<NightlyServiceGentleBranchId, 'comfort'>;
  };
  pregnancy?: {
    succeeded: boolean;
    rate: number;
    roll: number;
  };
  report: NightlyServiceReport;
  lines: string[];
}

export const resolveNightlyService = (input: NightlyServiceInput): NightlyServiceResolution => {
  const seed = `${input.routeId}:${input.timeKey}`;
  const aloneRate = getEmperorAloneRate(input.emperorMood);
  const aloneRoll = normalizeRoll(input.rolls?.alone, seed, 'alone');
  const interest = normalizeRoll(input.rolls?.interest, seed, 'interest');

  if (aloneRoll <= aloneRate) {
    const lines = [`夜里太监来报：皇帝心绪不展，本旬夜间皇帝独寝。玩家侍寝保底值+2，当前为${clamp(input.playerNightFavorGauge + 2, 0, 100)}。`];
    const report = buildReport({
      routeId: input.routeId,
      timeKey: input.timeKey,
      outcome: 'emperor-alone',
      interest: 0,
      playerFavorDelta: 0,
      playerTrueHeartDelta: 0,
      playerPrestigeDelta: 0,
      emperorMoodDelta: 0,
      lines,
    });
    return {
      outcome: 'emperor-alone',
      nextPlayerNightFavorGauge: clamp(input.playerNightFavorGauge + 2, 0, 100),
      nextEmperorMood: input.emperorMood,
      targetConsortFavorDelta: 0,
      effects: { playerFavorDelta: 0, playerTrueHeartDelta: 0, playerPrestigeDelta: 0, emperorMoodDelta: 0 },
      report,
      notice: buildNightNotice({ routeId: input.routeId, timeKey: input.timeKey, outcome: 'emperor-alone', lines: [lines[0]] }),
      morningLines: lines.slice(1),
      lines,
    };
  }

  const playerWeight = getFavorWeight(input.player.favor);
  const candidates = input.concubines.filter(isAvailableConsort);
  const totalWeight = playerWeight + candidates.reduce((sum, consort) => sum + getFavorWeight(consort.stats.favor), 0);
  const playerBaseChance = totalWeight > 0 ? Math.round((playerWeight / totalWeight) * (100 - aloneRate)) : 0;
  const playerChance = clamp(playerBaseChance + input.playerNightFavorGauge, 0, 100 - aloneRate);
  const playerRoll = normalizeRoll(input.rolls?.player, seed, 'player');

  if (playerWeight > 0 && playerRoll <= playerChance) {
    if (input.deferPlayerService) {
      const [year = 1, month = 1, xun = 1] = input.timeKey.split('-').map((part) => Number(part));
      const outcome = input.player.pregnant ? 'player-companion' : 'player-service';
      const lines = [
        outcome === 'player-companion'
          ? '夜里太监来报：养心殿传召娘娘前去陪伴。'
          : '夜里太监来报：养心殿传召娘娘侍寝。',
      ];
      const report = buildReport({
        routeId: input.routeId,
        timeKey: input.timeKey,
        outcome,
        targetId: 'player',
        targetName: input.player.name,
        interest: 0,
        playerFavorDelta: 0,
        playerTrueHeartDelta: 0,
        playerPrestigeDelta: 0,
        emperorMoodDelta: 0,
        lines,
      });
      const pendingEvent: NightlyServicePendingEvent = {
        id: `nightly-${input.routeId}-${input.timeKey}-${outcome}-pending`,
        timeKey: input.timeKey,
        year,
        month,
        xun,
        outcome,
        playerName: input.player.name,
        rankLabel: input.player.rankLabel,
        initialInterest: interest,
        currentInterest: interest,
        interactionCount: 0,
        maxInteractions: 3,
        selectedActionIds: [],
        stage: 'notice',
        pregnancyRoll: normalizeRoll(input.rolls?.pregnancy, seed, 'pregnancy'),
      };
      return {
        outcome,
        nextPlayerNightFavorGauge: input.playerNightFavorGauge,
        nextEmperorMood: input.emperorMood,
        targetConsortFavorDelta: 0,
        effects: { playerFavorDelta: 0, playerTrueHeartDelta: 0, playerPrestigeDelta: 0, emperorMoodDelta: 0 },
        report,
        pendingEvent,
        notice: buildNightNotice({ routeId: input.routeId, timeKey: input.timeKey, outcome, targetName: input.player.name, lines: [lines[0]] }),
        morningLines: [],
        lines,
      };
    }

    const effects = getInterestEffects(interest);
    const lines = [
      `夜里太监来报：养心殿召娘娘侍寝。本次兴致${interest}，宠爱${effects.favorDelta >= 0 ? '+' : ''}${effects.favorDelta}，真心${effects.trueHeartDelta >= 0 ? '+' : ''}${effects.trueHeartDelta}${effects.prestigeDelta ? `，声望+${effects.prestigeDelta}` : ''}。`,
      '本旬玩家已承宠，侍寝保底值归零。',
    ];
    const report = buildReport({
      routeId: input.routeId,
      timeKey: input.timeKey,
      outcome: input.player.pregnant ? 'player-companion' : 'player-service',
      targetId: 'player',
      targetName: input.player.name,
      interest,
      playerFavorDelta: effects.favorDelta,
      playerTrueHeartDelta: effects.trueHeartDelta,
      playerPrestigeDelta: effects.prestigeDelta,
      emperorMoodDelta: effects.emperorMoodDelta,
      lines,
    });
    return {
      outcome: report.outcome,
      nextPlayerNightFavorGauge: 0,
      nextEmperorMood: clamp(input.emperorMood + effects.emperorMoodDelta, -100, 100),
      targetConsortFavorDelta: 0,
      effects: {
        playerFavorDelta: effects.favorDelta,
        playerTrueHeartDelta: effects.trueHeartDelta,
        playerPrestigeDelta: effects.prestigeDelta,
        emperorMoodDelta: effects.emperorMoodDelta,
      },
      report,
      notice: buildNightNotice({
        routeId: input.routeId,
        timeKey: input.timeKey,
        outcome: report.outcome,
        targetName: input.player.name,
        lines: [lines[0]],
      }),
      morningLines: lines.slice(1),
      lines,
    };
  }

  if (candidates.length === 0) {
    const nextGauge = clamp(input.playerNightFavorGauge + 2, 0, 100);
    const lines = [`夜里太监来报：后宫无人入选，本旬皇帝独寝。玩家侍寝保底值+2，当前为${nextGauge}。`];
    const report = buildReport({
      routeId: input.routeId,
      timeKey: input.timeKey,
      outcome: 'emperor-alone',
      interest: 0,
      playerFavorDelta: 0,
      playerTrueHeartDelta: 0,
      playerPrestigeDelta: 0,
      emperorMoodDelta: 0,
      lines,
    });
    return {
      outcome: 'emperor-alone',
      nextPlayerNightFavorGauge: nextGauge,
      nextEmperorMood: input.emperorMood,
      targetConsortFavorDelta: 0,
      effects: { playerFavorDelta: 0, playerTrueHeartDelta: 0, playerPrestigeDelta: 0, emperorMoodDelta: 0 },
      report,
      notice: buildNightNotice({ routeId: input.routeId, timeKey: input.timeKey, outcome: 'emperor-alone', lines: [lines[0]] }),
      morningLines: lines.slice(1),
      lines,
    };
  }

  const poolTotal = candidates.reduce((sum, consort) => sum + getFavorWeight(consort.stats.favor), 0);
  const poolRoll = normalizeRoll(input.rolls?.pool, seed, 'pool');
  let cursor = 0;
  const target =
    candidates.find((consort) => {
      cursor += Math.max(1, Math.round((getFavorWeight(consort.stats.favor) / poolTotal) * 100));
      return poolRoll <= cursor;
    }) ?? candidates[candidates.length - 1];
  const effects = getInterestEffects(interest);
  const nextGauge = clamp(input.playerNightFavorGauge + 2, 0, 100);
  const playerFavorEffect = resolveOtherConsortPlayerFavorEffect(
    target,
    normalizeRoll(input.rolls?.thirdParty, seed, 'third-party-player-favor'),
    seed,
  );
  const lines = [
    `夜里太监来报：本旬由${target.rankLabel}${target.name}侍寝。本次兴致${interest}，其宠爱${effects.favorDelta >= 0 ? '+' : ''}${effects.favorDelta}。`,
    ...(playerFavorEffect.line ? [playerFavorEffect.line] : []),
    `玩家本旬未被召幸，侍寝保底值+2，当前为${nextGauge}。`,
  ];
  const report = buildReport({
    routeId: input.routeId,
    timeKey: input.timeKey,
    outcome: 'other-consort-service',
    targetId: target.id,
    targetName: `${target.rankLabel}${target.name}`,
    interest,
    playerFavorDelta: playerFavorEffect.playerFavorDelta,
    playerTrueHeartDelta: 0,
    playerPrestigeDelta: 0,
    emperorMoodDelta: effects.emperorMoodDelta,
    lines,
  });
  return {
    outcome: 'other-consort-service',
    nextPlayerNightFavorGauge: nextGauge,
    nextEmperorMood: clamp(input.emperorMood + effects.emperorMoodDelta, -100, 100),
    targetConsortId: target.id,
    targetConsortFavorDelta: effects.favorDelta,
    effects: {
      playerFavorDelta: playerFavorEffect.playerFavorDelta,
      playerTrueHeartDelta: 0,
      playerPrestigeDelta: 0,
      emperorMoodDelta: effects.emperorMoodDelta,
    },
    report,
    notice: buildNightNotice({
      routeId: input.routeId,
      timeKey: input.timeKey,
      outcome: 'other-consort-service',
      targetName: `${target.rankLabel}${target.name}`,
      lines: [lines[0]],
    }),
    morningLines: lines.slice(1),
    lines,
  };
};

export const resolvePlayerNightlyServiceEvent = (
  input: PlayerNightlyServiceEventInput,
): PlayerNightlyServiceEventResolution => {
  const choices = (input.actionChoices ?? input.actionIds.map((actionId) => ({ actionId })))
    .map(normalizeNightlyServiceChoice)
    .slice(0, input.pendingEvent.maxInteractions);
  const finalInterest = clamp(
    choices.reduce(
      (interest, choice) => interest + resolveNightlyServiceChoiceDelta(choice, input.player.stats),
      input.pendingEvent.initialInterest,
    ),
    20,
    100,
  );
  const effects = getInterestEffects(finalInterest);
  const thirdPartyEffect = resolveGentleThirdPartyEffect(choices, input.concubines, input.pendingEvent);
  const pregnancy = resolvePlayerServicePregnancy(input.pendingEvent, input.player.stats);
  const lines = [
    `养心殿侍寝已毕。本次兴致${finalInterest}，宠爱${effects.favorDelta >= 0 ? '+' : ''}${effects.favorDelta}，真心${
      effects.trueHeartDelta >= 0 ? '+' : ''
    }${effects.trueHeartDelta}${effects.prestigeDelta ? `，声望+${effects.prestigeDelta}` : ''}。`,
    ...(pregnancy?.succeeded ? ['太医请脉后低声回禀：娘娘脉象有喜，已按例记入内廷医案。'] : []),
    ...(thirdPartyEffect
      ? [
          thirdPartyEffect.branchId === 'praise'
            ? `你在言语间替${thirdPartyEffect.targetName}留了余地，${thirdPartyEffect.targetName}宠爱+${thirdPartyEffect.favorDelta}。`
            : `你在言语间点到${thirdPartyEffect.targetName}的错处，${thirdPartyEffect.targetName}宠爱${thirdPartyEffect.favorDelta}。`,
        ]
      : []),
    '本旬玩家已承宠，侍寝保底值归零。',
  ];
  const report = buildReport({
    routeId: input.routeId,
    timeKey: input.pendingEvent.timeKey,
    outcome: input.pendingEvent.outcome,
    targetId: 'player',
    targetName: input.player.name,
    interest: finalInterest,
    playerFavorDelta: effects.favorDelta,
    playerTrueHeartDelta: effects.trueHeartDelta,
    playerPrestigeDelta: effects.prestigeDelta,
    emperorMoodDelta: effects.emperorMoodDelta,
    lines,
  });

  return {
    finalInterest,
    nextEmperorMood: clamp(input.emperorMood + effects.emperorMoodDelta, -100, 100),
    nextPlayerNightFavorGauge: 0,
    effects: {
      playerFavorDelta: effects.favorDelta,
      playerTrueHeartDelta: effects.trueHeartDelta,
      playerPrestigeDelta: effects.prestigeDelta,
      emperorMoodDelta: effects.emperorMoodDelta,
    },
    thirdPartyEffect,
    pregnancy,
    report,
    lines,
  };
};
