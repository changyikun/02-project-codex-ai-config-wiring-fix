import type {
  ConcubineProfile,
  GameNumericsState,
  PalaceStrifeActionKind,
  PalaceStrifeCaseState,
  PalaceStrifeResolution,
  PalaceStrifeRolls,
  PalaceStrifeSeverity,
  YangxinHearingStance,
} from '../types';

interface PalaceStrifeAttemptInput {
  playerState: GameNumericsState;
  target: ConcubineProfile;
  actionKind: PalaceStrifeActionKind;
  methodLabel: string;
  itemLabel: string;
  allyLabel: string;
  framedTargetName?: string;
  time: {
    year: number;
    month: number;
    xun: number;
  };
  rolls?: PalaceStrifeRolls;
}

interface NpcPalaceStrifeGenerationInput {
  concubines: ConcubineProfile[];
  existingCases: PalaceStrifeCaseState[];
  time: {
    year: number;
    month: number;
    xun: number;
  };
  preferredActorConsortId?: string;
  preferredTargetConsortId?: string;
}

const severityModifiers: Record<PalaceStrifeSeverity, { action: number; concealment: number; conviction: number }> = {
  light: { action: 0, concealment: 5, conviction: 0 },
  medium: { action: 5, concealment: 10, conviction: 10 },
  heavy: { action: 10, concealment: 15, conviction: 20 },
};

const investigationGrowthBySeverity: Record<PalaceStrifeSeverity, number> = {
  light: 8,
  medium: 14,
  heavy: 20,
};

const rumorSeverityByLabel: Record<string, PalaceStrifeSeverity> = {
  欺凌宫人: 'light',
  奢侈浪费: 'light',
  与人偷情: 'medium',
  意图谋逆: 'heavy',
  不敬先祖: 'heavy',
};

const frameModifiers = {
  action: 12,
  concealment: 15,
  conviction: 15,
  investigationGrowth: 5,
};

const convictionPenaltyBySeverity: Record<PalaceStrifeSeverity, { prestigeDelta: number; favorDelta: number; stressDelta: number }> = {
  light: { prestigeDelta: -150, favorDelta: -3, stressDelta: 0 },
  medium: { prestigeDelta: -350, favorDelta: -6, stressDelta: 5 },
  heavy: { prestigeDelta: -750, favorDelta: -10, stressDelta: 10 },
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const round = (value: number): number => Math.round(value);

const normalizePlayerScore = (value: number, tenPointScaleMultiplier = 10): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.abs(value) <= 10 ? value * tenPointScaleMultiplier : value;
};

const normalizeTargetScore = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.abs(value) > 100 ? value / 10 : value;
};

const normalizeRoll = (value: number | undefined): number =>
  clamp(Number.isFinite(value) ? Math.round(Number(value)) : Math.floor(Math.random() * 100) + 1, 1, 100);

const buildCaseIdTimeKey = (time: { year: number; month: number; xun: number }): string =>
  `${time.year}-${time.month}-${time.xun}`;

const formatConsortName = (consort: ConcubineProfile): string => `${consort.rankLabel} ${consort.name}`;

const buildSeededRoll = (seed: string, salt: number): number => {
  let value = salt;
  for (let i = 0; i < seed.length; i += 1) {
    value = (value * 31 + seed.charCodeAt(i)) % 1000;
  }
  return (value % 100) + 1;
};

export const resolvePalaceStrifeSeverity = (
  actionKind: PalaceStrifeActionKind,
  itemLabel: string,
): PalaceStrifeSeverity => {
  if (actionKind === 'rumor') {
    return rumorSeverityByLabel[itemLabel] ?? 'light';
  }
  if (itemLabel === '鹤顶红') {
    return 'heavy';
  }
  if (itemLabel === '麝香') {
    return 'medium';
  }
  return 'light';
};

