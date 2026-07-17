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
import {
  getNightlyRuleValue,
  numericNightlyEmperorAloneRateBands,
  numericNightlyFavorWeightBands,
  numericNightlyInterestEffects,
} from '../numerics/numericCatalog';
import {
  evaluateNightlyServiceFormula,
  resolveGentleBranchFormulaVariables,
  resolveNightlyFormulaIdForAction,
} from '../numerics/formulas/nightlyServiceFormulas';
import { getConcubineDisplayRankText, getConcubineRankWeightByLabel } from '../data/concubineRoster';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(value)));

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => (sum + char.charCodeAt(0) * (index + 41)) % 10000, 0);

const seededRoll = (seed: string, salt: string): number => (hashSeed(`${seed}:${salt}`) % 100) + 1;

const normalizeRoll = (value: number | undefined, seed: string, salt: string): number =>
  clamp(Number.isFinite(value) ? Number(value) : seededRoll(seed, salt), 1, 100);

const getEmperorAloneRate = (mood: number): number => {
  return numericNightlyEmperorAloneRateBands.find((band) => mood <= band.max)?.value ?? 5;
};

const getFavorWeight = (favor: number): number => {
  return numericNightlyFavorWeightBands.find((band) => favor <= band.max)?.value ?? 0;
};

