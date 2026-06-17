import type {
  ConcubineProfile,
  GameNumericsState,
  PalaceStrifeActionKind,
  PalaceStrifeCaseState,
  PalaceStrifeResolution,
  PalaceStrifeRolls,
  PalaceStrifeSeverity,
  PalaceStrifeSuspectState,
  YangxinVerdictChoiceId,
  YangxinVerdictEventState,
  YangxinVerdictPenaltyState,
  YangxinVerdictRelationshipDeltaState,
  YangxinHearingStance,
} from '../types';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import { narrativeEntryToDialogueFields } from '../narrative/narrativeDialogueAdapter';

interface PalaceStrifeAttemptInput {
  playerState: GameNumericsState;
  target: PalaceStrifeTargetProfile;
  actionKind: PalaceStrifeActionKind;
  methodLabel: string;
  itemLabel: string;
  allyLabel: string;
  framedTargetName?: string;
  actualActor?: PalaceStrifeTargetProfile;
  framedTarget?: PalaceStrifeTargetProfile;
  suspectCandidates?: PalaceStrifeTargetProfile[];
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
  playerState?: GameNumericsState;
  playerRankLabel?: string;
  time: {
    year: number;
    month: number;
    xun: number;
  };
  preferredActorConsortId?: string;
  preferredTargetConsortId?: string;
}

type PalaceStrifeTargetProfile = Pick<ConcubineProfile, 'id' | 'name' | 'rankLabel' | 'stats'>;

interface YangxinVerdictEventInput {
  caseState: PalaceStrifeCaseState;
  playerState: GameNumericsState;
  playerRankLabel: string;
  concubines: ConcubineProfile[];
}

export const PLAYER_PALACE_STRIFE_TARGET_ID = 'player';

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
  if (Math.abs(value) <= 10) {
    return value * tenPointScaleMultiplier;
  }
  if (tenPointScaleMultiplier === 20) {
    return value * 2;
  }
  if (Math.abs(value) > 100) {
    return value / 10;
  }
  return value;
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
const formatStrifeTargetName = (target: PalaceStrifeTargetProfile): string => `${target.rankLabel} ${target.name}`;

export const isPlayerPalaceStrifeTargetId = (targetId: string | undefined): boolean =>
  targetId === PLAYER_PALACE_STRIFE_TARGET_ID;

export const buildPlayerPalaceStrifeTarget = (
  playerState: GameNumericsState,
  rankLabel = '娘娘',
): PalaceStrifeTargetProfile => ({
  id: PLAYER_PALACE_STRIFE_TARGET_ID,
  name: playerState.name,
  rankLabel,
  stats: {
    favor: playerState.favor,
    familyInfluence: 0,
    health: Number(playerState.stats.health ?? 0),
    intrigue: Number(playerState.stats.intrigue ?? 0),
    medicine: Number(playerState.stats.medicine ?? 0),
    appearance: Number(playerState.stats.appearance ?? 0),
    temperament: Number(playerState.stats.temperament ?? 0),
    prestige: playerState.prestige,
    stress: playerState.stress,
    relationToPlayer: 0,
    childrenCount: 0,
    affection: 0,
    ambition: 0,
    fortune: Number(playerState.stats.fortune ?? 0),
  },
});

const getSuspectSubjectType = (subjectId: string): PalaceStrifeSuspectState['subjectType'] =>
  subjectId === PLAYER_PALACE_STRIFE_TARGET_ID ? 'player' : 'consort';

const buildSuspectId = (subjectId: string): string => `suspect-${subjectId}`;

const getHighestSuspicionRate = (suspects: PalaceStrifeSuspectState[]): number =>
  suspects.reduce((highest, suspect) => Math.max(highest, suspect.suspicionRate), 0);

const normalizeSuspectRate = (value: number): number => clamp(Math.round(value), 0, 100);

const getPendingVerdictSuspect = (caseState: PalaceStrifeCaseState): PalaceStrifeSuspectState | undefined =>
  (caseState.suspects ?? []).find((suspect) => suspect.id === caseState.pendingVerdictSuspectId) ??
  (caseState.suspects ?? []).find((suspect) => suspect.suspicionRate >= 100);

const formatYangxinCaseTargetName = (caseState: PalaceStrifeCaseState): string =>
  isPlayerPalaceStrifeTargetId(caseState.targetConsortId) ? '娘娘' : caseState.targetName;

const formatYangxinFramedTargetName = (caseState: PalaceStrifeCaseState): string =>
  isPlayerPalaceStrifeTargetId(caseState.framedTargetConsortId) ? '你' : (caseState.framedTargetName ?? '被嫁祸者');