export const resolvePalaceStrifeAttempt = (input: PalaceStrifeAttemptInput): PalaceStrifeResolution => {
  const severity = resolvePalaceStrifeSeverity(input.actionKind, input.itemLabel);
  const modifiers = severityModifiers[severity];
  const playerIntrigue = normalizePlayerScore(Number(input.playerState.stats.intrigue ?? 0));
  const playerMedicine = normalizePlayerScore(Number(input.playerState.stats.medicine ?? 0), 20);
  const targetIntrigue = normalizeTargetScore(Number(input.target.stats.intrigue ?? 0));
  const targetFavor = normalizeTargetScore(Number(input.target.stats.favor ?? 0));
  const targetMedicine = normalizeTargetScore(Number(input.target.stats.medicine ?? 0));
  const hasAlly = input.allyLabel.trim().length > 0 && input.allyLabel !== '无';
  const isFramed = Boolean(input.framedTargetName?.trim());
  const allyModifier = hasAlly ? 5 : 0;
  const allyConvictionModifier = hasAlly ? 10 : 0;
  const frameActionModifier = isFramed ? frameModifiers.action : 0;
  const frameConcealmentModifier = isFramed ? frameModifiers.concealment : 0;
  const frameConvictionModifier = isFramed ? frameModifiers.conviction : 0;
  const attack = input.actionKind === 'poison' ? playerMedicine : playerIntrigue / 10;
  const defense =
    targetIntrigue / 10 + targetFavor / 20 + (input.actionKind === 'poison' ? targetMedicine / 4 : 0);
  const actionSuccessRate = round(clamp(50 + attack - defense - modifiers.action - frameActionModifier, 10, 90));
  const concealmentSuccessRate = round(
    clamp(
      50 +
        playerIntrigue / 12 -
        targetIntrigue / 15 +
        input.playerState.favor / 8 +
        allyModifier -
        modifiers.concealment -
        frameConcealmentModifier,
      5,
      85,
    ),
  );
  const actionRoll = normalizeRoll(input.rolls?.action);
  const concealmentRoll = normalizeRoll(input.rolls?.concealment);
  const actionSucceeded = actionRoll <= actionSuccessRate;
  const concealmentSucceeded = concealmentRoll <= concealmentSuccessRate;
  const status = concealmentSucceeded ? 'resolved' : 'investigating';
  const convictionRate = concealmentSucceeded
    ? 0
    : round(
        clamp(
          25 +
            modifiers.conviction +
            Math.max(0, concealmentRoll - concealmentSuccessRate) / 2 +
            (actionSucceeded ? 10 : 0) +
            allyConvictionModifier +
            frameConvictionModifier,
          5,
          95,
        ),
      );
  const xunKey = buildCaseIdTimeKey(input.time);
  const targetName = formatConsortName(input.target);
  const actionLabel = input.actionKind === 'poison' ? '下毒' : '造谣';
  const summary = concealmentSucceeded
    ? `${actionLabel}${actionSucceeded ? '奏效' : '未成'}，暂未牵出你。`
    : `${actionLabel}${actionSucceeded ? '奏效' : '未成'}，内廷已开始追查源头。`;
  const caseState: PalaceStrifeCaseState = {
    id: `palace-strife-${xunKey}-${input.target.id}-${input.actionKind}-${actionRoll}-${concealmentRoll}`,
    xunKey,
    year: input.time.year,
    month: input.time.month,
    xun: input.time.xun,
    actorId: 'player',
    targetConsortId: input.target.id,
    targetName,
    actionKind: input.actionKind,
    methodLabel: input.methodLabel,
    itemLabel: input.itemLabel,
    allyLabel: input.allyLabel,
    framedTargetName: input.framedTargetName,
    severity,
    actionSuccessRate,
    concealmentSuccessRate,
    actionRoll,
    concealmentRoll,
    actionSucceeded,
    concealmentSucceeded,
    status,
    outcome: concealmentSucceeded ? 'cold_case' : 'pending',
    investigationXunsElapsed: 0,
    convictionRate,
    yangxinHearingRequired: !concealmentSucceeded,
    summary,
  };

  return {
    caseState,
    shouldPersistCase: !concealmentSucceeded,
    resultText: `行动检定 ${actionRoll}/${actionSuccessRate}，隐匿检定 ${concealmentRoll}/${concealmentSuccessRate}。${summary}`,
  };
};