const getInterestEffects = (interest: number) => {
  return (
    numericNightlyInterestEffects.find((effect) => interest >= effect.minInterest && interest <= effect.maxInterest) ?? {
      emperorMoodDelta: 0,
      favorDelta: 0,
      trueHeartDelta: 0,
      prestigeDelta: 0,
    }
  );
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

const getSkillLevel = (stats: Record<string, number>, key: string): number => {
  const value = Number(stats[key] ?? 0);
  return value > 10 ? value / 10 : value;
};

export const resolveNightlyServiceActionDelta = (
  actionId: NightlyServiceInteractionActionId,
  stats: Record<string, number>,
): number => {
  const formulaId = resolveNightlyFormulaIdForAction(actionId);
  return evaluateNightlyServiceFormula(formulaId, {
    music: getSkillLevel(stats, 'talent'),
    poetry: getSkillLevel(stats, 'poetry'),
    temperament: getScaledStat(stats, 'temperament'),
    appearance: getScaledStat(stats, 'appearance'),
    branchIsComfort: 1,
  });
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

  return evaluateNightlyServiceFormula('gentleDelta', resolveGentleBranchFormulaVariables(normalized.gentleBranchId));
};

const getThirdPartyFavorMagnitude = (seed: string): number => {
  const min = getNightlyRuleValue('third_party_favor_min');
  const max = getNightlyRuleValue('third_party_favor_max');
  return evaluateNightlyServiceFormula('thirdPartyFavorMagnitude', {
    thirdPartyFavorMin: min,
    hashRemainder: hashSeed(seed) % (max - min + 1),
  });
};

const getOtherConsortPraisePrestigeDelta = (consort: ConcubineProfile): number => {
  const rankWeight = getConcubineRankWeightByLabel(getConcubineDisplayRankText(consort));
  const base = getNightlyRuleValue('other_consort_praise_prestige_base');
  const baselineWeight = getNightlyRuleValue('other_consort_praise_prestige_baseline_weight');
  const weightStep = Math.max(1, getNightlyRuleValue('other_consort_praise_prestige_rank_weight_step'));
  return clamp(
    base + Math.floor(Math.max(0, rankWeight - baselineWeight) / weightStep),
    getNightlyRuleValue('other_consort_praise_prestige_min'),
    getNightlyRuleValue('other_consort_praise_prestige_max'),
  );
};

const resolveOtherConsortPlayerFavorEffect = (
  consort: ConcubineProfile,
  roll: number,
  seed: string,
): { playerFavorDelta: number; playerPrestigeDelta: number; line?: string } => {
  const relationToPlayer = Number(consort.stats.relationToPlayer ?? 0);
  const consortLabel = `${consort.rankLabel}${consort.name}`;

  if (
    relationToPlayer > getNightlyRuleValue('other_consort_praise_relation_min_exclusive') &&
    roll <= getNightlyRuleValue('other_consort_praise_roll_chance')
  ) {
    const playerFavorDelta = getThirdPartyFavorMagnitude(`${seed}:other-consort-praise:${consort.id}`);
    const playerPrestigeDelta = getOtherConsortPraisePrestigeDelta(consort);
    return {
      playerFavorDelta,
      playerPrestigeDelta,
      line: `${consortLabel}侍寝后替玩家美言，皇帝对小主的态度略有松动。`,
    };
  }

  if (
    relationToPlayer < getNightlyRuleValue('other_consort_smear_relation_max_exclusive') &&
    roll <= getNightlyRuleValue('other_consort_smear_roll_chance')
  ) {
    const playerFavorDelta = -getThirdPartyFavorMagnitude(`${seed}:other-consort-smear:${consort.id}`);
    return {
      playerFavorDelta,
      playerPrestigeDelta: 0,
      line: `${consortLabel}侍寝后向皇帝抹黑玩家，小主在御前的处境多了几分阴影。`,
    };
  }

  return { playerFavorDelta: 0, playerPrestigeDelta: 0 };
};

const getPlayerServiceSummonPrestigeDelta = (outcome: NightlyServiceOutcome): number =>
  outcome === 'player-service' ? getNightlyRuleValue('player_service_summon_prestige_delta') : 0;

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
  const gaugeIncrement = getNightlyRuleValue('player_night_favor_gauge_increment');
  const gaugeMin = getNightlyRuleValue('player_night_favor_gauge_min');
  const gaugeMax = getNightlyRuleValue('player_night_favor_gauge_max');
  const moodMin = getNightlyRuleValue('emperor_mood_min');
  const moodMax = getNightlyRuleValue('emperor_mood_max');

  if (aloneRoll <= aloneRate) {
    const nextGauge = clamp(input.playerNightFavorGauge + gaugeIncrement, gaugeMin, gaugeMax);
    const lines = [
      '夜里太监来报：皇帝心绪不展，本旬夜间皇帝独寝。',
      `本旬未被召幸，侍寝保底值+${gaugeIncrement}，当前为${nextGauge}。`,
    ];
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

  const playerWeight = getFavorWeight(input.player.favor);
  const candidates = input.concubines.filter(isAvailableConsort);
  const totalWeight = playerWeight + candidates.reduce((sum, consort) => sum + getFavorWeight(consort.stats.favor), 0);
  const playerBaseChance = totalWeight > 0 ? Math.round((playerWeight / totalWeight) * (100 - aloneRate)) : 0;
  const playerChance = clamp(playerBaseChance + input.playerNightFavorGauge, gaugeMin, gaugeMax - aloneRate);
  const playerRoll = normalizeRoll(input.rolls?.player, seed, 'player');

  if (playerWeight > 0 && playerRoll <= playerChance) {
    if (input.deferPlayerService) {
      const [year = 1, month = 1, xun = 1] = input.timeKey.split('-').map((part) => Number(part));
      const outcome = input.player.pregnant ? 'player-companion' : 'player-service';
      const lines = [
        outcome === 'player-companion'
          ? '夜里太监来报：养心殿传召小主前去陪伴。'
          : '夜里太监来报：养心殿传召小主侍寝。',
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
        maxInteractions: getNightlyRuleValue('pending_player_max_interactions'),
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

    const outcome = input.player.pregnant ? 'player-companion' : 'player-service';
    const effects = getInterestEffects(interest);
    const playerServiceSummonPrestigeDelta = getPlayerServiceSummonPrestigeDelta(outcome);
    const lines = [
      `夜里太监来报：养心殿召小主侍寝。本次兴致${interest}。`,
      ...(playerServiceSummonPrestigeDelta > 0 ? ['本次召幸已足够让宫中记上一笔。'] : []),
      '本旬已承宠，侍寝保底值归零。',
    ];
    const report = buildReport({
      routeId: input.routeId,
      timeKey: input.timeKey,
      outcome,
      targetId: 'player',
      targetName: input.player.name,
      interest,
      playerFavorDelta: effects.favorDelta,
      playerTrueHeartDelta: effects.trueHeartDelta,
      playerPrestigeDelta: effects.prestigeDelta + playerServiceSummonPrestigeDelta,
      emperorMoodDelta: effects.emperorMoodDelta,
      lines,
    });
    return {
      outcome: report.outcome,
      nextPlayerNightFavorGauge: 0,
      nextEmperorMood: clamp(input.emperorMood + effects.emperorMoodDelta, moodMin, moodMax),
      targetConsortFavorDelta: 0,
      effects: {
        playerFavorDelta: effects.favorDelta,
        playerTrueHeartDelta: effects.trueHeartDelta,
        playerPrestigeDelta: effects.prestigeDelta + playerServiceSummonPrestigeDelta,
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
    const nextGauge = clamp(input.playerNightFavorGauge + gaugeIncrement, gaugeMin, gaugeMax);
    const lines = [
      '夜里太监来报：后宫无人入选，本旬皇帝独寝。',
      `本旬未被召幸，侍寝保底值+${gaugeIncrement}，当前为${nextGauge}。`,
    ];
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
  const nextGauge = clamp(input.playerNightFavorGauge + gaugeIncrement, gaugeMin, gaugeMax);
  const playerFavorEffect = resolveOtherConsortPlayerFavorEffect(
    target,
    normalizeRoll(input.rolls?.thirdParty, seed, 'third-party-player-favor'),
    seed,
  );
  const lines = [
    `夜里太监来报：本旬由${target.rankLabel}${target.name}侍寝。本次兴致${interest}。`,
    ...(playerFavorEffect.line ? [playerFavorEffect.line] : []),
    `本旬未被召幸，侍寝保底值+${gaugeIncrement}，当前为${nextGauge}。`,
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
    playerPrestigeDelta: playerFavorEffect.playerPrestigeDelta,
    emperorMoodDelta: effects.emperorMoodDelta,
    lines,
  });
  return {
    outcome: 'other-consort-service',
    nextPlayerNightFavorGauge: nextGauge,
    nextEmperorMood: clamp(input.emperorMood + effects.emperorMoodDelta, moodMin, moodMax),
    targetConsortId: target.id,
    targetConsortFavorDelta: effects.favorDelta,
    effects: {
      playerFavorDelta: playerFavorEffect.playerFavorDelta,
      playerTrueHeartDelta: 0,
      playerPrestigeDelta: playerFavorEffect.playerPrestigeDelta,
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
    getNightlyRuleValue('final_interest_min'),
    getNightlyRuleValue('final_interest_max'),
  );
  const effects = getInterestEffects(finalInterest);
  const playerServiceSummonPrestigeDelta = getPlayerServiceSummonPrestigeDelta(input.pendingEvent.outcome);
  const thirdPartyEffect = resolveGentleThirdPartyEffect(choices, input.concubines, input.pendingEvent);
  const pregnancy = resolvePlayerServicePregnancy(input.pendingEvent, input.player.stats);
  const lines = [
    `养心殿侍寝已毕。本次兴致${finalInterest}。`,
    ...(playerServiceSummonPrestigeDelta > 0 ? ['本次召幸已足够让宫中记上一笔。'] : []),
    ...(pregnancy?.succeeded ? ['太医请脉后低声回禀：小主脉象有喜，已按例记入内廷医案。'] : []),
    ...(thirdPartyEffect
      ? [
          thirdPartyEffect.branchId === 'praise'
            ? `你在言语间替${thirdPartyEffect.targetName}留了余地，御前听来颇觉顺耳。`
            : `你在言语间点到${thirdPartyEffect.targetName}的错处，御前一时静了下来。`,
        ]
      : []),
    '本旬已承宠，侍寝保底值归零。',
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
    playerPrestigeDelta: effects.prestigeDelta + playerServiceSummonPrestigeDelta,
    emperorMoodDelta: effects.emperorMoodDelta,
    lines,
  });

  return {
    finalInterest,
    nextEmperorMood: clamp(
      input.emperorMood + effects.emperorMoodDelta,
      getNightlyRuleValue('emperor_mood_min'),
      getNightlyRuleValue('emperor_mood_max'),
    ),
    nextPlayerNightFavorGauge: 0,
    effects: {
      playerFavorDelta: effects.favorDelta,
      playerTrueHeartDelta: effects.trueHeartDelta,
      playerPrestigeDelta: effects.prestigeDelta + playerServiceSummonPrestigeDelta,
      emperorMoodDelta: effects.emperorMoodDelta,
    },
    thirdPartyEffect,
    pregnancy,
    report,
    lines,
  };
};