const formatYangxinSuspectName = (suspect: PalaceStrifeSuspectState | undefined): string =>
  suspect?.subjectType === 'player' ? '你' : (suspect?.name ?? '定罪候选人');

const markCasePendingVerdict = (
  caseState: PalaceStrifeCaseState,
  suspect: PalaceStrifeSuspectState | undefined,
  convictionRate: number,
  summary: string,
): PalaceStrifeCaseState => ({
  ...caseState,
  pendingVerdictSuspectId: suspect?.id ?? caseState.pendingVerdictSuspectId,
  convictedSuspectId: undefined,
  archivedXunKey: undefined,
  resolutionSummary: '已达定罪门槛，待养心殿裁断。',
  status: 'pending_verdict',
  outcome: 'pending',
  convictionRate,
  summary,
});

const upsertSuspect = (
  suspects: PalaceStrifeSuspectState[],
  profile: PalaceStrifeTargetProfile | undefined,
  suspicionRate: number,
  reason: string,
  flags: Pick<PalaceStrifeSuspectState, 'isActualActor' | 'isFramed'> = {},
): PalaceStrifeSuspectState[] => {
  if (!profile) {
    return suspects;
  }

  const existingIndex = suspects.findIndex((suspect) => suspect.subjectId === profile.id);
  const nextSuspect: PalaceStrifeSuspectState = {
    id: buildSuspectId(profile.id),
    subjectType: getSuspectSubjectType(profile.id),
    subjectId: profile.id,
    name: formatStrifeTargetName(profile),
    suspicionRate: normalizeSuspectRate(suspicionRate),
    reason,
    ...flags,
  };

  if (existingIndex === -1) {
    return [...suspects, nextSuspect];
  }

  return suspects.map((suspect, index) =>
    index === existingIndex
      ? {
          ...suspect,
          suspicionRate: Math.max(suspect.suspicionRate, nextSuspect.suspicionRate),
          reason: suspect.isActualActor || suspect.isFramed ? suspect.reason : nextSuspect.reason,
          isActualActor: suspect.isActualActor || nextSuspect.isActualActor,
          isFramed: suspect.isFramed || nextSuspect.isFramed,
        }
      : suspect,
  );
};

const buildPalaceStrifeSuspects = (input: {
  actualActor?: PalaceStrifeTargetProfile;
  target: PalaceStrifeTargetProfile;
  framedTarget?: PalaceStrifeTargetProfile;
  suspectCandidates?: PalaceStrifeTargetProfile[];
  baseConvictionRate: number;
  severity: PalaceStrifeSeverity;
  actionSucceeded: boolean;
  concealmentRoll: number;
  concealmentSuccessRate: number;
}): PalaceStrifeSuspectState[] => {
  const severityBonus = input.severity === 'heavy' ? 15 : input.severity === 'medium' ? 8 : 0;
  const exposureBonus = Math.max(0, input.concealmentRoll - input.concealmentSuccessRate) / 3;
  let suspects: PalaceStrifeSuspectState[] = [];

  suspects = upsertSuspect(
    suspects,
    input.actualActor,
    input.baseConvictionRate + severityBonus + exposureBonus + (input.actionSucceeded ? 6 : 0),
    '行动痕迹与动机最重，内廷优先追查。',
    { isActualActor: true },
  );

  suspects = upsertSuspect(
    suspects,
    input.framedTarget,
    Math.max(70, input.baseConvictionRate + 25),
    '现场线索被刻意引向此人，嫌疑骤然升高。',
    { isFramed: true },
  );

  if (isPlayerPalaceStrifeTargetId(input.target.id) && input.actualActor?.id !== PLAYER_PALACE_STRIFE_TARGET_ID) {
    suspects = upsertSuspect(
      suspects,
      input.target,
      Math.max(25, input.baseConvictionRate - 15),
      '娘娘被卷入案中，仍需在调查册上留名。',
    );
  }

  const candidateRows = (input.suspectCandidates ?? [])
    .filter((candidate) => !suspects.some((suspect) => suspect.subjectId === candidate.id) && candidate.id !== input.target.id)
    .map((candidate) => {
      const ambition = normalizeTargetScore(Number(candidate.stats.ambition ?? 0));
      const stress = normalizeTargetScore(Number(candidate.stats.stress ?? 0));
      const relationRisk = Math.max(0, -normalizeTargetScore(Number(candidate.stats.relationToPlayer ?? 0)));
      const intrigue = normalizeTargetScore(Number(candidate.stats.intrigue ?? 0));
      const motive = 18 + ambition / 4 + stress / 5 + relationRisk / 3 + intrigue / 30;
      return { candidate, motive };
    })
    .sort((left, right) => right.motive - left.motive);

  for (const row of candidateRows) {
    if (suspects.length >= 3) {
      break;
    }
    suspects = upsertSuspect(
      suspects,
      row.candidate,
      Math.min(65, row.motive),
      '与受害者有利益牵连或宫中动机，被列入次要嫌疑。',
    );
  }

  return suspects
    .sort((left, right) => right.suspicionRate - left.suspicionRate)
    .slice(0, 3);
};