export const generateNpcPalaceStrifeCase = (
  input: NpcPalaceStrifeGenerationInput,
): PalaceStrifeCaseState | null => {
  const xunKey = buildCaseIdTimeKey(input.time);
  if (input.existingCases.some((caseState) => caseState.xunKey === xunKey && caseState.actorId === 'npc')) {
    return null;
  }

  const candidates = input.concubines
    .filter((concubine) => concubine.status === 'live' && !concubine.residence.includes('冷宫'))
    .map((concubine) => ({
      concubine,
      motive: Number(concubine.stats.ambition ?? 0) + Number(concubine.stats.stress ?? 0) + Math.max(0, -Number(concubine.stats.relationToPlayer ?? 0)) / 2,
    }))
    .filter((entry) => entry.motive >= 150)
    .sort((left, right) => right.motive - left.motive);
  const actor =
    (input.preferredActorConsortId
      ? candidates.find((entry) => entry.concubine.id === input.preferredActorConsortId)?.concubine
      : undefined) ?? candidates[0]?.concubine;
  if (!actor) {
    return null;
  }

  const liveTargets = input.concubines.filter(
    (concubine) => concubine.id !== actor.id && concubine.status === 'live' && !concubine.residence.includes('冷宫'),
  );
  if (liveTargets.length === 0) {
    return null;
  }

  const target =
    (input.preferredTargetConsortId
      ? liveTargets.find((concubine) => concubine.id === input.preferredTargetConsortId)
      : undefined) ??
    liveTargets.find((concubine) => actor.rivals.includes(concubine.id)) ??
    liveTargets.slice().sort((left, right) => Number(right.stats.favor ?? 0) - Number(left.stats.favor ?? 0))[0];
  const actionKind: PalaceStrifeActionKind = Number(actor.stats.medicine ?? 0) >= 70 ? 'poison' : 'rumor';
  const itemLabel =
    actionKind === 'poison'
      ? Number(actor.stats.medicine ?? 0) >= 90
        ? '鹤顶红'
        : '麝香'
      : Number(actor.stats.ambition ?? 0) >= 90
        ? '与人偷情'
        : '奢侈浪费';
  const severity = resolvePalaceStrifeSeverity(actionKind, itemLabel);
  const seed = `${xunKey}:${actor.id}:${target.id}:${actionKind}`;

  return {
    id: `palace-strife-${xunKey}-${actor.id}-${target.id}-npc`,
    xunKey,
    year: input.time.year,
    month: input.time.month,
    xun: input.time.xun,
    actorId: 'npc',
    actorConsortId: actor.id,
    actorName: formatConsortName(actor),
    targetConsortId: target.id,
    targetName: formatConsortName(target),
    actionKind,
    methodLabel: actionKind === 'poison' ? '下毒' : '散布流言',
    itemLabel,
    allyLabel: '无',
    queuedRolls: {
      action: buildSeededRoll(seed, 17),
      concealment: buildSeededRoll(seed, 53),
    },
    severity,
    actionSuccessRate: 0,
    concealmentSuccessRate: 0,
    actionRoll: 0,
    concealmentRoll: 0,
    actionSucceeded: false,
    concealmentSucceeded: false,
    status: 'pending_resolution',
    outcome: 'pending',
    investigationXunsElapsed: 0,
    convictionRate: 0,
    summary: `${formatConsortName(actor)}与${formatConsortName(target)}之间暗流渐起，待当旬夜晚结算。`,
  };
};

export const resolveYangxinHearing = (
  caseState: PalaceStrifeCaseState,
  playerState: GameNumericsState,
  stance: YangxinHearingStance,
): PalaceStrifeCaseState => {
  if (!caseState.yangxinHearingRequired || caseState.yangxinHearingResolved || caseState.status !== 'investigating') {
    return caseState;
  }

  const severityPenalty = caseState.severity === 'heavy' ? 15 : caseState.severity === 'medium' ? 10 : 5;
  const intrigue = normalizePlayerScore(Number(playerState.stats.intrigue ?? 0));
  const appearance = normalizePlayerScore(Number(playerState.stats.appearance ?? 0));
  const temperament = normalizePlayerScore(Number(playerState.stats.temperament ?? 0));
  const stanceModifier =
    stance === 'argue'
      ? intrigue / 30 + 8
      : stance === 'plead'
        ? (appearance + temperament) / 120 + 6
        : 3;
  const persuasion = round(
    clamp(20 + playerState.favor / 2 + (appearance + temperament) / 60 + Math.max(0, playerState.trueHeart) / 8 + stanceModifier - severityPenalty, 0, 100),
  );
  const success = persuasion >= 70;
  const successReduction = caseState.severity === 'light' ? caseState.convictionRate : caseState.severity === 'medium' ? 20 : 15;
  const extraArgueReduction = stance === 'argue' && success ? 10 : 0;
  const failureIncrease = !success && stance !== 'confess' && caseState.severity === 'heavy' ? 10 : 0;
  const convictionRate = clamp(
    caseState.convictionRate - (success ? successReduction + extraArgueReduction : 0) + failureIncrease,
    0,
    100,
  );
  const stanceLabel = stance === 'argue' ? '据理力争' : stance === 'plead' ? '委婉求情' : '沉默认错';

  return {
    ...caseState,
    convictionRate,
    status: convictionRate <= 0 ? 'resolved' : caseState.status,
    outcome: convictionRate <= 0 ? 'cold_case' : caseState.outcome,
    yangxinHearingResolved: true,
    yangxinHearingSummary: `${stanceLabel}后${success ? '自证有力' : '未能打动皇帝'}，定案率调整为${convictionRate}%。`,
    summary: `${caseState.summary} ${stanceLabel}后定案率调整为${convictionRate}%。`,
  };
};