const syncCaseConvictionFromSuspects = (caseState: PalaceStrifeCaseState): PalaceStrifeCaseState => {
  const suspects = caseState.suspects ?? [];
  if (suspects.length === 0) {
    return caseState;
  }
  return {
    ...caseState,
    convictionRate: getHighestSuspicionRate(suspects),
  };
};

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
  const actualActor = input.actualActor ?? buildPlayerPalaceStrifeTarget(input.playerState);
  const suspects = concealmentSucceeded
    ? []
    : buildPalaceStrifeSuspects({
        actualActor,
        target: input.target,
        framedTarget: input.framedTarget,
        suspectCandidates: input.suspectCandidates,
        baseConvictionRate: convictionRate,
        severity,
        actionSucceeded,
        concealmentRoll,
        concealmentSuccessRate,
      });
  const xunKey = buildCaseIdTimeKey(input.time);
  const targetName = formatStrifeTargetName(input.target);
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
    convictionRate: suspects.length > 0 ? getHighestSuspicionRate(suspects) : convictionRate,
    suspects,
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

  const liveConsortTargets = input.concubines.filter(
    (concubine) => concubine.id !== actor.id && concubine.status === 'live' && !concubine.residence.includes('冷宫'),
  );
  const playerTarget = input.playerState
    ? buildPlayerPalaceStrifeTarget(input.playerState, input.playerRankLabel)
    : undefined;
  const targetPool: PalaceStrifeTargetProfile[] = playerTarget
    ? [...liveConsortTargets, playerTarget]
    : liveConsortTargets;
  const framePool = playerTarget
    ? [...input.concubines.filter((concubine) => concubine.id !== actor.id), playerTarget]
    : input.concubines.filter((concubine) => concubine.id !== actor.id);
  if (targetPool.length === 0) {
    return null;
  }

  const target =
    (input.preferredTargetConsortId
      ? targetPool.find((candidate) => candidate.id === input.preferredTargetConsortId)
      : undefined) ??
    liveConsortTargets.find((concubine) => actor.rivals.includes(concubine.id)) ??
    (playerTarget && Number(actor.stats.relationToPlayer ?? 0) <= -35 ? playerTarget : undefined) ??
    targetPool.slice().sort((left, right) => Number(right.stats.favor ?? 0) - Number(left.stats.favor ?? 0))[0];
  const frameTarget =
    playerTarget &&
    target.id !== PLAYER_PALACE_STRIFE_TARGET_ID &&
    (Number(actor.stats.relationToPlayer ?? 0) <= -45 || buildSeededRoll(`${xunKey}:${actor.id}:frame-player`, 29) <= 35)
      ? playerTarget
      : undefined;
  const fallbackFrameTarget = frameTarget
    ? undefined
    : framePool.find((candidate) => candidate.id !== target.id && candidate.id !== actor.id && buildSeededRoll(`${xunKey}:${actor.id}:${candidate.id}:frame`, 41) <= 12);
  const resolvedFrameTarget = frameTarget ?? fallbackFrameTarget;
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
    targetName: formatStrifeTargetName(target),
    actionKind,
    methodLabel: actionKind === 'poison' ? '下毒' : '散布流言',
    itemLabel,
    allyLabel: '无',
    framedTargetConsortId: resolvedFrameTarget?.id,
    framedTargetName: resolvedFrameTarget ? formatStrifeTargetName(resolvedFrameTarget) : undefined,
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
    suspects: [],
    summary: `${formatConsortName(actor)}与${formatStrifeTargetName(target)}之间暗流渐起${
      resolvedFrameTarget ? `，线索隐隐指向${formatStrifeTargetName(resolvedFrameTarget)}` : ''
    }，待当旬夜晚结算。`,
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
  const currentSuspects = caseState.suspects ?? [];
  const targetSuspect =
    currentSuspects.find((suspect) => suspect.subjectType === 'player') ??
    currentSuspects.slice().sort((left, right) => right.suspicionRate - left.suspicionRate)[0];
  const nextSuspects =
    targetSuspect && currentSuspects.length > 0
      ? currentSuspects
          .map((suspect) =>
            suspect.id === targetSuspect.id
              ? {
                  ...suspect,
                  suspicionRate: convictionRate,
                }
              : suspect,
          )
          .sort((left, right) => right.suspicionRate - left.suspicionRate)
      : currentSuspects;
  const nextConvictionRate = nextSuspects.length > 0 ? getHighestSuspicionRate(nextSuspects) : convictionRate;

  return {
    ...caseState,
    convictionRate: nextConvictionRate,
    suspects: nextSuspects,
    status: nextConvictionRate <= 0 ? 'resolved' : caseState.status,
    outcome: nextConvictionRate <= 0 ? 'cold_case' : caseState.outcome,
    yangxinHearingResolved: true,
    yangxinHearingSummary: `${stanceLabel}后${success ? '自证有力' : '未能打动皇帝'}，最高定案率调整为${nextConvictionRate}%。`,
    summary: `${caseState.summary} ${stanceLabel}后最高定案率调整为${nextConvictionRate}%。`,
  };
};

const advanceSingleInvestigation = (caseState: PalaceStrifeCaseState): PalaceStrifeCaseState => {
  if (caseState.status !== 'investigating') {
    return caseState;
  }

  const frameGrowth = caseState.framedTargetName ? frameModifiers.investigationGrowth : 0;
  const baseGrowth = investigationGrowthBySeverity[caseState.severity];
  const nextElapsed = (caseState.investigationXunsElapsed ?? 0) + 1;
  const currentSuspects = caseState.suspects ?? [];
  const nextSuspects =
    currentSuspects.length > 0
      ? currentSuspects
          .map((suspect) => ({
            ...suspect,
            suspicionRate: Math.min(100, Math.round(suspect.suspicionRate + baseGrowth + (suspect.isFramed ? frameGrowth : 0))),
          }))
          .sort((left, right) => right.suspicionRate - left.suspicionRate)
      : [];
  const nextConvictionRate =
    nextSuspects.length > 0
      ? getHighestSuspicionRate(nextSuspects)
      : Math.min(100, Math.round(caseState.convictionRate + baseGrowth + frameGrowth));
  const convictedSuspect = nextSuspects.find((suspect) => suspect.suspicionRate >= 100);
  const reachesVerdictThreshold = Boolean(convictedSuspect) || nextConvictionRate >= 100;
  if (reachesVerdictThreshold) {
    const summary = `${caseState.targetName}一案中${convictedSuspect?.name ?? '首要嫌疑人'}定案率已至${nextConvictionRate}%，待养心殿裁断。`;
    return markCasePendingVerdict(
      {
        ...caseState,
        suspects: nextSuspects,
        investigationXunsElapsed: nextElapsed,
      },
      convictedSuspect,
      nextConvictionRate,
      summary,
    );
  }

  const isColdCase = nextElapsed >= 3;
  const summary = isColdCase
    ? `${caseState.targetName}一案三旬未定，暂作疑案封存。`
    : `${caseState.targetName}一案仍在追查，当前定案率${nextConvictionRate}%。`;

  return {
    ...caseState,
    convictionRate: nextConvictionRate,
    suspects: nextSuspects,
    archivedXunKey: isColdCase ? `${caseState.year}-${caseState.month}-${caseState.xun}+${nextElapsed}` : caseState.archivedXunKey,
    resolutionSummary: isColdCase ? summary : caseState.resolutionSummary,
    investigationXunsElapsed: nextElapsed,
    status: isColdCase ? 'resolved' : 'investigating',
    outcome: isColdCase ? 'cold_case' : 'pending',
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
      if (caseState.status === 'pending_verdict') {
        return '';
      }
      if (caseState.outcome === 'convicted') {
        return `${caseState.targetName}一案定案率${caseState.convictionRate}%，已到定罪门槛。`;
      }
      if (caseState.outcome === 'cold_case') {
        return `${caseState.targetName}一案定案率${caseState.convictionRate}%，三旬未定，暂作疑案。`;
      }
      return `${caseState.targetName}一案仍在追查，已过${caseState.investigationXunsElapsed}旬，定案率${caseState.convictionRate}%。`;
    })
    .filter(Boolean);
};

export const applyPalaceStrifeBribe = (caseState: PalaceStrifeCaseState, silverSpent: number): PalaceStrifeCaseState => {
  const reduction = Math.floor(Math.max(0, silverSpent) / 20) * 5;
  const primarySuspect = (caseState.suspects ?? []).slice().sort((left, right) => right.suspicionRate - left.suspicionRate)[0];
  if (primarySuspect) {
    return applyPalaceStrifeSuspectIntervention(caseState, primarySuspect.id, -reduction);
  }

  const convictionRate = Math.max(0, caseState.convictionRate - reduction);
  return {
    ...caseState,
    convictionRate,
    summary: `${caseState.targetName}一案已由娇娇打点，定案率降至${convictionRate}%。`,
  };
};