const advanceSingleInvestigation = (caseState: PalaceStrifeCaseState): PalaceStrifeCaseState => {
  if (caseState.status !== 'investigating') {
    return caseState;
  }

  const frameGrowth = caseState.framedTargetName ? frameModifiers.investigationGrowth : 0;
  const nextConvictionRate = Math.min(
    100,
    Math.round(caseState.convictionRate + investigationGrowthBySeverity[caseState.severity] + frameGrowth),
  );
  const nextElapsed = (caseState.investigationXunsElapsed ?? 0) + 1;
  const isConvicted = nextConvictionRate >= 100;
  const isFinished = isConvicted || nextElapsed >= 3;
  const outcome = isFinished ? (isConvicted ? 'convicted' : 'cold_case') : 'pending';
  const summary =
    outcome === 'convicted'
      ? `${caseState.targetName}一案定案率已至${nextConvictionRate}%，内廷拟正式定罪。`
      : outcome === 'cold_case'
        ? `${caseState.targetName}一案三旬未定，暂作疑案封存。`
        : `${caseState.targetName}一案仍在追查，当前定案率${nextConvictionRate}%。`;

  return {
    ...caseState,
    convictionRate: nextConvictionRate,
    investigationXunsElapsed: nextElapsed,
    status: isFinished ? 'resolved' : 'investigating',
    outcome,
    summary,
  };
};

export const advancePalaceStrifeInvestigations = (
  caseStates: PalaceStrifeCaseState[],
  xunTransitions = 1,
): PalaceStrifeCaseState[] => {
  let nextCases = caseStates;
  for (let i = 0; i < xunTransitions; i += 1) {
    nextCases = nextCases.map(advanceSingleInvestigation);
  }
  return nextCases;
};

export const describePalaceStrifeInvestigationChanges = (
  beforeCases: PalaceStrifeCaseState[],
  afterCases: PalaceStrifeCaseState[],
): string[] => {
  const beforeById = new Map(beforeCases.map((caseState) => [caseState.id, caseState]));
  return afterCases
    .filter((caseState) => beforeById.get(caseState.id)?.convictionRate !== caseState.convictionRate)
    .map((caseState) => {
      if (caseState.outcome === 'convicted') {
        return `${caseState.targetName}一案定案率${caseState.convictionRate}%，已到定罪门槛。`;
      }
      if (caseState.outcome === 'cold_case') {
        return `${caseState.targetName}一案定案率${caseState.convictionRate}%，三旬未定，暂作疑案。`;
      }
      return `${caseState.targetName}一案仍在追查，已过${caseState.investigationXunsElapsed}旬，定案率${caseState.convictionRate}%。`;
    });
};

export const applyPalaceStrifeBribe = (caseState: PalaceStrifeCaseState, silverSpent: number): PalaceStrifeCaseState => {
  const reduction = Math.floor(Math.max(0, silverSpent) / 20) * 5;
  const convictionRate = Math.max(0, caseState.convictionRate - reduction);
  return {
    ...caseState,
    convictionRate,
    summary: `${caseState.targetName}一案已由娇娇打点，定案率降至${convictionRate}%。`,
  };
};

export const resolvePalaceStrifeConvictionPenalty = (
  caseState: PalaceStrifeCaseState,
): { prestigeDelta: number; favorDelta: number; stressDelta: number; summary: string } => {
  const penalty = convictionPenaltyBySeverity[caseState.severity];
  return {
    ...penalty,
    summary: `${caseState.targetName}一案定罪，扣声望${Math.abs(penalty.prestigeDelta)}、宠爱${Math.abs(penalty.favorDelta)}${
      penalty.stressDelta > 0 ? `，压力+${penalty.stressDelta}` : ''
    }。`,
  };
};