export const applyPalaceStrifeSuspectIntervention = (
  caseState: PalaceStrifeCaseState,
  suspectId: string,
  suspicionDelta: number,
): PalaceStrifeCaseState => {
  if (caseState.status !== 'investigating') {
    return caseState;
  }

  const nextSuspects = (caseState.suspects ?? [])
    .map((suspect) =>
      suspect.id === suspectId
        ? {
            ...suspect,
            suspicionRate: normalizeSuspectRate(suspect.suspicionRate + suspicionDelta),
          }
        : suspect,
    )
    .sort((left, right) => right.suspicionRate - left.suspicionRate);
  const convictedSuspect = nextSuspects.find((suspect) => suspect.suspicionRate >= 100);
  const nextCase: PalaceStrifeCaseState = convictedSuspect
    ? markCasePendingVerdict(
        {
          ...caseState,
          suspects: nextSuspects,
        },
        convictedSuspect,
        getHighestSuspicionRate(nextSuspects),
        `${caseState.targetName}一案中${convictedSuspect.name}定案率已至100%，待养心殿裁断。`,
      )
    : {
    ...caseState,
    suspects: nextSuspects,
    convictionRate: getHighestSuspicionRate(nextSuspects),
    resolutionSummary: caseState.resolutionSummary,
  };
  return {
    ...nextCase,
    summary: convictedSuspect
      ? `${caseState.targetName}一案中${convictedSuspect.name}定案率已至100%，待养心殿裁断。`
      : `${caseState.targetName}一案已由娇娇打点，最高定案率${nextCase.convictionRate}%。`,
  };
};

const scalePenaltyDelta = (value: number, multiplier: number): number => {
  if (value === 0) {
    return 0;
  }
  const magnitude = Math.max(0, Math.round(Math.abs(value) * multiplier));
  return value < 0 ? -magnitude : magnitude;
};

export const resolvePalaceStrifeConvictionPenalty = (
  caseState: PalaceStrifeCaseState,
  multiplier = 1,
): YangxinVerdictPenaltyState => {
  const penalty = convictionPenaltyBySeverity[caseState.severity];
  const scaledPenalty = {
    prestigeDelta: scalePenaltyDelta(penalty.prestigeDelta, multiplier),
    favorDelta: scalePenaltyDelta(penalty.favorDelta, multiplier),
    stressDelta: scalePenaltyDelta(penalty.stressDelta, multiplier),
  };
  return {
    ...scaledPenalty,
    summary: `${caseState.targetName}一案定罪，扣声望${Math.abs(scaledPenalty.prestigeDelta)}、宠爱${Math.abs(scaledPenalty.favorDelta)}${
      scaledPenalty.stressDelta > 0 ? `，压力+${scaledPenalty.stressDelta}` : ''
    }。`,
  };
};

const severityLabel: Record<PalaceStrifeSeverity, string> = {
  light: '轻案',
  medium: '中案',
  heavy: '重案',
};

const yangxinChoiceLabels: Record<YangxinVerdictChoiceId, string> = {
  argue: '据理力争',
  plead: '委婉求情',
  accept: '沉默认罚',
  'self-defend': '据证自辩',
  'self-doubt': '陈明疑点',
  'self-plead': '伏身求宽',
  'self-shift': '攀指旁人',
  'self-accept': '沉默领罪',
  'demand-punish': '请皇上严断',
  'state-facts': '只陈案情',
  'raise-doubt': '指出疑点',
  'plead-mercy': '代为求情',
  'silent-observe': '沉默旁听',
};

const buildYangxinPlayerChoices = (isPlayerSuspect: boolean): YangxinVerdictEventState['playerChoices'] =>
  isPlayerSuspect
    ? [
        { id: 'self-defend', label: '据证自辩', effectHint: '尽力为自己开脱，减罚最多，但更容易激怒受害者一方。' },
        { id: 'self-doubt', label: '陈明疑点', effectHint: '不硬顶圣意，只指出案中仍有疑处，温和减轻处罚。' },
        { id: 'self-plead', label: '伏身求宽', effectHint: '承认处境，请求从轻发落，减罚稳定且关系风险较低。' },
        { id: 'self-shift', label: '攀指旁人', effectHint: '把部分疑点引向旁人，可能减罚，但会留下更重关系隐患。' },
        { id: 'self-accept', label: '沉默领罪', effectHint: '不主动减轻处罚，但避免额外言语冲突。' },
      ]
    : [
        { id: 'demand-punish', label: '请皇上严断', effectHint: '倾向加重处罚，受害者一方更容易认同你的态度。' },
        { id: 'state-facts', label: '只陈案情', effectHint: '只补充自己知道的事实，不主动加重或减轻处罚。' },
        { id: 'raise-doubt', label: '指出疑点', effectHint: '提示案中仍有疑处，小幅减轻处罚，关系波动较低。' },
        { id: 'plead-mercy', label: '代为求情', effectHint: '明确替定罪候选人求宽，减罚较多，但会得罪受害者一方。' },
        { id: 'silent-observe', label: '沉默旁听', effectHint: '不介入裁断，只旁听结果，避免额外关系冲突。' },
      ];

const resolveYangxinVerdictPenaltyMultiplier = (
  severity: PalaceStrifeSeverity,
  choiceId: YangxinVerdictChoiceId,
): number => {
  if (choiceId === 'demand-punish') {
    return severity === 'heavy' ? 1.08 : 1.12;
  }
  if (choiceId === 'accept' || choiceId === 'self-accept' || choiceId === 'silent-observe' || choiceId === 'state-facts') {
    return 1;
  }
  if (choiceId === 'self-plead' || choiceId === 'plead') {
    return severity === 'light' ? 0.84 : severity === 'medium' ? 0.9 : 0.94;
  }
  if (choiceId === 'self-doubt' || choiceId === 'raise-doubt') {
    return severity === 'light' ? 0.82 : severity === 'medium' ? 0.88 : 0.92;
  }
  if (choiceId === 'self-shift') {
    return severity === 'light' ? 0.78 : severity === 'medium' ? 0.86 : 0.9;
  }
  if (choiceId === 'plead-mercy') {
    return severity === 'light' ? 0.76 : severity === 'medium' ? 0.84 : 0.9;
  }
  if (choiceId === 'self-defend') {
    return severity === 'light' ? 0.72 : severity === 'medium' ? 0.8 : 0.86;
  }
  return severity === 'light' ? 0.75 : severity === 'medium' ? 0.82 : 0.88;
};

const getSuspectRelationDeltaForYangxinChoice = (choiceId: YangxinVerdictChoiceId): number => {
  if (choiceId === 'demand-punish') {
    return -2;
  }
  if (choiceId === 'plead-mercy') {
    return 3;
  }
  if (choiceId === 'raise-doubt' || choiceId === 'argue') {
    return 1;
  }
  if (choiceId === 'plead') {
    return 2;
  }
  return 0;
};

const getVictimRelationDeltaForYangxinChoice = (choiceId: YangxinVerdictChoiceId): number => {
  if (choiceId === 'demand-punish') {
    return 2;
  }
  if (choiceId === 'plead-mercy' || choiceId === 'argue' || choiceId === 'self-shift') {
    return -2;
  }
  if (choiceId === 'raise-doubt' || choiceId === 'plead' || choiceId === 'self-doubt' || choiceId === 'self-plead') {
    return -1;
  }
  if (choiceId === 'self-defend') {
    return -3;
  }
  return 0;
};

const getConsortById = (concubines: ConcubineProfile[], consortId: string | undefined): ConcubineProfile | undefined =>
  consortId ? concubines.find((consort) => consort.id === consortId) : undefined;

const upsertAttendee = (
  attendees: YangxinVerdictEventState['attendees'],
  attendee: YangxinVerdictEventState['attendees'][number] | undefined,
): YangxinVerdictEventState['attendees'] => {
  if (!attendee) {
    return attendees;
  }
  if (attendees.some((item) => item.id === attendee.id)) {
    return attendees;
  }
  return [...attendees, attendee];
};

const buildConsortAttendee = (
  consort: ConcubineProfile | undefined,
  role: string,
  reason: string,
): YangxinVerdictEventState['attendees'][number] | undefined =>
  consort
    ? {
        id: `consort-${consort.id}`,
        subjectType: 'consort',
        subjectId: consort.id,
        name: `${consort.rankLabel} ${consort.name}`,
        role,
        reason,
      }
    : undefined;

export const buildYangxinVerdictEvent = ({
  caseState,
  concubines,
}: YangxinVerdictEventInput): YangxinVerdictEventState | undefined => {
  if (caseState.status !== 'pending_verdict') {
    return undefined;
  }

  const pendingSuspect = getPendingVerdictSuspect(caseState);
  if (!pendingSuspect) {
    return undefined;
  }

  const targetConsort = getConsortById(concubines, caseState.targetConsortId);
  const actorConsort = getConsortById(concubines, caseState.actorConsortId);
  const framedConsort = getConsortById(concubines, caseState.framedTargetConsortId);
  const suspectConsort = pendingSuspect.subjectType === 'consort' ? getConsortById(concubines, pendingSuspect.subjectId) : undefined;
  const isPlayerTarget = isPlayerPalaceStrifeTargetId(caseState.targetConsortId);
  const isPlayerFramed = isPlayerPalaceStrifeTargetId(caseState.framedTargetConsortId);
  const isPlayerSuspect = pendingSuspect.subjectType === 'player';
  const caseTargetName = formatYangxinCaseTargetName(caseState);
  const suspectDisplayName = formatYangxinSuspectName(pendingSuspect);
  const framedDisplayName = formatYangxinFramedTargetName(caseState);
  const attendeeLimit = caseState.severity === 'light' ? 4 : caseState.severity === 'medium' ? 6 : 8;
  let attendees: YangxinVerdictEventState['attendees'] = [
    {
      id: 'emperor',
      subjectType: 'emperor',
      subjectId: 'emperor',
      name: '皇帝',
      role: '裁断者',
      reason: '养心殿裁决宫斗案件。',
    },
  ];

  attendees = upsertAttendee(attendees, {
    id: 'player',
    subjectType: 'player',
    subjectId: PLAYER_PALACE_STRIFE_TARGET_ID,
    name: '娘娘',
    role: isPlayerSuspect ? '定罪候选人' : isPlayerTarget ? '受害者' : isPlayerFramed ? '被嫁祸者' : '相关旁听',
    reason: '案件牵连娘娘本人，必须到场听裁。',
  });
  attendees = upsertAttendee(
    attendees,
    buildConsortAttendee(suspectConsort, '定罪候选人', '嫌疑定案率已经达到养心殿裁断门槛。'),
  );
  attendees = upsertAttendee(
    attendees,
    buildConsortAttendee(targetConsort, '受害者', '案件直接侵害其名声或安危。'),
  );
  attendees = upsertAttendee(
    attendees,
    buildConsortAttendee(framedConsort, '被嫁祸者', '案件中存在嫁祸线索，需当面陈情。'),
  );
  attendees = upsertAttendee(
    attendees,
    buildConsortAttendee(actorConsort, '实际发起者', '案卷线索指向其可能参与筹谋。'),
  );
  if (caseState.severity !== 'light') {
    attendees = upsertAttendee(attendees, {
      id: 'jiaojiao',
      subjectType: 'maid',
      subjectId: 'jiaojiao',
      name: '娇娇',
      role: '贴身宫女',
      reason: '娘娘身边人可就起居行踪作证。',
    });
  }

  const limitedAttendees = attendees.slice(0, attendeeLimit);
  const emperorStatement = renderNarrativeEntry('yangxin.verdict.statement.emperor', {
    caseTargetName,
    suspectDisplayName,
    severityLabel: severityLabel[caseState.severity],
  });
  const suspectStatement = renderNarrativeEntry(
    pendingSuspect.subjectType === 'player'
      ? 'yangxin.verdict.statement.suspect.player'
      : 'yangxin.verdict.statement.suspect.consort',
    { suspectName: pendingSuspect.name },
  );
  const emperorStatementFields = narrativeEntryToDialogueFields(emperorStatement, {
    speakerIdentity: '裁断者',
    speakerName: '皇帝',
  });
  const suspectStatementFields = narrativeEntryToDialogueFields(suspectStatement, {
    speakerIdentity: '定罪候选人',
    speakerName: suspectDisplayName,
  });
  const statements: YangxinVerdictEventState['statements'] = [
    {
      id: 'emperor-open',
      speakerId: 'emperor',
      speakerName: emperorStatementFields.speakerName,
      speakerRole: emperorStatementFields.speakerIdentity,
      text: emperorStatementFields.text,
      effectSummary: '确认进入裁断阶段。',
    },
    {
      id: 'suspect-statement',
      speakerId: pendingSuspect.subjectType === 'player' ? 'player' : `consort-${pendingSuspect.subjectId}`,
      speakerName: suspectStatementFields.speakerName,
      speakerRole: suspectStatementFields.speakerIdentity,
      text: suspectStatementFields.text,
      effectSummary: '定罪候选人陈情。',
    },
  ];

  if (caseState.framedTargetName) {
    const framedStatement = renderNarrativeEntry('yangxin.verdict.statement.framed', { framedDisplayName });
    const framedStatementFields = narrativeEntryToDialogueFields(framedStatement, {
      speakerIdentity: '被嫁祸者',
      speakerName: framedDisplayName,
    });
    statements.push({
      id: 'framed-statement',
      speakerId: isPlayerFramed ? 'player' : `consort-${caseState.framedTargetConsortId}`,
      speakerName: framedStatementFields.speakerName,
      speakerRole: framedStatementFields.speakerIdentity,
      text: framedStatementFields.text,
      effectSummary: '嫁祸线索会影响旁人关系。',
    });
  }

  if (caseState.severity !== 'light') {
    const witnessStatement = renderNarrativeEntry('yangxin.verdict.statement.jiaojiao');
    const witnessStatementFields = narrativeEntryToDialogueFields(witnessStatement, {
      speakerIdentity: '贴身宫女',
      speakerName: '娇娇',
    });
    statements.push({
      id: 'witness-statement',
      speakerId: 'jiaojiao',
      speakerName: witnessStatementFields.speakerName,
      speakerRole: witnessStatementFields.speakerIdentity,
      text: witnessStatementFields.text,
      effectSummary: '贴身宫女作证，允许玩家选择求情姿态。',
    });
  }

  return {
    id: `yangxin-verdict-${caseState.id}`,
    sourceType: 'palace-strife',
    sourceId: caseState.id,
    severity: caseState.severity,
    stage: 'summon',
    attendees: limitedAttendees,
    statements,
    playerChoices: buildYangxinPlayerChoices(isPlayerSuspect),
  };
};

export const resolveYangxinVerdictResult = (
  event: YangxinVerdictEventState,
  caseState: PalaceStrifeCaseState,
  choiceId: YangxinVerdictChoiceId,
): NonNullable<YangxinVerdictEventState['result']> => {
  const pendingSuspect = getPendingVerdictSuspect(caseState);
  const multiplier = resolveYangxinVerdictPenaltyMultiplier(caseState.severity, choiceId);
  const penalty = resolvePalaceStrifeConvictionPenalty(caseState, multiplier);
  const relationshipDeltas: YangxinVerdictRelationshipDeltaState[] = [];
  const suspectRelationDelta = getSuspectRelationDeltaForYangxinChoice(choiceId);
  const victimRelationDelta = getVictimRelationDeltaForYangxinChoice(choiceId);

  if (pendingSuspect?.subjectType === 'consort' && suspectRelationDelta !== 0) {
    relationshipDeltas.push({
      consortId: pendingSuspect.subjectId,
      relationToPlayerDelta: suspectRelationDelta,
      reason:
        suspectRelationDelta > 0
          ? '玩家在裁断中为定罪候选人减罚。'
          : '玩家在裁断中倾向加重处罚，定罪候选人记恨。',
    });
  }

  if (!isPlayerPalaceStrifeTargetId(caseState.targetConsortId) && victimRelationDelta !== 0) {
    relationshipDeltas.push({
      consortId: caseState.targetConsortId,
      relationToPlayerDelta: victimRelationDelta,
      reason:
        victimRelationDelta > 0
          ? '玩家在裁断中倾向严惩，受害者一方认可。'
          : '玩家在裁断中减轻处罚或为自己开脱，受害者一方不满。',
    });
  }

  const choiceLabel = event.playerChoices.find((choice) => choice.id === choiceId)?.label ?? yangxinChoiceLabels[choiceId];
  const reductionText =
    multiplier === 1
      ? '未作减罚'
      : multiplier > 1
        ? `处罚按${Math.round(multiplier * 100)}%加重`
      : `处罚按${Math.round(multiplier * 100)}%落地`;
  const suspectDisplayName = formatYangxinSuspectName(pendingSuspect);
  return {
    choiceId,
    choiceLabel,
    penaltyMultiplier: multiplier,
    penalty,
    relationshipDeltas,
    summary: `${choiceLabel}后，皇帝准予${reductionText}。${suspectDisplayName}定罪，${penalty.summary}`,
  };
};

export const finalizeYangxinVerdictCase = (
  caseState: PalaceStrifeCaseState,
  event: YangxinVerdictEventState,
): PalaceStrifeCaseState => {
  const pendingSuspect = getPendingVerdictSuspect(caseState);
  const verdictSummary = event.result?.summary ?? `${formatYangxinSuspectName(pendingSuspect)}已由养心殿裁断定罪。`;
  return {
    ...caseState,
    status: 'resolved',
    outcome: 'convicted',
    convictedSuspectId: pendingSuspect?.id ?? caseState.pendingVerdictSuspectId,
    verdictAttendees: event.attendees,
    verdictSummary,
    penaltyApplied: true,
    archivedXunKey: caseState.archivedXunKey ?? `${caseState.year}-${caseState.month}-${caseState.xun}+yangxin`,
    resolutionSummary: verdictSummary,
    summary: verdictSummary,
  };
};
