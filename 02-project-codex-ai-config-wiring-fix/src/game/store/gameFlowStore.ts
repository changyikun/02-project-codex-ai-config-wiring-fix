import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  PLAYER_FAVOR_RANGE,
  PLAYER_SILVER_RANGE,
  PRESTIGE_RANGE,
  STAMINA_INITIAL_PER_XUN,
  STAMINA_MAX,
  getFavorTierByValue,
} from '../../config/constants';
import {
  convertAppearancePoints,
  convertFortuneAttributePoints,
  convertHealthPoints,
  convertIntriguePoints,
  convertSkillLevel,
  convertTemperamentPoints,
} from '../../config/formulas';
import type { ChamberPanelId } from '../../config/bedchamber';
import {
  DEFAULT_MONTHLY_EXPENSE_STRATEGY,
  getMonthlyExpenseStrategyConfig,
} from '../../config/monthlyExpenseStrategy';
import { attributeFields } from '../data/config';
import { cloneInitialInventory, getInventoryRecyclePrice } from '../data/inventoryPresets';
import { buildInitialBondProfile } from '../data/bondPresets';
import {
  applyConcubinePressureHealthPenalty,
  buildInitialConcubineRoster,
  enforceConcubineFavorTierCaps,
  normalizeConcubineProfile,
} from '../data/concubineRoster';
import {
  getRankWeight,
  normalizeTrackedPlayerRankLabel,
  resolvePlayerActualRankLabel,
  resolveNextPlayerRankPrestigeRequirement,
  resolvePlayerRankByPrestige,
  resolvePlayerResidenceByRank,
} from '../lib/rankRuntime';
import {
  countFamilyQuarterSettlements,
  FAMILY_AID_BONUS,
  FAMILY_AID_COST,
  FAMILY_AID_QUARTERLY_PRESTIGE,
} from '../lib/familyGovernanceRuntime';
import { resolveMonthlyFamilyPrestigeDelta } from '../lib/familyPrestigeRuntime';
import {
  advancePalaceStrifeInvestigations,
  applyPalaceStrifeBribe,
  applyPalaceStrifeSuspectIntervention,
  buildPlayerPalaceStrifeTarget,
  buildYangxinVerdictEvent,
  describePalaceStrifeInvestigationChanges,
  finalizeYangxinVerdictCase,
  generateNpcPalaceStrifeCase,
  isPlayerPalaceStrifeTargetId,
  resolvePalaceStrifeAttempt,
  resolvePalaceStrifeConvictionPenalty,
  resolvePalaceStrifeSeverity,
  resolveYangxinVerdictResult,
} from '../lib/palaceStrifeRuntime';
import {
  buildInitialNpcActivityState,
  generateNpcActivities,
  getHostilePlotActivity,
} from '../lib/npcActivityRuntime';
import { CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN } from '../lib/consortVisitRuntime';
import { resolveNpcRelationMatrixForActivities } from '../lib/npcRelationRuntime';
import { resolveNightlyService, resolvePlayerNightlyServiceEvent } from '../lib/nightlyServiceRuntime';
import {
  buildCraftWorkInstance,
  pickCraftWorkInspiration,
  resolveCraftWorkAdvance,
  type CraftWorkAdvanceResolution,
} from '../lib/craftWorkRuntime';
import {
  resolveEmperorAudienceRequest,
  resolveEmperorGiftEffects,
  resolveEmperorMainInteraction,
  resolveZhengyangGateEncounter,
} from '../lib/emperorActivityRuntime';
import { resolvePalaceBanquet } from '../lib/palaceBanquetRuntime';
import {
  didCrossPalaceBanquetEvent,
  getPalaceBanquetEventTime,
  resolvePalaceBanquetSeasonKeyForTime,
  shouldShowPalaceBanquetRegistrationNotice,
} from '../lib/palaceBanquetSchedule';
import {
  buildSaveGameV1,
  clearSaveGameV1Storage,
  isSaveGameV1,
  readSaveGameV1FromStorage,
  SAVE_GAME_STORAGE_KEY,
  type SaveGameV1,
} from '../save/saveGameV1';
import {
  createInitialCraftWorksProgress,
  createInitialEmperorInteractionProgress,
  createInitialKitchenProgress,
  createInitialMedicalProgress,
  createInitialMusicHallProgress,
  createInitialNightlyService,
  createInitialPalaceBanquetProgress,
  createInitialTempleProgress,
} from '../save/saveGameConfig';
import {
  getNumericRuleValue,
  getRouteInitialProfileConfig,
  getRouteInitialStatDefaults,
  resolveRouteInitialPointsTotal,
} from '../numerics/numericCatalog';
import type {
  AffairSourceLabel,
  BondProfileState,
  ConcubineProfile,
  ConsortInteractionProgress,
  ConsortPalaceActionId,
  CraftWorkInstanceState,
  CraftWorkType,
  CraftWorksProgressState,
  CurrentView,
  DialogueTurn,
  EmperorInteractionProgressState,
  EmperorInteractionSource,
  EmperorMainInteractionActionId,
  GameNumericsState,
  HiddenStatsState,
  InventoryItem,
  NumericSaveEnvelope,
  PalaceTimeState,
  KitchenProgressState,
  MedicalProgressState,
  MusicHallProgressState,
  NightlyServiceInteractionActionId,
  NightlyServiceInteractionChoice,
  NpcActivityState,
  NpcRelationMatrix,
  NightlyServiceState,
  PalaceBanquetProgressState,
  PalaceStrifeCaseState,
  PalaceStrifeResolution,
  PalaceStrifeStartInput,
  YangxinVerdictChoiceId,
  YangxinVerdictEventState,
  TempleProgressState,
  RelationshipJudgeOutcome,
  RouteSelectionProfile,
  SceneId,
  MapAreaId,
  NumericFeedbackBucket,
  SettlementReport,
} from '../types';

interface NumericFeedbackSignal {
  sequence: number;
  bucket: NumericFeedbackBucket;
}

interface PendingOvernightReturn {
  id: string;
  origin: 'map' | 'chamber';
  reason: 'deep-night' | 'stamina';
}

interface PendingViewTransitionCleanup {
  targetView: CurrentView;
  clearMapLocation?: boolean;
  resetChamberPanel?: boolean;
}

interface AdvanceTimeOptions {
  lateNightPenalty?: boolean;
}

export interface DebugSilverResult {
  success: boolean;
  message: string;
  requestedAmount: number;
  appliedAmount: number;
  silver: number;
}

export interface DebugPrestigeResult {
  success: boolean;
  message: string;
  requestedAmount: number;
  appliedAmount: number;
  prestige: number;
}

export interface EmperorAudienceRequestStoreResult {
  success: boolean;
  chance: number;
  roll: number;
  message: string;
}

export interface EmperorInteractionStoreResult {
  success: boolean;
  message: string;
  effects: {
    favorDelta: number;
    prestigeDelta: number;
    trueHeartDelta: number;
  };
}

export interface EmperorReputationCommentResult {
  success: boolean;
  message: string;
  targetName?: string;
  prestigeDelta: number;
}

export interface GameFlowStore {
  currentView: CurrentView;
  scene: SceneId;
  activeChamberPanel: ChamberPanelId;
  activeMapLocation?: MapAreaId;
  activeMapLocationEntryTime?: PalaceTimeState;
  activeAffairsSource: AffairSourceLabel;
  routeId: GameNumericsState['routeId'];
  state: GameNumericsState;
  hiddenStats: HiddenStatsState;
  time: PalaceTimeState;
  briefing: string;
  mapEventText: string;
  dialogue?: DialogueTurn;
  save?: NumericSaveEnvelope;
  selectedRoute?: RouteSelectionProfile;
  bondProfile: BondProfileState;
  concubineRouteId: GameNumericsState['routeId'];
  concubines: ConcubineProfile[];
  customConsorts: ConcubineProfile[];
  inventory: InventoryItem[];
  merchantLedger: Record<string, number>;
  consortInteractionMap: Record<string, ConsortInteractionProgress>;
  kitchenProgress: KitchenProgressState;
  medicalProgress: MedicalProgressState;
  musicHallProgress: MusicHallProgressState;
  palaceBanquetProgress: PalaceBanquetProgressState;
  craftWorksProgress: CraftWorksProgressState;
  templeProgress: TempleProgressState;
  emperorInteraction: EmperorInteractionProgressState;
  nightlyService: NightlyServiceState;
  npcActivity: NpcActivityState;
  npcRelationMatrix: NpcRelationMatrix;
  settlementReports: SettlementReport[];
  palaceStrifeCases: PalaceStrifeCaseState[];
  pendingYangxinVerdict?: YangxinVerdictEventState;
  latestSettlementReportId?: string;
  lastSeenSettlementReportId?: string;
  numericFeedbackSignal: NumericFeedbackSignal;
  pendingOvernightReturn?: PendingOvernightReturn;
  pendingViewTransitionCleanup?: PendingViewTransitionCleanup;
  setCurrentView: (view: CurrentView) => void;
  setScene: (scene: SceneId) => void;
  openChamberPanel: (panel: ChamberPanelId) => void;
  closeChamberPanel: () => void;
  setActiveAffairsSource: (source: AffairSourceLabel) => void;
  enterMainChamber: (location?: MapAreaId | null, entryTime?: PalaceTimeState) => void;
  enterMapMain: () => void;
  completeViewTransitionCleanup: () => void;
  setRoute: (routeId: GameNumericsState['routeId']) => void;
  applyRouteSelection: (profile: RouteSelectionProfile) => void;
  setPlayerName: (name: string) => void;
  patchState: (patch: Partial<GameNumericsState>) => void;
  patchHiddenStats: (patch: Partial<HiddenStatsState>) => void;
  setBriefing: (briefing: string) => void;
  setDialogue: (dialogue?: DialogueTurn) => void;
  setMapEventText: (text: string) => void;
  requestOvernightReturn: (payload: Omit<PendingOvernightReturn, 'id'>) => void;
  clearOvernightReturn: () => void;
  completeOvernightTransition: (reason?: PendingOvernightReturn['reason']) => void;
  setSave: (save: NumericSaveEnvelope) => void;
  setAttributeValue: (key: string, value: number) => void;
  finalizeAttributeAssignment: () => void;
  validatePoints: () => void;
  ensureBondProfile: (routeId?: GameNumericsState['routeId']) => void;
  ensureConcubines: (routeId?: GameNumericsState['routeId']) => void;
  addCustomConsort: (consort: ConcubineProfile) => void;
  patchConcubineById: (consortId: string, updater: (consort: ConcubineProfile) => ConcubineProfile) => void;
  patchKitchenProgress: (patch: Partial<KitchenProgressState>) => void;
  patchMedicalProgress: (patch: Partial<MedicalProgressState>) => void;
  patchMusicHallProgress: (patch: Partial<MusicHallProgressState>) => void;
  patchPalaceBanquetProgress: (patch: Partial<PalaceBanquetProgressState>) => void;
  startCraftWork: (workId: string) => { success: boolean; message: string; instance?: CraftWorkInstanceState };
  inspireCraftWork: (type: CraftWorkType) => { success: boolean; message: string; instance?: CraftWorkInstanceState };
  advanceCraftWork: (instanceId: string) => { success: boolean; message: string; resolution?: CraftWorkAdvanceResolution };
  patchTempleProgress: (patch: Partial<TempleProgressState>) => void;
  requestEmperorAudience: (location: MapAreaId, source: EmperorInteractionSource) => EmperorAudienceRequestStoreResult;
  completeEmperorMainInteraction: (
    actionId: EmperorMainInteractionActionId,
    location: MapAreaId,
    source: EmperorInteractionSource,
  ) => EmperorInteractionStoreResult;
  completeEmperorGift: (itemId: string) => EmperorInteractionStoreResult;
  completeEmperorReputationComment: (
    targetConsortId: string,
    direction: 'praise' | 'complain',
  ) => EmperorReputationCommentResult;
  resolveZhengyangEmperorWait: () => EmperorReputationCommentResult & { chance: number; roll: number };
  resolveNpcActivityEntry: (entryId: string) => void;
  acknowledgeNpcPlayerVisit: (entryId: string) => void;
  recordConsortInteractionAction: (
    consortId: string,
    actionId: ConsortPalaceActionId,
  ) => {
    success: boolean;
    actionCountThisXun: number;
    actionLimitHit: boolean;
  };
  consumeInventoryItem: (itemId: string) => boolean;
  grantInventoryItem: (item: InventoryItem, quantity?: number) => void;
  buyInventoryItem: (item: InventoryItem, stockLimit?: number | null) => { success: boolean; message: string };
  sellInventoryItem: (itemId: string) => { success: boolean; message: string };
  applyConsortRelationshipJudgement: (
    consortId: string,
    actionId: ConsortPalaceActionId,
    result: RelationshipJudgeOutcome,
  ) => {
    appliedFavorDelta: number;
    appliedAffectionDelta: number;
    favorCapHit: boolean;
    affectionCapHit: boolean;
    actionCountThisXun: number;
    actionLimitHit: boolean;
  };
  applyBondJudgement: (result: RelationshipJudgeOutcome) => void;
  advanceTime: (steps?: number, options?: AdvanceTimeOptions) => void;
  acknowledgeSettlementReport: (reportId?: string) => void;
  acknowledgeNightlyServiceNotice: () => void;
  finalizePendingNightlyService: (choices: Array<NightlyServiceInteractionActionId | NightlyServiceInteractionChoice>) => void;
  spendFamilyAid: () => { success: boolean; message: string };
  startPalaceStrifeCase: (input: PalaceStrifeStartInput) => PalaceStrifeResolution;
  bribePalaceStrifeCase: (caseId: string, silverSpent: number) => { success: boolean; message: string };
  adjustPalaceStrifeSuspect: (
    caseId: string,
    suspectId: string,
    direction: 'increase' | 'decrease',
  ) => { success: boolean; message: string };
  beginPendingYangxinVerdict: (caseId: string) => { success: boolean; message: string };
  advanceYangxinVerdict: (choiceId?: YangxinVerdictChoiceId) => { success: boolean; message: string };
  finalizeYangxinVerdict: (eventId: string) => { success: boolean; message: string };
  exportSaveGameV1: (savedAt?: string) => SaveGameV1;
  loadSaveGameV1: (saveGame: SaveGameV1) => void;
  startNewGame: () => void;
  resumeLastSave: () => { success: boolean; message: string };
  applyStoryEffects: (effects: Partial<GameNumericsState> & { stats?: Record<string, number>; flags?: Record<string, boolean> }) => void;
  debugAddSilver: (amount: number | string) => DebugSilverResult;
  debugAddPrestige: (amount: number | string) => DebugPrestigeResult;
  markNumericFeedbackEvent: (bucket: NumericFeedbackBucket) => void;
}

const initialRouteConfig = getRouteInitialProfileConfig('lanyinxuguo');
const initialStats = {
  ...Object.fromEntries(attributeFields.map((field) => [field.key, field.value])),
  ...getRouteInitialStatDefaults('lanyinxuguo'),
};
const rangeStart = (range: readonly [number, number]): number => range[0];
const rangeMidpoint = (range: readonly [number, number]): number => Math.floor((range[0] + range[1]) / 2);

const getFieldMinMap = (): Record<string, number> => Object.fromEntries(attributeFields.map((field) => [field.key, field.min]));

const sumExcessPoints = (stats: Record<string, number>, mins: Record<string, number>): number =>
  Object.entries(stats).reduce((acc, [key, value]) => {
    const current = Number.isFinite(value) ? Number(value) : 0;
    const min = Number.isFinite(mins[key]) ? Number(mins[key]) : 0;
    return acc + Math.max(0, current - min);
  }, 0);

const clampInt = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.floor(value)));
const clampToRange = (value: number, range: readonly [number, number]): number => Math.max(range[0], Math.min(range[1], value));
const parseDebugPositiveIntAmount = (amount: number | string): number => {
  const parsed = typeof amount === 'string' ? Number(amount.trim()) : amount;
  return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
};
const timeSlots: PalaceTimeState['slot'][] = ['清晨', '上午', '中午', '下午', '傍晚', '夜晚', '深夜'];
const DEFAULT_AFFAIRS_SOURCE = '????' as AffairSourceLabel;
const LATE_NIGHT_PENALTY = {
  stress: getNumericRuleValue('late_night_penalty_stress'),
  health: getNumericRuleValue('late_night_penalty_health'),
  temperament: getNumericRuleValue('late_night_penalty_temperament'),
} as const;
const getCurrentXunKey = (time: PalaceTimeState): string => `${time.year}-${time.month}-${time.xun}`;
const getNextXunMorning = (time: PalaceTimeState): PalaceTimeState => {
  let year = time.year;
  let month = time.month;
  let xun = time.xun + 1;
  if (xun > 3) {
    xun = 1;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return {
    year,
    month,
    xun,
    slotIndex: 0,
    slot: timeSlots[0],
    slotProgress: 0,
  };
};
const getPalaceStrifeFortuneCost = (actionKind: PalaceStrifeStartInput['actionKind']): number =>
  actionKind === 'poison' ? 10 : 5;

const findConsortById = (
  consortId: string | undefined,
  concubines: ConcubineProfile[],
  customConsorts: ConcubineProfile[],
): ConcubineProfile | undefined =>
  consortId ? [...concubines, ...customConsorts].find((consort) => consort.id === consortId) : undefined;

const resolvePlayerRankLabelForState = (state: GameNumericsState, hiddenStats?: HiddenStatsState): string =>
  normalizeTrackedPlayerRankLabel(hiddenStats?.initialRank) ?? resolvePlayerRankByPrestige(state.prestige);

const buildAttackerStateForPalaceStrife = (
  caseState: PalaceStrifeCaseState,
  playerState: GameNumericsState,
  concubines: ConcubineProfile[],
  customConsorts: ConcubineProfile[],
): GameNumericsState => {
  if (caseState.actorId !== 'npc') {
    return playerState;
  }

  const actor = findConsortById(caseState.actorConsortId, concubines, customConsorts);
  if (!actor) {
    return playerState;
  }

  return {
    ...playerState,
    favor: Number(actor.stats.favor ?? 0),
    trueHeart: 0,
    stats: {
      ...playerState.stats,
      intrigue: Number(actor.stats.intrigue ?? 0),
      medicine: Number(actor.stats.medicine ?? 0),
      appearance: Number(actor.stats.appearance ?? 0),
      temperament: Number(actor.stats.temperament ?? 0),
    },
  };
};

const resolvePendingPalaceStrifeCasesForTransition = (
  caseStates: PalaceStrifeCaseState[],
  playerState: GameNumericsState,
  hiddenStats: HiddenStatsState,
  concubines: ConcubineProfile[],
  customConsorts: ConcubineProfile[],
): { cases: PalaceStrifeCaseState[]; lines: string[]; resolvedIds: Set<string> } => {
  const lines: string[] = [];
  const resolvedIds = new Set<string>();
  const cases = caseStates.map((caseState) => {
    if (caseState.status !== 'pending_resolution') {
      return caseState;
    }

    const target = isPlayerPalaceStrifeTargetId(caseState.targetConsortId)
      ? buildPlayerPalaceStrifeTarget(playerState, resolvePlayerRankLabelForState(playerState, hiddenStats))
      : findConsortById(caseState.targetConsortId, concubines, customConsorts);
    if (!target) {
      resolvedIds.add(caseState.id);
      const missingTargetCase: PalaceStrifeCaseState = {
        ...caseState,
        status: 'resolved',
        outcome: 'cold_case',
        suspects: caseState.suspects,
        summary: `${caseState.targetName}一事失去对象，暂作疑案封存。`,
      };
      return missingTargetCase;
    }

    const playerTarget = buildPlayerPalaceStrifeTarget(playerState, resolvePlayerRankLabelForState(playerState, hiddenStats));
    const actualActor =
      caseState.actorId === 'npc'
        ? findConsortById(caseState.actorConsortId, concubines, customConsorts)
        : playerTarget;
    const framedTarget = isPlayerPalaceStrifeTargetId(caseState.framedTargetConsortId)
      ? playerTarget
      : findConsortById(caseState.framedTargetConsortId, concubines, customConsorts);
    const suspectCandidates = [...concubines, ...customConsorts].filter(
      (consort) => consort.status === 'live' && !consort.residence.includes('冷宫'),
    );
    const resolved = resolvePalaceStrifeAttempt({
      playerState: buildAttackerStateForPalaceStrife(caseState, playerState, concubines, customConsorts),
      target,
      actionKind: caseState.actionKind,
      methodLabel: caseState.methodLabel,
      itemLabel: caseState.itemLabel,
      allyLabel: caseState.allyLabel,
      framedTargetName: caseState.framedTargetName,
      actualActor,
      framedTarget,
      suspectCandidates,
      time: {
        year: caseState.year,
        month: caseState.month,
        xun: caseState.xun,
      },
      rolls: caseState.queuedRolls,
    }).caseState;
    const nextCase = {
      ...resolved,
      id: caseState.id,
      framedTargetConsortId: caseState.framedTargetConsortId,
      framedTargetName: caseState.framedTargetName,
      queuedRolls: undefined,
    };
    resolvedIds.add(caseState.id);
    lines.push(
      `娇娇回禀：${nextCase.targetName}${nextCase.summary}${
        nextCase.status === 'investigating' ? ` 当前定案率${nextCase.convictionRate}%。` : ''
      }`,
    );
    return nextCase;
  });

  return { cases, lines, resolvedIds };
};

const isPlayerRelatedPendingVerdictForSettlement = (caseState: PalaceStrifeCaseState): boolean =>
  caseState.actorId === 'player' ||
  isPlayerPalaceStrifeTargetId(caseState.targetConsortId) ||
  isPlayerPalaceStrifeTargetId(caseState.framedTargetConsortId) ||
  Boolean((caseState.suspects ?? []).some((suspect) => suspect.subjectType === 'player'));

const finalizeNpcOnlyPendingVerdictForSettlement = (caseState: PalaceStrifeCaseState): PalaceStrifeCaseState => {
  if (caseState.status !== 'pending_verdict' || isPlayerRelatedPendingVerdictForSettlement(caseState)) {
    return caseState;
  }

  const event: YangxinVerdictEventState = {
    id: `yangxin-verdict-auto-${caseState.id}`,
    sourceType: 'palace-strife',
    sourceId: caseState.id,
    severity: caseState.severity,
    stage: 'done',
    attendees: [],
    statements: [],
    playerChoices: [],
    selectedChoiceId: 'state-facts',
  };
  return finalizeYangxinVerdictCase(caseState, {
    ...event,
    result: resolveYangxinVerdictResult(event, caseState, 'state-facts'),
  });
};

const settlePalaceStrifeForXunTransitions = (
  caseStates: PalaceStrifeCaseState[],
  xunTransitions: number,
  playerState: GameNumericsState,
  hiddenStats: HiddenStatsState,
  concubines: ConcubineProfile[],
  customConsorts: ConcubineProfile[],
  nextTime: PalaceTimeState,
  npcActivity: NpcActivityState,
): { cases: PalaceStrifeCaseState[]; lines: string[] } => {
  let nextCases = caseStates;
  const lines: string[] = [];

  for (let i = 0; i < xunTransitions; i += 1) {
    const beforeStep = nextCases;
    const resolved = resolvePendingPalaceStrifeCasesForTransition(nextCases, playerState, hiddenStats, concubines, customConsorts);
    const afterInvestigation = resolved.cases.map((caseState) =>
      resolved.resolvedIds.has(caseState.id) ? caseState : advancePalaceStrifeInvestigations([caseState], 1)[0],
    );
    const afterNpcOnlyVerdicts = afterInvestigation.map(finalizeNpcOnlyPendingVerdictForSettlement);
    lines.push(...resolved.lines, ...describePalaceStrifeInvestigationChanges(beforeStep, afterNpcOnlyVerdicts));
    nextCases = afterNpcOnlyVerdicts;
  }

  const hostilePlotActivity = getHostilePlotActivity(npcActivity);
  if (!hostilePlotActivity) {
    return { cases: nextCases, lines };
  }

  const npcCase = generateNpcPalaceStrifeCase({
    concubines: [...concubines, ...customConsorts],
    existingCases: nextCases,
    playerState,
    playerRankLabel: resolvePlayerRankLabelForState(playerState, hiddenStats),
    time: {
      year: nextTime.year,
      month: nextTime.month,
      xun: nextTime.xun,
    },
    preferredActorConsortId: hostilePlotActivity?.actorConsortId,
    preferredTargetConsortId: hostilePlotActivity?.targetConsortId,
  });
  if (npcCase) {
    nextCases = [...nextCases, npcCase];
    lines.push(`宫中暗流：${npcCase.summary}`);
  }

  return { cases: nextCases, lines };
};

const getConvictedSuspect = (caseState: PalaceStrifeCaseState) =>
  (caseState.suspects ?? []).find((suspect) => suspect.id === caseState.convictedSuspectId);

const getConvictedConsortId = (caseState: PalaceStrifeCaseState): string | undefined => {
  const suspect = getConvictedSuspect(caseState);
  if (suspect?.subjectType === 'consort') {
    return suspect.subjectId;
  }
  if (!suspect && caseState.actorId === 'npc') {
    return caseState.actorConsortId;
  }
  return undefined;
};

const isPlayerConvictedInCase = (caseState: PalaceStrifeCaseState): boolean => {
  const suspect = getConvictedSuspect(caseState);
  if (suspect) {
    return suspect.subjectType === 'player';
  }
  return caseState.actorId === 'player' || isPlayerPalaceStrifeTargetId(caseState.framedTargetConsortId);
};

const isPlayerRelatedPalaceStrifeCase = (caseState: PalaceStrifeCaseState): boolean =>
  caseState.actorId === 'player' ||
  isPlayerPalaceStrifeTargetId(caseState.targetConsortId) ||
  isPlayerPalaceStrifeTargetId(caseState.framedTargetConsortId) ||
  Boolean(
    (caseState.suspects ?? []).some(
      (suspect) =>
        suspect.subjectType === 'player' &&
        (suspect.id === caseState.pendingVerdictSuspectId || suspect.suspicionRate >= 100 || caseState.status === 'pending_verdict'),
    ),
  );

const findPendingYangxinVerdictCase = (caseStates: PalaceStrifeCaseState[]): PalaceStrifeCaseState | undefined =>
  caseStates.find(
    (caseState) =>
      caseState.status === 'pending_verdict' &&
      !caseState.penaltyApplied &&
      Boolean(caseState.pendingVerdictSuspectId) &&
      isPlayerRelatedPalaceStrifeCase(caseState),
  );

const buildPendingYangxinVerdictEventForCase = (
  caseState: PalaceStrifeCaseState | undefined,
  playerState: GameNumericsState,
  hiddenStats: HiddenStatsState,
  concubines: ConcubineProfile[],
  customConsorts: ConcubineProfile[],
): YangxinVerdictEventState | undefined =>
  caseState
    ? buildYangxinVerdictEvent({
        caseState,
        playerState,
        playerRankLabel: resolvePlayerRankLabelForState(playerState, hiddenStats),
        concubines: [...concubines, ...customConsorts],
      })
    : undefined;

const applyNpcPalaceStrifeConvictionPenalties = (
  concubines: ConcubineProfile[],
  convictedCases: PalaceStrifeCaseState[],
): ConcubineProfile[] => {
  if (convictedCases.length === 0) {
    return concubines;
  }

  const penaltiesByActorId = new Map<string, ReturnType<typeof resolvePalaceStrifeConvictionPenalty>>();
  convictedCases.forEach((caseState) => {
    const convictedConsortId = getConvictedConsortId(caseState);
    if (!convictedConsortId) {
      return;
    }
    const penalty = resolvePalaceStrifeConvictionPenalty(caseState);
    const existing = penaltiesByActorId.get(convictedConsortId);
    penaltiesByActorId.set(convictedConsortId, {
      prestigeDelta: (existing?.prestigeDelta ?? 0) + penalty.prestigeDelta,
      favorDelta: (existing?.favorDelta ?? 0) + penalty.favorDelta,
      stressDelta: (existing?.stressDelta ?? 0) + penalty.stressDelta,
      summary: '',
    });
  });

  if (penaltiesByActorId.size === 0) {
    return concubines;
  }

  return concubines.map((consort) => {
    const penalty = penaltiesByActorId.get(consort.id);
    if (!penalty) {
      return consort;
    }
    return normalizeConcubineProfile({
      ...consort,
      stats: {
        ...consort.stats,
        prestige: normalizePrestige(Number(consort.stats.prestige ?? 0) + penalty.prestigeDelta),
        favor: Number(consort.stats.favor ?? 0) + penalty.favorDelta,
        stress: Number(consort.stats.stress ?? 0) + penalty.stressDelta,
        relationToPlayer: Math.min(Number(consort.stats.relationToPlayer ?? 0), -20),
      },
    });
  });
};

const applyNpcActivityStressDeltas = (
  concubines: ConcubineProfile[],
  deltasByConsortId: Record<string, number>,
): ConcubineProfile[] => {
  if (Object.keys(deltasByConsortId).length === 0) {
    return concubines;
  }

  return concubines.map((consort) => {
    const delta = deltasByConsortId[consort.id];
    if (!delta) {
      return consort;
    }
    return normalizeConcubineProfile({
      ...consort,
      stats: {
        ...consort.stats,
        stress: Math.max(0, Number(consort.stats.stress ?? 0) + delta),
      },
    });
  });
};

const describeNpcPalaceStrifeConvictionPenalties = (convictedCases: PalaceStrifeCaseState[]): string[] =>
  convictedCases
    .filter((caseState) => getConvictedConsortId(caseState))
    .map((caseState) => {
      const penalty = resolvePalaceStrifeConvictionPenalty(caseState);
      const suspect = getConvictedSuspect(caseState);
      return `${suspect?.name ?? caseState.actorName ?? getConvictedConsortId(caseState)}因${caseState.targetName}一案定罪，声望-${Math.abs(
        penalty.prestigeDelta,
      )}、宠爱-${Math.abs(penalty.favorDelta)}${penalty.stressDelta > 0 ? `，压力+${penalty.stressDelta}` : ''}。`;
    });
const applyNightlyServiceConsortEffect = (
  concubines: ConcubineProfile[],
  targetConsortId: string | undefined,
  favorDelta: number,
): ConcubineProfile[] => {
  if (!targetConsortId || favorDelta === 0) {
    return concubines;
  }

  return concubines.map((consort) =>
    consort.id === targetConsortId
      ? normalizeConcubineProfile({
          ...consort,
          stats: {
            ...consort.stats,
            favor: Number(consort.stats.favor ?? 0) + favorDelta,
          },
        })
      : consort,
  );
};

const sanitizeRelationshipDelta = (value: number): number => Math.max(-1, Math.min(1, Math.trunc(value || 0)));
const resolveXunStartingStamina = (): number => clampInt(STAMINA_INITIAL_PER_XUN, 0, STAMINA_MAX);
const normalizePlayerFavor = (favor: number): number => clampToRange(Number(favor ?? 0), PLAYER_FAVOR_RANGE);
const normalizePrestige = (prestige: number): number => clampToRange(Number(prestige ?? 0), PRESTIGE_RANGE);
const MAX_SETTLEMENT_REPORTS = 20;

const baseMonthlyStipendByRank: Record<string, number> = {
  皇贵妃: 230,
  皇后: 220,
  贵妃: 210,
  '德妃 / 淑妃 / 贤妃': 200,
  妃: 190,
  九嫔: 180,
  贵嫔: 170,
  婕好: 160,
  容华: 150,
  嫔: 140,
  贵人: 130,
  美人: 120,
  才人: 110,
  常在: 100,
  御女: 90,
  选侍: 80,
  答应: 70,
  更衣: 60,
  官女子: 50,
};

const resolveFavorPresentation = (favor: number): Pick<HiddenStatsState, 'favorLabel' | 'favorColor'> => {
  const tier = getFavorTierByValue(favor);
  return {
    favorLabel: tier.label,
    favorColor: tier.color,
  };
};

const resolveMonthlyEconomy = (state: GameNumericsState, hiddenStats: HiddenStatsState) => {
  const rankName =
    normalizeTrackedPlayerRankLabel(hiddenStats.initialRank) ?? resolvePlayerRankByPrestige(state.prestige);
  const baseStipend = state.flags.inColdPalace ? 0 : baseMonthlyStipendByRank[rankName] ?? 50;
  const rankBelowFei = getRankWeight(rankName) > getRankWeight('妃');
  let stipend = baseStipend;

  if (rankBelowFei && state.favor > 0 && state.favor < 20) {
    stipend = Math.floor(stipend * 0.7);
  } else if (rankBelowFei && state.favor <= 0) {
    stipend = Math.floor(stipend * 0.5);
  }

  if (state.favor >= 61) {
    stipend = Math.floor(stipend * 1.2);
  }

  const strategy = getMonthlyExpenseStrategyConfig(state.monthlyExpenseStrategy);
  const palaceExpense = Math.floor(stipend * strategy.expenseRate);
  const netSilver = stipend - palaceExpense;

  return {
    rankName,
    baseStipend,
    stipend,
    palaceExpense,
    netSilver,
    strategy,
  };
};

interface MonthGovernanceUpdate {
  previousRankName: string;
  expectedRankName: string;
  nextRankName: string;
  previousResidenceName: GameNumericsState['residenceName'];
  nextResidenceName: GameNumericsState['residenceName'];
}

const buildSettlementReport = ({
  currentState,
  nextState,
  nextTime,
  xunTransitions,
  monthTransitions,
  economy,
  monthGovernance,
  nightlyServiceLines,
  lateNightPenaltyLines,
  palaceStrifeLines,
  reportIndex,
}: {
  currentState: GameNumericsState;
  nextState: GameNumericsState;
  nextTime: PalaceTimeState;
  xunTransitions: number;
  monthTransitions: number;
  economy: ReturnType<typeof resolveMonthlyEconomy> | null;
  monthGovernance: MonthGovernanceUpdate | null;
  nightlyServiceLines: string[];
  lateNightPenaltyLines: string[];
  palaceStrifeLines: string[];
  reportIndex: number;
}): SettlementReport | null => {
  if (xunTransitions <= 0) {
    return null;
  }

  const isMonthReport = monthTransitions > 0;
  const title = isMonthReport
    ? `${nextTime.year}年${nextTime.month}月月初通报`
    : `${nextTime.year}年${nextTime.month}月第${nextTime.xun}旬清晨通报`;
  const lines = [
    xunTransitions > 1
      ? `已连续推进${xunTransitions}旬，当前回到${nextTime.month}月第${nextTime.xun}旬清晨。`
      : `已入${nextTime.month}月第${nextTime.xun}旬清晨，体力按新旬口径恢复为${nextState.stamina}。`,
  ];

  if (lateNightPenaltyLines.length > 0) {
    lines.push(...lateNightPenaltyLines);
  }

  if (economy && monthTransitions > 0) {
    const currentRank = monthGovernance?.nextRankName ?? economy.rankName;
    const nextRankRequiredPrestige = resolveNextPlayerRankPrestigeRequirement(currentRank);
    lines.push(`本月月俸：${economy.stipend}`);
    lines.push(`本月用度：${economy.palaceExpense}`);
    lines.push(`当前银两：${nextState.silver}`);
    lines.push(`当前位份：${currentRank}`);
    lines.push(`当前声望：${nextState.prestige} / ${nextRankRequiredPrestige ?? '已达顶位'}`);
    if (palaceStrifeLines.length > 0) {
      lines.push(`宫斗案件：本月有${palaceStrifeLines.length}条变动。`);
      lines.push(...palaceStrifeLines);
    } else {
      lines.push('宫斗案件：本月暂无结案或新调查。');
    }
  } else {
    if (nightlyServiceLines.length > 0) {
      lines.push(...nightlyServiceLines);
    } else {
      lines.push('宫中暂未触发强制夜间事件，娘娘仍可自由安排行程。');
    }
    if (currentState.stamina !== nextState.stamina) {
      lines.push(`上一旬剩余体力不继承，新旬体力已重算为${nextState.stamina}。`);
    }
    if (palaceStrifeLines.length > 0) {
      lines.push(...palaceStrifeLines);
    }
  }

  if (economy && monthTransitions > 0 && nightlyServiceLines.length > 0) {
    lines.push(...nightlyServiceLines);
  }

  return {
    id: `${nextTime.year}-${nextTime.month}-${nextTime.xun}-${reportIndex}`,
    kind: isMonthReport ? 'month' : 'xun',
    year: nextTime.year,
    month: nextTime.month,
    xun: nextTime.xun,
    title,
    summary: lines.join(' '),
    lines,
  };
};

const isDuplicateSettlementReport = (previous: SettlementReport | undefined, next: SettlementReport | null): boolean =>
  Boolean(
    previous &&
      next &&
      previous.kind === next.kind &&
      previous.year === next.year &&
      previous.month === next.month &&
      previous.xun === next.xun &&
      previous.title === next.title,
  );

const buildPalaceBanquetRegistrationReport = ({
  seasonKey,
  eventTime,
  reportIndex,
}: {
  seasonKey: string;
  eventTime: PalaceTimeState;
  reportIndex: number;
}): SettlementReport => ({
  id: `palace-banquet-registration-${seasonKey}-${reportIndex}`,
  kind: 'event',
  year: eventTime.year,
  month: eventTime.month,
  xun: eventTime.xun,
  title: '宫宴报名开启',
  summary: `司乐女官来报：本届宫宴定于${eventTime.month}月第${eventTime.xun}旬${eventTime.slot}，妙音堂今日起收录曲谱。`,
  lines: [
    `司乐女官来报：本届宫宴定于${eventTime.month}月第${eventTime.xun}旬${eventTime.slot}。`,
    '妙音堂今日起收录曲谱，若娘娘手中有合适曲谱，可在宫宴前递交报名。',
    '报名截止在宫宴开始前，逾时便只能随班入席。',
  ],
});

const buildRankPromotionReport = ({
  nextTime,
  previousRankName,
  nextRankName,
  previousResidenceName,
  nextResidenceName,
  reportIndex,
}: {
  nextTime: PalaceTimeState;
  previousRankName: string;
  nextRankName: string;
  previousResidenceName: string;
  nextResidenceName: string;
  reportIndex: number;
}): SettlementReport => {
  const residenceLine =
    previousResidenceName !== nextResidenceName
      ? `另迁居${nextResidenceName}，原${previousResidenceName}诸事由内务府交割。`
      : `仍居${nextResidenceName}，宫中用度按新位分重定。`;
  const lines = [
    `内侍奉旨来报：皇上有旨，念娘娘入宫以来谨慎持身、声望渐著，由${previousRankName}晋为${nextRankName}。`,
    residenceLine,
  ];

  return {
    id: `rank-promotion-${nextTime.year}-${nextTime.month}-${nextTime.xun}-${reportIndex}`,
    kind: 'promotion',
    year: nextTime.year,
    month: nextTime.month,
    xun: nextTime.xun,
    title: '晋封旨意',
    summary: lines.join(' '),
    lines,
  };
};

const buildPalaceBanquetResultReport = ({
  seasonKey,
  completedAt,
  lines,
  reportIndex,
}: {
  seasonKey: string;
  completedAt: PalaceTimeState;
  lines: string[];
  reportIndex: number;
}): SettlementReport => ({
  id: `palace-banquet-result-${seasonKey}-${reportIndex}`,
  kind: 'event',
  year: completedAt.year,
  month: completedAt.month,
  xun: completedAt.xun,
  title: '系统宫宴通报',
  summary: lines.join(' '),
  lines,
});

const enforceRosterFavorCaps = (concubines: ConcubineProfile[], playerFavor: number): ConcubineProfile[] =>
  enforceConcubineFavorTierCaps(concubines, [playerFavor]);

const applyConcubineUpdater = (
  list: ConcubineProfile[],
  consortId: string,
  updater: (consort: ConcubineProfile) => ConcubineProfile,
): ConcubineProfile[] => {
  let touched = false;
  const nextList = list.map((consort) => {
    if (consort.id !== consortId) {
      return consort;
    }
    touched = true;
    return normalizeConcubineProfile(updater(consort));
  });

  return touched ? nextList : list;
};

const createEmptyConsortInteractionProgress = (consortId: string, xunKey: string): ConsortInteractionProgress => ({
  consortId,
  xunKey,
  actionCountThisXun: 0,
  favorDeltaThisXun: 0,
  affectionDeltaThisXun: 0,
});

const buildRouteConcubines = (
  routeId: GameNumericsState['routeId'],
  customConsorts: ConcubineProfile[],
  playerFavor: number,
): ConcubineProfile[] => buildInitialConcubineRoster(routeId, customConsorts, [playerFavor]);

const rebalanceStatsToFitBudget = (
  stats: Record<string, number>,
  mins: Record<string, number>,
  maxTotal: number,
): Record<string, number> => {
  const currentTotal = sumExcessPoints(stats, mins);
  if (currentTotal <= maxTotal) {
    return stats;
  }

  const overshoot = currentTotal - maxTotal;
  const keys = Object.keys(stats);
  const reducible = keys
    .map((key) => {
      const min = mins[key] ?? 0;
      const current = Number(stats[key] ?? 0);
      return { key, min, current, excess: Math.max(0, current - min) };
    })
    .filter((entry) => entry.excess > 0);

  const totalReducible = reducible.reduce((acc, entry) => acc + entry.excess, 0);
  if (totalReducible < overshoot) {
    return { ...mins };
  }

  const next: Record<string, number> = { ...stats };
  let remaining = overshoot;

  const rawCuts = reducible.map((entry) => ({
    key: entry.key,
    min: entry.min,
    current: entry.current,
    excess: entry.excess,
    cut: Math.floor((overshoot * entry.excess) / totalReducible),
  }));

  for (const item of rawCuts) {
    const cut = Math.min(item.excess, item.cut);
    if (cut <= 0) {
      continue;
    }
    next[item.key] = item.current - cut;
    remaining -= cut;
  }

  if (remaining > 0) {
    const sorted = [...reducible].sort((a, b) => b.excess - a.excess);
    let idx = 0;
    while (remaining > 0 && idx < sorted.length * 10) {
      const entry = sorted[idx % sorted.length];
      const min = mins[entry.key] ?? 0;
      const current = Number(next[entry.key] ?? 0);
      if (current > min) {
        next[entry.key] = current - 1;
        remaining -= 1;
      }
      idx += 1;
    }
  }

  return next;
};

const validatePointsState = (state: GameNumericsState): GameNumericsState => {
  const mins = getFieldMinMap();
  const pointsTotal = resolveRouteInitialPointsTotal(state.routeId, state.family);
  const normalizedStats = { ...mins, ...(state.stats ?? {}) };
  const balancedStats = rebalanceStatsToFitBudget(normalizedStats, mins, pointsTotal);
  const allocated = sumExcessPoints(balancedStats, mins);
  const pointsLeft = Math.max(0, pointsTotal - allocated);

  return {
    ...state,
    pointsTotal,
    pointsLeft,
    stats: balancedStats,
  };
};

const ATTRIBUTE_STATS_FINALIZED_FLAG = 'attributeStatsFinalized';

const finalizeAttributeStats = (state: GameNumericsState): GameNumericsState => {
  if (state.flags[ATTRIBUTE_STATS_FINALIZED_FLAG]) {
    return state;
  }

  const stats = state.stats ?? {};
  return {
    ...state,
    stats: {
      ...stats,
      health: convertHealthPoints(Number(stats.health ?? 0)),
      fortune: convertFortuneAttributePoints(Number(stats.fortune ?? 0)),
      intrigue: convertIntriguePoints(Number(stats.intrigue ?? 0)),
      appearance: convertAppearancePoints(Number(stats.appearance ?? 0)),
      temperament: convertTemperamentPoints(Number(stats.temperament ?? 0)),
      poetry: convertSkillLevel(Number(stats.poetry ?? 0)),
      talent: convertSkillLevel(Number(stats.talent ?? 0)),
      painting: convertSkillLevel(Number(stats.painting ?? 0)),
      embroidery: convertSkillLevel(Number(stats.embroidery ?? 0)),
      medicine: convertSkillLevel(Number(stats.medicine ?? 0)),
      politics: convertSkillLevel(Number(stats.politics ?? 0)),
    },
    flags: {
      ...state.flags,
      [ATTRIBUTE_STATS_FINALIZED_FLAG]: true,
    },
  };
};

const initialState: GameNumericsState = validatePointsState({
  name: initialRouteConfig.defaultName,
  age: rangeStart(initialRouteConfig.ageRange),
  family: initialRouteConfig.familyDisplay,
  residenceName: initialRouteConfig.residenceDisplay,
  openingTendency: undefined,
  monthlyExpenseStrategy: DEFAULT_MONTHLY_EXPENSE_STRATEGY,
  nextMonthlyExpenseStrategy: undefined,
  familyAidBonus: 0,
  familyAidPrestigePending: 0,
  pointsTotal: rangeStart(initialRouteConfig.pointsRange),
  pointsLeft: rangeStart(initialRouteConfig.pointsRange),
  routeId: 'lanyinxuguo',
  stamina: STAMINA_INITIAL_PER_XUN,
  silver: rangeStart(initialRouteConfig.silverRange),
  prestige: rangeStart(initialRouteConfig.prestigeRange),
  stress: rangeStart(initialRouteConfig.stressRange),
  favor: rangeMidpoint(initialRouteConfig.favorRange),
  trueHeart: rangeMidpoint(initialRouteConfig.trueHeartRange),
  stats: initialStats,
  flags: {},
});

const initialHiddenStats: HiddenStatsState = {
  silver: initialState.silver,
  prestige: initialState.prestige,
  stress: initialState.stress,
  favor: initialState.favor,
  trueHeart: initialState.trueHeart,
  ...resolveFavorPresentation(initialState.favor),
};

const initialTime: PalaceTimeState = {
  year: getNumericRuleValue('initial_year'),
  month: getNumericRuleValue('initial_month'),
  xun: getNumericRuleValue('initial_xun'),
  slotIndex: getNumericRuleValue('initial_slot_index'),
  slot: timeSlots[0],
  slotProgress: getNumericRuleValue('initial_slot_progress'),
};

const initialBondProfile = buildInitialBondProfile('lanyinxuguo', getCurrentXunKey(initialTime));
const initialConcubines = buildRouteConcubines('lanyinxuguo', [], initialState.favor);
const initialNpcRelationMatrix: NpcRelationMatrix = {};
const initialNpcActivity = generateNpcActivities({
  routeId: 'lanyinxuguo',
  xunKey: getCurrentXunKey(initialTime),
  concubines: initialConcubines,
  customConsorts: [],
  relationMatrix: initialNpcRelationMatrix,
});
const initialInventory = cloneInitialInventory();
const initialMerchantLedger: Record<string, number> = {};

const resolveSceneForView = (currentView: CurrentView): SceneId => {
  if (currentView === 'start') {
    return 'menu';
  }
  if (currentView === 'map-main') {
    return 'map';
  }
  return 'activity';
};

const resolveResumeViewFromSave = (saveGame: SaveGameV1): CurrentView => {
  if (!saveGame.route.selectedRoute) {
    return 'route-selection';
  }
  if (!saveGame.player.state.flags[ATTRIBUTE_STATS_FINALIZED_FLAG]) {
    return 'attribute-assignment';
  }
  if (!saveGame.player.state.flags.openingGuideFinished) {
    return 'opening-dialogue';
  }
  if (!saveGame.player.state.flags.mapGuideFinished) {
    return 'map-main';
  }
  return 'bedchamber';
};

const createInitialGameFlowFields = (currentView: CurrentView): Partial<GameFlowStore> => ({
  currentView,
  scene: resolveSceneForView(currentView),
  activeChamberPanel: 'main',
  activeMapLocation: undefined,
  activeMapLocationEntryTime: undefined,
  activeAffairsSource: DEFAULT_AFFAIRS_SOURCE,
  routeId: 'lanyinxuguo',
  state: initialState,
  hiddenStats: initialHiddenStats,
  time: initialTime,
  briefing: '',
  mapEventText: '',
  dialogue: undefined,
  save: undefined,
  selectedRoute: undefined,
  bondProfile: initialBondProfile,
  concubineRouteId: 'lanyinxuguo',
  concubines: initialConcubines,
  customConsorts: [],
  inventory: cloneInitialInventory(),
  merchantLedger: {},
  consortInteractionMap: {},
  kitchenProgress: createInitialKitchenProgress(),
  medicalProgress: createInitialMedicalProgress(),
  musicHallProgress: createInitialMusicHallProgress(),
  palaceBanquetProgress: createInitialPalaceBanquetProgress(),
  craftWorksProgress: createInitialCraftWorksProgress(),
  templeProgress: createInitialTempleProgress(),
  emperorInteraction: createInitialEmperorInteractionProgress(),
  nightlyService: createInitialNightlyService(),
  npcActivity: initialNpcActivity,
  npcRelationMatrix: initialNpcRelationMatrix,
  settlementReports: [],
  palaceStrifeCases: [],
  pendingYangxinVerdict: undefined,
  latestSettlementReportId: undefined,
  lastSeenSettlementReportId: undefined,
  numericFeedbackSignal: { sequence: 0, bucket: 'chamber-action' },
  pendingOvernightReturn: undefined,
  pendingViewTransitionCleanup: undefined,
});

const restoreSaveGameV1Fields = (saveGame: SaveGameV1): Partial<GameFlowStore> => ({
  currentView: 'start',
  scene: 'menu',
  activeChamberPanel: 'main',
  activeMapLocation: undefined,
  activeMapLocationEntryTime: undefined,
  pendingViewTransitionCleanup: undefined,
  activeAffairsSource: DEFAULT_AFFAIRS_SOURCE,
  routeId: saveGame.route.routeId,
  state: {
    ...saveGame.player.state,
    monthlyExpenseStrategy: saveGame.player.state.monthlyExpenseStrategy ?? DEFAULT_MONTHLY_EXPENSE_STRATEGY,
    familyAidBonus: saveGame.player.state.familyAidBonus ?? 0,
    familyAidPrestigePending: saveGame.player.state.familyAidPrestigePending ?? 0,
  },
  hiddenStats: saveGame.player.hiddenStats,
  time: saveGame.world.time,
  briefing: '',
  mapEventText: '',
  dialogue: undefined,
  save: undefined,
  selectedRoute: saveGame.route.selectedRoute,
  bondProfile: saveGame.relations.bondProfile,
  concubineRouteId: saveGame.roster.concubineRouteId,
  concubines: enforceConcubineFavorTierCaps(
    saveGame.roster.concubines.map(normalizeConcubineProfile),
    [saveGame.player.state.favor],
  ),
  customConsorts: saveGame.roster.customConsorts.map(normalizeConcubineProfile),
  inventory: saveGame.inventory.items,
  merchantLedger: saveGame.inventory.merchantLedger,
  consortInteractionMap: saveGame.relations.consortInteractionMap,
  kitchenProgress: saveGame.progress.kitchen,
  medicalProgress: saveGame.progress.medical,
  musicHallProgress: saveGame.progress.musicHall,
  palaceBanquetProgress: saveGame.progress.palaceBanquet,
  craftWorksProgress: saveGame.progress.craftWorks,
  templeProgress: saveGame.progress.temple,
  emperorInteraction: saveGame.progress.emperorInteraction,
  nightlyService: saveGame.progress.nightlyService,
  npcActivity: saveGame.progress.npcActivity,
  npcRelationMatrix: saveGame.relations.npcRelationMatrix,
  settlementReports: saveGame.world.settlementReports,
  palaceStrifeCases: saveGame.cases?.palaceStrifeCases ?? [],
  pendingYangxinVerdict: saveGame.cases?.pendingYangxinVerdict ?? undefined,
  latestSettlementReportId: saveGame.world.latestSettlementReportId,
  lastSeenSettlementReportId: saveGame.world.lastSeenSettlementReportId,
  numericFeedbackSignal: { sequence: 0, bucket: 'chamber-action' },
  pendingOvernightReturn: undefined,
});

export const useGameFlowStore = create<GameFlowStore>()(
  persist(
    (set, get) => ({
      currentView: 'start',
      scene: 'menu',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      activeMapLocationEntryTime: undefined,
      activeAffairsSource: DEFAULT_AFFAIRS_SOURCE,
      routeId: 'lanyinxuguo',
      state: initialState,
      hiddenStats: initialHiddenStats,
      time: initialTime,
      briefing: '',
      mapEventText: '',
      dialogue: undefined,
      save: undefined,
      selectedRoute: undefined,
      bondProfile: initialBondProfile,
      concubineRouteId: 'lanyinxuguo',
      concubines: initialConcubines,
      customConsorts: [],
      inventory: initialInventory,
      merchantLedger: initialMerchantLedger,
      consortInteractionMap: {},
      kitchenProgress: createInitialKitchenProgress(),
      medicalProgress: createInitialMedicalProgress(),
      musicHallProgress: createInitialMusicHallProgress(),
      palaceBanquetProgress: createInitialPalaceBanquetProgress(),
      craftWorksProgress: createInitialCraftWorksProgress(),
      templeProgress: createInitialTempleProgress(),
      emperorInteraction: createInitialEmperorInteractionProgress(),
      nightlyService: createInitialNightlyService(),
      npcActivity: initialNpcActivity,
      npcRelationMatrix: initialNpcRelationMatrix,
      settlementReports: [],
      palaceStrifeCases: [],
      pendingYangxinVerdict: undefined,
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
      numericFeedbackSignal: { sequence: 0, bucket: 'chamber-action' },
      pendingOvernightReturn: undefined,
      pendingViewTransitionCleanup: undefined,
      setCurrentView: (currentView) => set({ currentView }),
      setScene: (scene) => set({ scene }),
      openChamberPanel: (activeChamberPanel) => set({ activeChamberPanel }),
      closeChamberPanel: () => set({ activeChamberPanel: 'main' }),
      setActiveAffairsSource: (activeAffairsSource) => set({ activeAffairsSource }),
      enterMainChamber: (location, entryTime) =>
        set({
          currentView: 'bedchamber',
          scene: 'activity',
          activeChamberPanel: 'main',
          activeMapLocation: location ?? undefined,
          activeMapLocationEntryTime: location ? entryTime : undefined,
          pendingViewTransitionCleanup: undefined,
        }),
      enterMapMain: () =>
        set((current) => {
          const shouldDelayCleanup = current.currentView === 'bedchamber' && Boolean(current.activeMapLocation);
          return {
            currentView: 'map-main',
            scene: 'map',
            activeChamberPanel: shouldDelayCleanup ? current.activeChamberPanel : 'main',
            activeMapLocation: shouldDelayCleanup ? current.activeMapLocation : undefined,
            activeMapLocationEntryTime: shouldDelayCleanup ? current.activeMapLocationEntryTime : undefined,
            pendingViewTransitionCleanup: shouldDelayCleanup
              ? {
                  targetView: 'map-main',
                  clearMapLocation: true,
                  resetChamberPanel: true,
                }
              : undefined,
          };
        }),
      completeViewTransitionCleanup: () =>
        set((current) => {
          const cleanup = current.pendingViewTransitionCleanup;
          if (!cleanup || current.currentView !== cleanup.targetView) {
            return current;
          }

          return {
            activeChamberPanel: cleanup.resetChamberPanel ? 'main' : current.activeChamberPanel,
            activeMapLocation: cleanup.clearMapLocation ? undefined : current.activeMapLocation,
            activeMapLocationEntryTime: cleanup.clearMapLocation ? undefined : current.activeMapLocationEntryTime,
            pendingViewTransitionCleanup: undefined,
          };
        }),
      setRoute: (routeId) =>
        set((current) => {
          const nextConcubines = buildRouteConcubines(routeId, current.customConsorts, current.state.favor);
          const npcRelationMatrix: NpcRelationMatrix = {};
          return {
            routeId,
            state: { ...current.state, routeId },
            bondProfile: buildInitialBondProfile(routeId, getCurrentXunKey(current.time)),
            concubineRouteId: routeId,
            concubines: nextConcubines,
            merchantLedger: {},
            kitchenProgress: createInitialKitchenProgress(),
            medicalProgress: createInitialMedicalProgress(),
            musicHallProgress: createInitialMusicHallProgress(),
            palaceBanquetProgress: createInitialPalaceBanquetProgress(),
            templeProgress: createInitialTempleProgress(),
            emperorInteraction: createInitialEmperorInteractionProgress(),
            nightlyService: createInitialNightlyService(),
            npcRelationMatrix,
            npcActivity: generateNpcActivities({
              routeId,
              xunKey: getCurrentXunKey(current.time),
              concubines: nextConcubines,
              customConsorts: current.customConsorts,
              relationMatrix: npcRelationMatrix,
            }),
            settlementReports: [],
            latestSettlementReportId: undefined,
            lastSeenSettlementReportId: undefined,
          };
        }),
      applyRouteSelection: (profile) =>
        set(() => {
          const nextFavor = normalizePlayerFavor(profile.hiddenStats.favor);
          const nextConcubines = buildRouteConcubines(profile.id, [], nextFavor);
          const npcRelationMatrix: NpcRelationMatrix = {};
          return {
            currentView: 'attribute-assignment',
            scene: 'activity',
            activeChamberPanel: 'main',
            activeMapLocation: undefined,
            activeMapLocationEntryTime: undefined,
            activeAffairsSource: DEFAULT_AFFAIRS_SOURCE,
            routeId: profile.id,
            selectedRoute: profile,
            state: validatePointsState({
              ...initialState,
              ...profile.baseState,
              routeId: profile.id,
              name: profile.baseState.name ?? profile.defaultName,
              family: profile.baseState.family ?? profile.familyDisplay,
              residenceName: profile.baseState.residenceName ?? profile.residenceDisplay,
              monthlyExpenseStrategy: profile.baseState.monthlyExpenseStrategy ?? DEFAULT_MONTHLY_EXPENSE_STRATEGY,
              nextMonthlyExpenseStrategy: profile.baseState.nextMonthlyExpenseStrategy,
              familyAidBonus: profile.baseState.familyAidBonus ?? 0,
              familyAidPrestigePending: profile.baseState.familyAidPrestigePending ?? 0,
              age: profile.baseState.age ?? initialState.age,
              stamina: profile.baseState.stamina ?? STAMINA_INITIAL_PER_XUN,
              silver: profile.hiddenStats.silver,
              prestige: profile.hiddenStats.prestige,
              stress: profile.hiddenStats.stress,
              favor: nextFavor,
              trueHeart: profile.hiddenStats.trueHeart,
              pointsTotal: profile.baseState.pointsTotal ?? initialState.pointsTotal,
              pointsLeft: profile.baseState.pointsTotal ?? profile.baseState.pointsLeft ?? initialState.pointsLeft,
              flags: {
                routeLockedStats: Boolean(profile.statsLocked),
              },
            }),
            hiddenStats: {
              ...profile.hiddenStats,
              favor: nextFavor,
              ...resolveFavorPresentation(nextFavor),
            },
            time: initialTime,
            briefing: '',
            mapEventText: '',
            dialogue: undefined,
            save: undefined,
            bondProfile: buildInitialBondProfile(profile.id, getCurrentXunKey(initialTime)),
            concubineRouteId: profile.id,
            concubines: nextConcubines,
            customConsorts: [],
            inventory: cloneInitialInventory(),
            merchantLedger: {},
            consortInteractionMap: {},
            kitchenProgress: createInitialKitchenProgress(),
            medicalProgress: createInitialMedicalProgress(),
            musicHallProgress: createInitialMusicHallProgress(),
            palaceBanquetProgress: createInitialPalaceBanquetProgress(),
            templeProgress: createInitialTempleProgress(),
            emperorInteraction: createInitialEmperorInteractionProgress(),
            nightlyService: createInitialNightlyService(),
            npcRelationMatrix,
            npcActivity: generateNpcActivities({
              routeId: profile.id,
              xunKey: getCurrentXunKey(initialTime),
              concubines: nextConcubines,
              customConsorts: [],
              relationMatrix: npcRelationMatrix,
            }),
            settlementReports: [],
            palaceStrifeCases: [],
            pendingYangxinVerdict: undefined,
            latestSettlementReportId: undefined,
            lastSeenSettlementReportId: undefined,
            numericFeedbackSignal: { sequence: 0, bucket: 'chamber-action' },
          };
        }),
      setPlayerName: (name) =>
        set((current) => ({
          state: {
            ...current.state,
            name,
          },
          selectedRoute: current.selectedRoute
            ? {
                ...current.selectedRoute,
                defaultName: name,
                baseState: {
                  ...current.selectedRoute.baseState,
                  name,
                },
              }
            : current.selectedRoute,
        })),
      patchState: (patch) =>
        set((current) => {
          const merged = { ...current.state, ...patch };
          const shouldValidate =
            !current.state.flags[ATTRIBUTE_STATS_FINALIZED_FLAG] &&
            ('family' in patch || 'stats' in patch || 'pointsTotal' in patch || 'pointsLeft' in patch);
          const nextState = {
            ...(shouldValidate ? validatePointsState(merged) : merged),
            favor: normalizePlayerFavor(merged.favor ?? current.state.favor),
          };
          if (typeof patch.favor !== 'number') {
            return { state: nextState };
          }

          return {
            state: nextState,
            hiddenStats: {
              ...current.hiddenStats,
              favor: nextState.favor,
              ...resolveFavorPresentation(nextState.favor),
            },
            concubines: enforceRosterFavorCaps(current.concubines, nextState.favor),
          };
        }),
      patchHiddenStats: (patch) =>
        set((current) => {
          const merged = { ...current.hiddenStats, ...patch };
          const shouldSyncFavor = typeof patch.favor === 'number';
          const nextFavor = normalizePlayerFavor(
            typeof merged.favor === 'number' ? merged.favor : current.hiddenStats.favor,
          );
          return {
            ...(shouldSyncFavor
              ? {
                  state: {
                    ...current.state,
                    favor: nextFavor,
                  },
                }
              : {}),
            hiddenStats: {
              ...merged,
              favor: nextFavor,
              ...resolveFavorPresentation(nextFavor),
            },
            concubines: enforceRosterFavorCaps(current.concubines, nextFavor),
          };
        }),
      setBriefing: (briefing) => set({ briefing }),
      setDialogue: (dialogue) => set({ dialogue }),
      setMapEventText: (text) => set({ mapEventText: text }),
      requestOvernightReturn: (payload) =>
        set({
          pendingOvernightReturn: {
            ...payload,
            id: `overnight-${payload.origin}-${payload.reason}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        }),
      clearOvernightReturn: () => set({ pendingOvernightReturn: undefined }),
      completeOvernightTransition: (reason) => {
        const current = get();
        const stepsToMorning = Math.max(1, timeSlots.length - current.time.slotIndex);
        const shouldApplyLateNightPenalty = reason === 'deep-night' || current.time.slot === '深夜';

        get().advanceTime(stepsToMorning, { lateNightPenalty: shouldApplyLateNightPenalty });
        set((latest) => ({
          ...latest,
          currentView: 'bedchamber',
          scene: 'activity',
          activeChamberPanel: 'main',
          activeMapLocation: undefined,
          activeMapLocationEntryTime: undefined,
          activeAffairsSource: DEFAULT_AFFAIRS_SOURCE,
          mapEventText: '',
          pendingOvernightReturn: undefined,
        }));
      },
      setSave: (save) => set({ save }),
      setAttributeValue: (key, value) =>
        set((current) => {
          if (current.state.flags.routeLockedStats) {
            return current;
          }
          const field = attributeFields.find((item) => item.key === key);
          if (!field) {
            return current;
          }
          const routeId = current.state.routeId;
          const max =
            key === 'politics'
              ? routeId === 'lanyinxuguo' || routeId === 'chenyuansucuo'
                ? 4
                : 2
              : field.max;
          const min = field.min;
          const currentValue = Number(current.state.stats[key] ?? field.value);
          const nextValue = Math.min(max, Math.max(min, value));
          if (nextValue === currentValue) {
            return current;
          }
          const delta = nextValue - currentValue;
          const currentLeft = current.state.pointsLeft ?? 0;
          const pointsTotal = current.state.pointsTotal ?? 0;
          if (delta > 0 && currentLeft < delta) {
            return current;
          }
          const pointsLeft = Math.min(pointsTotal, Math.max(0, currentLeft - delta));
          return {
            ...current,
            state: {
              ...current.state,
              pointsLeft,
              stats: {
                ...current.state.stats,
                [key]: nextValue,
              },
            },
          };
        }),
      finalizeAttributeAssignment: () =>
        set((current) => ({
          state: finalizeAttributeStats(current.state),
        })),
      validatePoints: () =>
        set((current) => ({
          state: current.state.flags[ATTRIBUTE_STATS_FINALIZED_FLAG] ? current.state : validatePointsState(current.state),
        })),
      ensureBondProfile: (routeId) =>
        set((current) => {
          const targetRouteId = routeId ?? current.state.routeId;
          if (current.bondProfile?.routeId === targetRouteId) {
            return current;
          }
          return {
            bondProfile: buildInitialBondProfile(targetRouteId, getCurrentXunKey(current.time)),
          };
        }),
      ensureConcubines: (routeId) =>
        set((current) => {
          const targetRouteId = routeId ?? current.state.routeId;
          if (current.concubineRouteId === targetRouteId && current.concubines.length > 0) {
            return {
              concubines: enforceRosterFavorCaps(current.concubines, current.state.favor),
            };
          }

          return {
            concubineRouteId: targetRouteId,
            concubines: buildRouteConcubines(targetRouteId, current.customConsorts, current.state.favor),
          };
        }),
      addCustomConsort: (consort) =>
        set((current) => {
          const customConsorts = [...current.customConsorts, consort];
          const nextConcubines = buildRouteConcubines(current.state.routeId, customConsorts, current.state.favor);
          return {
            customConsorts,
            concubines: nextConcubines,
            concubineRouteId: current.state.routeId,
            npcActivity: generateNpcActivities({
              routeId: current.state.routeId,
              xunKey: getCurrentXunKey(current.time),
              concubines: nextConcubines,
              customConsorts,
              relationMatrix: current.npcRelationMatrix,
            }),
          };
        }),
      patchKitchenProgress: (patch) =>
        set((current) => ({
          kitchenProgress: {
            ...current.kitchenProgress,
            ...patch,
          },
        })),
      patchMedicalProgress: (patch) =>
        set((current) => ({
          medicalProgress: {
            ...current.medicalProgress,
            ...patch,
          },
        })),
      patchMusicHallProgress: (patch) =>
        set((current) => ({
          musicHallProgress: {
            ...current.musicHallProgress,
            ...patch,
          },
        })),
      patchPalaceBanquetProgress: (patch) =>
        set((current) => ({
          palaceBanquetProgress: {
            ...current.palaceBanquetProgress,
            ...patch,
          },
        })),
      startCraftWork: (workId) => {
        let result: { success: boolean; message: string; instance?: CraftWorkInstanceState } = {
          success: false,
          message: '这件作品暂时无法开始。',
        };
        set((current) => {
          try {
            const existingCount = Object.keys(current.craftWorksProgress.activeWorks).length;
            const instance = buildCraftWorkInstance({
              workId,
              instanceId: `craft:${workId}:${getCurrentXunKey(current.time)}:${current.time.slotIndex}:${existingCount + 1}`,
              time: current.time,
            });
            result = {
              success: true,
              message: `已添入作品：${instance.name}。`,
              instance,
            };
            return {
              craftWorksProgress: {
                activeWorks: {
                  ...current.craftWorksProgress.activeWorks,
                  [instance.instanceId]: instance,
                },
              },
            };
          } catch (error) {
            result = {
              success: false,
              message: error instanceof Error ? error.message : '这件作品暂时无法开始。',
            };
            return current;
          }
        });
        return result;
      },
      inspireCraftWork: (type) => {
        let result: { success: boolean; message: string; instance?: CraftWorkInstanceState } = {
          success: false,
          message: '眼下没有合适的灵感。',
        };
        set((current) => {
          const activeWorks = Object.values(current.craftWorksProgress.activeWorks).filter((work) => work.type === type);
          const work = pickCraftWorkInspiration({
            type,
            state: current.state,
            seed: `${current.state.routeId}:${getCurrentXunKey(current.time)}:${current.time.slotIndex}:${activeWorks.length}`,
            excludedWorkIds: activeWorks.map((entry) => entry.workId),
          });
          if (!work) {
            return current;
          }

          const existingCount = Object.keys(current.craftWorksProgress.activeWorks).length;
          const instance = buildCraftWorkInstance({
            workId: work.workId,
            instanceId: `craft:${work.workId}:${getCurrentXunKey(current.time)}:${current.time.slotIndex}:${existingCount + 1}`,
            time: current.time,
          });
          result = {
            success: true,
            message: `灵感落定：${instance.name}。`,
            instance,
          };
          return {
            craftWorksProgress: {
              activeWorks: {
                ...current.craftWorksProgress.activeWorks,
                [instance.instanceId]: instance,
              },
            },
          };
        });
        return result;
      },
      advanceCraftWork: (instanceId) => {
        let result: { success: boolean; message: string; resolution?: CraftWorkAdvanceResolution } = {
          success: false,
          message: '这件作品已经不在进行中。',
        };
        set((current) => {
          const instance = current.craftWorksProgress.activeWorks[instanceId];
          if (!instance) {
            return current;
          }
          const resolution = resolveCraftWorkAdvance({
            instance,
            state: current.state,
            time: current.time,
            seed: `${current.state.routeId}:${getCurrentXunKey(current.time)}:${current.time.slotIndex}`,
          });
          const nextActiveWorks = { ...current.craftWorksProgress.activeWorks };
          if (resolution.completed) {
            delete nextActiveWorks[instanceId];
          } else if (resolution.next) {
            nextActiveWorks[instanceId] = resolution.next;
          }

          let nextInventory = current.inventory;
          const completedItem = resolution.completedItem;
          if (completedItem) {
            const existingIndex = current.inventory.findIndex((entry) => entry.itemId === completedItem.itemId);
            nextInventory =
              existingIndex === -1
                ? [...current.inventory, completedItem]
                : current.inventory.map((entry, index) =>
                    index === existingIndex
                      ? {
                          ...entry,
                          quantity: entry.quantity + 1,
                        }
                      : entry,
                  );
          }

          result = {
            success: true,
            message: resolution.completed
              ? `${resolution.previous.name}已经完成，收入背包。`
              : `${resolution.previous.name}进度提升到${resolution.next?.progressPercent ?? resolution.previous.progressPercent}%。`,
            resolution,
          };

          return {
            craftWorksProgress: {
              activeWorks: nextActiveWorks,
            },
            inventory: nextInventory,
            numericFeedbackSignal: resolution.completedItem
              ? {
                  sequence: current.numericFeedbackSignal.sequence + 1,
                  bucket: 'chamber-action',
                }
              : current.numericFeedbackSignal,
          };
        });
        return result;
      },
      patchTempleProgress: (patch) =>
        set((current) => ({
          templeProgress: {
            ...current.templeProgress,
            ...patch,
          },
        })),
      requestEmperorAudience: (location, source) => {
        const current = get();
        const entryTime = current.activeMapLocationEntryTime ?? current.time;
        if (location !== '养心殿' || source !== 'yangxin-request') {
          return {
            success: true,
            chance: 100,
            roll: 1,
            message: '已在外景遇见皇上。',
          };
        }
        const resolution = resolveEmperorAudienceRequest({
          routeId: current.state.routeId,
          time: entryTime,
          playerFavor: current.state.favor,
          playerTrueHeart: current.state.trueHeart,
          emperorMood: current.nightlyService.emperorMood,
        });
        return {
          success: resolution.success,
          chance: resolution.chance,
          roll: resolution.roll,
          message: resolution.line,
        };
      },
      completeEmperorMainInteraction: (actionId, location, source) => {
        let result: EmperorInteractionStoreResult = {
          success: false,
          message: '眼下无法与皇上互动。',
          effects: { favorDelta: 0, prestigeDelta: 0, trueHeartDelta: 0 },
        };
        set((current) => {
          const entryTime = current.activeMapLocationEntryTime ?? current.time;
          const resolution = resolveEmperorMainInteraction({
            routeId: current.state.routeId,
            time: entryTime,
            location,
            source,
            actionId,
            state: current.state,
            emperorMood: current.nightlyService.emperorMood,
          });
          if (!resolution.success) {
            result = {
              success: false,
              message: resolution.line,
              effects: resolution.effects,
            };
            return current;
          }
          const nextState = {
            ...current.state,
            favor: normalizePlayerFavor(current.state.favor + resolution.effects.favorDelta),
            prestige: normalizePrestige(current.state.prestige + resolution.effects.prestigeDelta),
            trueHeart: current.state.trueHeart + resolution.effects.trueHeartDelta,
          };
          const xunKey = getCurrentXunKey(entryTime);
          const encounterId = `${xunKey}:${entryTime.slot}:${location}:${source}`;
          const currentEncounterIds =
            current.emperorInteraction.xunKey === xunKey ? current.emperorInteraction.triggeredEncounterIds : [];
          result = {
            success: true,
            message: resolution.line,
            effects: resolution.effects,
          };
          return {
            state: nextState,
            hiddenStats: {
              ...current.hiddenStats,
              favor: nextState.favor,
              prestige: nextState.prestige,
              trueHeart: nextState.trueHeart,
              ...resolveFavorPresentation(nextState.favor),
            },
            emperorInteraction: {
              xunKey,
              triggeredEncounterIds: currentEncounterIds.includes(encounterId)
                ? currentEncounterIds
                : [...currentEncounterIds, encounterId],
            },
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: 'map-event',
            },
          };
        });
        return result;
      },
      completeEmperorGift: (itemId) => {
        let result: EmperorInteractionStoreResult = {
          success: false,
          message: '背包里没有可奉上的这件礼物。',
          effects: { favorDelta: 0, prestigeDelta: 0, trueHeartDelta: 0 },
        };
        set((current) => {
          const targetItem = current.inventory.find((item) => item.itemId === itemId && item.quantity > 0);
          if (!targetItem || (targetItem.category !== 'food' && targetItem.category !== 'gift')) {
            return current;
          }
          const effects = resolveEmperorGiftEffects(targetItem);
          const nextInventory = current.inventory
            .map((item) =>
              item.itemId === itemId
                ? {
                    ...item,
                    quantity: item.quantity - 1,
                  }
                : item,
            )
            .filter((item) => item.quantity > 0);
          const nextState = {
            ...current.state,
            favor: normalizePlayerFavor(current.state.favor + effects.favorDelta),
            prestige: normalizePrestige(current.state.prestige + effects.prestigeDelta),
            trueHeart: current.state.trueHeart + effects.trueHeartDelta,
          };
          result = {
            success: true,
            message: effects.line,
            effects,
          };
          return {
            inventory: nextInventory,
            state: nextState,
            hiddenStats: {
              ...current.hiddenStats,
              favor: nextState.favor,
              prestige: nextState.prestige,
              trueHeart: nextState.trueHeart,
              ...resolveFavorPresentation(nextState.favor),
            },
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: 'map-event',
            },
          };
        });
        return result;
      },
      completeEmperorReputationComment: (targetConsortId, direction) => {
        let result: EmperorReputationCommentResult = {
          success: false,
          message: '未找到可提及的妃嫔。',
          prestigeDelta: 0,
        };
        set((current) => {
          const target = findConsortById(targetConsortId, current.concubines, current.customConsorts);
          if (!target) {
            return current;
          }
          const prestigeDelta = direction === 'praise' ? 5 : -5;
          const updateTarget = (consort: ConcubineProfile): ConcubineProfile =>
            consort.id === targetConsortId
              ? normalizeConcubineProfile({
                  ...consort,
                  stats: {
                    ...consort.stats,
                    prestige: normalizePrestige(Number(consort.stats.prestige ?? 0) + prestigeDelta),
                  },
                })
              : consort;
          result = {
            success: true,
            targetName: `${target.rankLabel}${target.name}`,
            prestigeDelta,
            message:
              direction === 'praise'
                ? `你在御前替${target.rankLabel}${target.name}留了一句体面话。`
                : `你在御前点到${target.rankLabel}${target.name}近来失当之处。`,
          };
          return {
            concubines: enforceRosterFavorCaps(current.concubines.map(updateTarget), current.state.favor),
            customConsorts: current.customConsorts.map(updateTarget),
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: 'map-event',
            },
          };
        });
        return result;
      },
      resolveZhengyangEmperorWait: () => {
        let result: EmperorReputationCommentResult & { chance: number; roll: number } = {
          success: false,
          message: '此时不宜在正阳门久候。',
          prestigeDelta: 0,
          chance: 0,
          roll: 100,
        };
        set((current) => {
          const entryTime = current.activeMapLocationEntryTime ?? current.time;
          const resolution = resolveZhengyangGateEncounter({
            routeId: current.state.routeId,
            time: entryTime,
            playerFavor: current.state.favor,
            emperorMood: current.nightlyService.emperorMood,
          });
          const nextState = resolution.favorDelta
            ? {
                ...current.state,
                favor: normalizePlayerFavor(current.state.favor + resolution.favorDelta),
              }
            : current.state;
          const xunKey = getCurrentXunKey(entryTime);
          const encounterId = `${xunKey}:${entryTime.slot}:正阳门:court-dismissal`;
          const currentEncounterIds =
            current.emperorInteraction.xunKey === xunKey ? current.emperorInteraction.triggeredEncounterIds : [];
          result = {
            success: resolution.success,
            message: resolution.line,
            prestigeDelta: 0,
            chance: resolution.chance,
            roll: resolution.roll,
          };
          if (!resolution.favorDelta) {
            return current;
          }
          return {
            state: nextState,
            hiddenStats: {
              ...current.hiddenStats,
              favor: nextState.favor,
              ...resolveFavorPresentation(nextState.favor),
            },
            emperorInteraction: {
              xunKey,
              triggeredEncounterIds: currentEncounterIds.includes(encounterId)
                ? currentEncounterIds
                : [...currentEncounterIds, encounterId],
            },
          };
        });
        get().advanceTime(1);
        set({ activeMapLocationEntryTime: undefined });
        return result;
      },
      resolveNpcActivityEntry: (entryId) =>
        set((current) => ({
          npcActivity: {
            ...current.npcActivity,
            entries: {
              ...current.npcActivity.entries,
              ...(current.npcActivity.entries[entryId]
                ? {
                    [entryId]: {
                      ...current.npcActivity.entries[entryId],
                      resolved: true,
                    },
                  }
                : {}),
            },
          },
        })),
      acknowledgeNpcPlayerVisit: (entryId) =>
        set((current) => ({
          npcActivity: {
            ...current.npcActivity,
            triggeredVisitIds: current.npcActivity.triggeredVisitIds.includes(entryId)
              ? current.npcActivity.triggeredVisitIds
              : [...current.npcActivity.triggeredVisitIds, entryId],
            entries: {
              ...current.npcActivity.entries,
              ...(current.npcActivity.entries[entryId]
                ? {
                    [entryId]: {
                      ...current.npcActivity.entries[entryId],
                      resolved: true,
                    },
                  }
                : {}),
            },
          },
        })),
      recordConsortInteractionAction: (consortId, actionId) => {
        let result = {
          success: false,
          actionCountThisXun: 0,
          actionLimitHit: false,
        };

        set((current) => {
          const xunKey = getCurrentXunKey(current.time);
          const activeProgress =
            current.consortInteractionMap[consortId]?.xunKey === xunKey
              ? current.consortInteractionMap[consortId]
              : createEmptyConsortInteractionProgress(consortId, xunKey);
          const currentActionCount = Number(activeProgress.actionCountThisXun ?? 0);

          if (currentActionCount >= CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN) {
            result = {
              success: false,
              actionCountThisXun: currentActionCount,
              actionLimitHit: true,
            };
            return {};
          }

          const nextActionCount = currentActionCount + 1;
          result = {
            success: true,
            actionCountThisXun: nextActionCount,
            actionLimitHit: false,
          };

          return {
            consortInteractionMap: {
              ...current.consortInteractionMap,
              [consortId]: {
                ...activeProgress,
                xunKey,
                actionCountThisXun: nextActionCount,
                lastActionId: actionId,
              },
            },
          };
        });

        return result;
      },
      patchConcubineById: (consortId, updater) =>
        set((current) => {
          const nextConcubines = enforceRosterFavorCaps(
            applyConcubineUpdater(current.concubines, consortId, updater),
            current.state.favor,
          );
          const nextCustomConsorts = applyConcubineUpdater(current.customConsorts, consortId, updater);

          return {
            concubines: nextConcubines,
            customConsorts: nextCustomConsorts,
          };
        }),
      consumeInventoryItem: (itemId) => {
        let consumed = false;
        set((current) => {
          const nextInventory = current.inventory
            .map((item) => {
              if (item.itemId !== itemId || item.quantity <= 0) {
                return item;
              }
              consumed = true;
              return {
                ...item,
                quantity: item.quantity - 1,
              };
            })
            .filter((item) => item.quantity > 0);

          return consumed
            ? {
                inventory: nextInventory,
                numericFeedbackSignal: {
                  sequence: current.numericFeedbackSignal.sequence + 1,
                  bucket: current.currentView === 'map-main' ? 'map-event' : 'chamber-action',
                },
              }
            : current;
        });
        return consumed;
      },
      grantInventoryItem: (item, quantity = 1) =>
        set((current) => {
          const normalizedQuantity = Math.max(1, Math.floor(quantity));
          const existingIndex = current.inventory.findIndex((entry) => entry.itemId === item.itemId);
          const baseItem = {
            ...item,
            id: item.id ?? item.itemId,
            color: item.color ?? item.rarity,
          };
          const nextInventory =
            existingIndex === -1
              ? [
                  ...current.inventory,
                  {
                    ...baseItem,
                    quantity: normalizedQuantity,
                  },
                ]
              : current.inventory.map((entry, index) =>
                  index === existingIndex
                    ? {
                        ...entry,
                        quantity: entry.quantity + normalizedQuantity,
                      }
                    : entry,
                );

          return {
            inventory: nextInventory,
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: current.currentView === 'map-main' ? 'map-event' : 'chamber-action',
            },
          };
        }),
      buyInventoryItem: (item, stockLimit) => {
        let result = {
          success: false,
          message: '杜娘今日不卖这件东西。',
        };

        set((current) => {
          if (item.canSell === false) {
            result = {
              success: false,
              message: `${item.name}眼下不在杜娘的货单里。`,
            };
            return current;
          }

          const xunKey = getCurrentXunKey(current.time);
          const ledgerKey = `${xunKey}:${item.itemId}`;
          const boughtCount = current.merchantLedger[ledgerKey] ?? 0;
          if (typeof stockLimit === 'number' && stockLimit >= 0 && boughtCount >= stockLimit) {
            result = {
              success: false,
              message: `${item.name}这一旬已经卖空了。`,
            };
            return current;
          }

          const itemPrice = Math.max(0, Math.floor(item.price));
          if (current.state.silver < itemPrice) {
            result = {
              success: false,
              message: `银两不足，还差${itemPrice - current.state.silver}两。`,
            };
            return current;
          }

          const existingIndex = current.inventory.findIndex((entry) => entry.itemId === item.itemId);
          const nextInventory =
            existingIndex === -1
              ? [
                  ...current.inventory,
                  {
                    ...item,
                    quantity: 1,
                  },
                ]
              : current.inventory.map((entry, index) =>
                  index === existingIndex
                    ? {
                        ...entry,
                        quantity: entry.quantity + 1,
                      }
                    : entry,
                );
          const nextSilver = current.state.silver - itemPrice;

          result = {
            success: true,
            message: `你花了${itemPrice}两买下${item.name}。`,
          };

          return {
            inventory: nextInventory,
            merchantLedger: {
              ...current.merchantLedger,
              [ledgerKey]: boughtCount + 1,
            },
            state: {
              ...current.state,
              silver: nextSilver,
            },
            hiddenStats: {
              ...current.hiddenStats,
              silver: nextSilver,
            },
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: current.currentView === 'map-main' ? 'map-event' : 'chamber-action',
            },
          };
        });

        return result;
      },
      sellInventoryItem: (itemId) => {
        let result = {
          success: false,
          message: '这件东西眼下卖不出去。',
        };

        set((current) => {
          const inventoryItem = current.inventory.find((item) => item.itemId === itemId);
          if (!inventoryItem || inventoryItem.quantity <= 0) {
            result = {
              success: false,
              message: '背包里已经没有这件东西了。',
            };
            return current;
          }

          if (inventoryItem.canRecycle === false) {
            result = {
              success: false,
              message: `${inventoryItem.name}不在杜娘的回收范围里。`,
            };
            return current;
          }

          const recyclePrice = getInventoryRecyclePrice(inventoryItem);
          const nextInventory = current.inventory
            .map((item) =>
              item.itemId === itemId
                ? {
                    ...item,
                    quantity: item.quantity - 1,
                  }
                : item,
            )
            .filter((item) => item.quantity > 0);
          const nextSilver = current.state.silver + recyclePrice;

          result = {
            success: true,
            message: `杜娘收下了${inventoryItem.name}，给了你${recyclePrice}两。`,
          };

          return {
            inventory: nextInventory,
            state: {
              ...current.state,
              silver: nextSilver,
            },
            hiddenStats: {
              ...current.hiddenStats,
              silver: nextSilver,
            },
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: current.currentView === 'map-main' ? 'map-event' : 'chamber-action',
            },
          };
        });

        return result;
      },
      applyConsortRelationshipJudgement: (consortId, actionId, result) => {
        let summary = {
          appliedFavorDelta: 0,
          appliedAffectionDelta: 0,
          favorCapHit: false,
          affectionCapHit: false,
          actionCountThisXun: 0,
          actionLimitHit: false,
        };

        set((current) => {
          const xunKey = getCurrentXunKey(current.time);
          const activeProgress =
            current.consortInteractionMap[consortId]?.xunKey === xunKey
              ? current.consortInteractionMap[consortId]
              : createEmptyConsortInteractionProgress(consortId, xunKey);
          const currentActionCount = Number(activeProgress.actionCountThisXun ?? 0);

          if (currentActionCount >= CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN) {
            summary = {
              appliedFavorDelta: 0,
              appliedAffectionDelta: 0,
              favorCapHit: false,
              affectionCapHit: false,
              actionCountThisXun: currentActionCount,
              actionLimitHit: true,
            };
            return {};
          }

          const nextActionCount = currentActionCount + 1;
          const requestedFavorDelta = sanitizeRelationshipDelta(result.favorDelta);
          const requestedAffectionDelta = sanitizeRelationshipDelta(result.affectionDelta);
          const nextFavorDeltaThisXun = Math.max(-5, Math.min(5, activeProgress.favorDeltaThisXun + requestedFavorDelta));
          const nextAffectionDeltaThisXun = Math.max(
            -5,
            Math.min(5, activeProgress.affectionDeltaThisXun + requestedAffectionDelta),
          );
          const appliedFavorDelta = nextFavorDeltaThisXun - activeProgress.favorDeltaThisXun;
          const appliedAffectionDelta = nextAffectionDeltaThisXun - activeProgress.affectionDeltaThisXun;
          summary = {
            appliedFavorDelta,
            appliedAffectionDelta,
            favorCapHit: requestedFavorDelta !== 0 && appliedFavorDelta === 0,
            affectionCapHit: requestedAffectionDelta !== 0 && appliedAffectionDelta === 0,
            actionCountThisXun: nextActionCount,
            actionLimitHit: false,
          };

          const applyRelationshipDelta = (consort: ConcubineProfile): ConcubineProfile => ({
            ...consort,
            stats: {
              ...consort.stats,
              relationToPlayer: clampToRange(
                Number(consort.stats.relationToPlayer ?? 0) + appliedFavorDelta,
                [-100, 100],
              ),
              affection: clampToRange(Number(consort.stats.affection ?? 0) + appliedAffectionDelta, [0, 100]),
            },
          });

          return {
            concubines: enforceRosterFavorCaps(
              applyConcubineUpdater(current.concubines, consortId, applyRelationshipDelta),
              current.state.favor,
            ),
            customConsorts: applyConcubineUpdater(current.customConsorts, consortId, applyRelationshipDelta),
            consortInteractionMap: {
              ...current.consortInteractionMap,
              [consortId]: {
                ...activeProgress,
                xunKey,
                actionCountThisXun: nextActionCount,
                favorDeltaThisXun: nextFavorDeltaThisXun,
                affectionDeltaThisXun: nextAffectionDeltaThisXun,
                lastActionId: actionId,
                lastOptionText: result.optionText,
                lastToneTag: result.toneTag,
                lastReason: result.reason,
                lastConfidence: result.confidence,
                lastSource: result.source,
              },
            },
          };
        });

        return summary;
      },
      applyBondJudgement: (result) =>
        set((current) => {
          const xunKey = getCurrentXunKey(current.time);
          const activeProfile =
            current.bondProfile?.routeId === current.state.routeId
              ? current.bondProfile
              : buildInitialBondProfile(current.state.routeId, xunKey);
          const favorDeltaThisXun = activeProfile.xunKey === xunKey ? activeProfile.favorDeltaThisXun : 0;
          const affectionDeltaThisXun = activeProfile.xunKey === xunKey ? activeProfile.affectionDeltaThisXun : 0;
          const requestedFavorDelta = sanitizeRelationshipDelta(result.favorDelta);
          const requestedAffectionDelta = sanitizeRelationshipDelta(result.affectionDelta);
          const nextFavorDeltaThisXun = Math.max(-5, Math.min(5, favorDeltaThisXun + requestedFavorDelta));
          const nextAffectionDeltaThisXun = Math.max(-5, Math.min(5, affectionDeltaThisXun + requestedAffectionDelta));
          const appliedFavorDelta = nextFavorDeltaThisXun - favorDeltaThisXun;
          const appliedAffectionDelta = nextAffectionDeltaThisXun - affectionDeltaThisXun;

          return {
            bondProfile: {
              ...activeProfile,
              xunKey,
              favor: activeProfile.favor + appliedFavorDelta,
              affection: activeProfile.affection + appliedAffectionDelta,
              favorDeltaThisXun: nextFavorDeltaThisXun,
              affectionDeltaThisXun: nextAffectionDeltaThisXun,
              recentContext: [...activeProfile.recentContext, `${result.optionText} -> ${result.toneTag}`].slice(-4),
              lastOptionText: result.optionText,
              lastToneTag: result.toneTag,
              lastReason: result.reason,
              lastConfidence: result.confidence,
              lastSource: result.source,
            },
          };
        }),
      applyStoryEffects: (effects) =>
        set((current) => {
          const nextState: GameNumericsState = {
            ...current.state,
            silver: Math.max(0, current.state.silver + (effects.silver ?? 0)),
            stamina: Math.max(0, Math.min(STAMINA_MAX, current.state.stamina + (effects.stamina ?? 0))),
            favor: normalizePlayerFavor(current.state.favor + (effects.favor ?? 0)),
            prestige: normalizePrestige(current.state.prestige + (effects.prestige ?? 0)),
            stress: Math.max(0, current.state.stress + (effects.stress ?? 0)),
            trueHeart: current.state.trueHeart + (effects.trueHeart ?? 0),
            stats: {
              ...current.state.stats,
            },
            flags: {
              ...current.state.flags,
              ...(effects.flags ?? {}),
            },
          };

          for (const [key, delta] of Object.entries(effects.stats ?? {})) {
            nextState.stats[key] = Math.max(0, Number(nextState.stats[key] ?? 0) + Number(delta ?? 0));
          }

          return {
            state: nextState,
            concubines: enforceRosterFavorCaps(current.concubines, nextState.favor),
            hiddenStats: {
              ...current.hiddenStats,
              silver: nextState.silver,
              prestige: nextState.prestige,
              stress: nextState.stress,
              favor: nextState.favor,
              trueHeart: nextState.trueHeart,
              ...resolveFavorPresentation(nextState.favor),
            },
          };
        }),
      advanceTime: (steps = 1, options) =>
        set((current) => {
          const previousTime = current.time;
          let year = current.time.year;
          let month = current.time.month;
          let xun = current.time.xun;
          let slotIndex = current.time.slotIndex;
          let slotProgress = current.time.slotProgress ?? 0;
          let remaining = Math.max(0, steps);
          let xunTransitions = 0;
          let monthTransitions = 0;
          let enteredNight = false;

          while (remaining > 0) {
            const delta = Math.min(1 - slotProgress, remaining);
            slotProgress = Number((slotProgress + delta).toFixed(4));
            remaining = Number((remaining - delta).toFixed(4));

            if (slotProgress >= 1) {
              slotProgress = 0;
              slotIndex += 1;
              if (slotIndex >= timeSlots.length) {
                slotIndex = 0;
                xun += 1;
                xunTransitions += 1;
                if (xun > 3) {
                  xun = 1;
                  month += 1;
                  monthTransitions += 1;
                  if (month > 12) {
                    month = 1;
                    year += 1;
                  }
                }
              } else if (timeSlots[slotIndex] === '夜晚' && remaining <= 0 && !current.nightlyService.pendingEvent) {
                enteredNight = true;
              }
            }
          }

          const economy = monthTransitions > 0 ? resolveMonthlyEconomy(current.state, current.hiddenStats) : null;
          const monthlyNetSilver = economy ? economy.netSilver * monthTransitions : 0;
          const monthlyExpensePrestigeDelta = economy ? economy.strategy.prestigeDelta * monthTransitions : 0;
          const monthlyFamilyPrestigeDelta =
            monthTransitions > 0 ? resolveMonthlyFamilyPrestigeDelta(current.state.family).total * monthTransitions : 0;
          const familyQuarterSettlements =
            monthTransitions > 0 ? countFamilyQuarterSettlements(current.time, monthTransitions) : 0;
          const quarterlyFamilyAidPrestigeDelta =
            familyQuarterSettlements > 0 ? current.state.familyAidPrestigePending ?? 0 : 0;
          const monthlyExpenseHealthDelta = economy ? economy.strategy.healthDelta * monthTransitions : 0;
          let nextTime = {
            year,
            month,
            xun,
            slotIndex,
            slot: timeSlots[slotIndex],
            slotProgress,
          };
          const palaceBanquetCrossing = didCrossPalaceBanquetEvent(previousTime, nextTime);
          const shouldResolvePalaceBanquet =
            palaceBanquetCrossing.crossed &&
            current.palaceBanquetProgress.lastResolvedSeasonKey !== palaceBanquetCrossing.seasonKey;
          const palaceBanquetEventYear = Number(palaceBanquetCrossing.seasonKey.split('-')[0]);
          const palaceBanquetEventTime = getPalaceBanquetEventTime(palaceBanquetEventYear);
          const palaceBanquetSettlement = shouldResolvePalaceBanquet
            ? resolvePalaceBanquet({
                state: current.state,
                musicHallProgress: current.musicHallProgress,
                palaceBanquetProgress: current.palaceBanquetProgress,
                seasonKey: palaceBanquetCrossing.seasonKey,
                completedAt: palaceBanquetEventTime,
              })
            : null;
          if (
            palaceBanquetSettlement &&
            nextTime.year === palaceBanquetEventTime.year &&
            nextTime.month === palaceBanquetEventTime.month &&
            nextTime.xun === palaceBanquetEventTime.xun &&
            nextTime.slotIndex < palaceBanquetEventTime.slotIndex + 2
          ) {
            const nextSlotIndex = Math.min(timeSlots.length - 1, palaceBanquetEventTime.slotIndex + 2);
            nextTime = {
              ...nextTime,
              slotIndex: nextSlotIndex,
              slot: timeSlots[nextSlotIndex],
              slotProgress: 0,
            };
          }
          const registrationNotice = shouldResolvePalaceBanquet
            ? { shouldShow: false, seasonKey: palaceBanquetCrossing.seasonKey, eventTime: palaceBanquetEventTime }
            : shouldShowPalaceBanquetRegistrationNotice(
                previousTime,
                nextTime,
                current.palaceBanquetProgress.lastRegistrationNoticeSeasonKey,
                current.palaceBanquetProgress.lastResolvedSeasonKey,
              );
          const shouldResolveNightlyService =
            !palaceBanquetSettlement && (enteredNight || (xunTransitions > 0 && !current.nightlyService.pendingMorningLines));
          const nightlyServiceSettlement =
            shouldResolveNightlyService
              ? resolveNightlyService({
                  routeId: current.state.routeId,
                  timeKey: getCurrentXunKey(current.time),
                  player: {
                    name: current.state.name,
                    favor: current.state.favor,
                    trueHeart: current.state.trueHeart,
                    rankLabel:
                      normalizeTrackedPlayerRankLabel(current.hiddenStats.initialRank) ??
                      resolvePlayerRankByPrestige(current.state.prestige),
                    pregnant: Boolean(current.state.flags.pregnant),
                  },
                  concubines: [...current.concubines, ...current.customConsorts],
                  emperorMood: current.nightlyService.emperorMood,
                  playerNightFavorGauge: current.nightlyService.playerNightFavorGauge,
                  deferPlayerService: true,
                  rolls: current.nightlyService.queuedRolls,
                })
              : null;
          const hasPendingPlayerNightlyService = Boolean(nightlyServiceSettlement?.pendingEvent);
          const npcRelationSettlement =
            xunTransitions > 0
              ? resolveNpcRelationMatrixForActivities(current.npcRelationMatrix, Object.values(current.npcActivity.entries))
              : { matrix: current.npcRelationMatrix, deltasByConsortId: {} };
          const palaceStrifeSettlement =
            xunTransitions > 0
              ? settlePalaceStrifeForXunTransitions(
                  current.palaceStrifeCases,
                  xunTransitions,
                  current.state,
                  current.hiddenStats,
                  current.concubines,
                  current.customConsorts,
                  nextTime,
                  current.npcActivity,
                )
              : { cases: current.palaceStrifeCases, lines: [] };
          const nextPalaceStrifeCases = palaceStrifeSettlement.cases;
          const newlyConvictedCases =
            xunTransitions > 0
              ? nextPalaceStrifeCases.filter((caseState) => {
                  const previous = current.palaceStrifeCases.find((entry) => entry.id === caseState.id);
                  return caseState.outcome === 'convicted' && previous?.outcome !== 'convicted';
                })
              : [];
          const playerConvictedCases = newlyConvictedCases.filter(isPlayerConvictedInCase);
          const npcConvictedCases = newlyConvictedCases.filter((caseState) => Boolean(getConvictedConsortId(caseState)));
          const convictionPenalties = playerConvictedCases.map(resolvePalaceStrifeConvictionPenalty);
          const npcConvictionPenaltyLines = describeNpcPalaceStrifeConvictionPenalties(npcConvictedCases);
          const convictionPenaltyTotals = convictionPenalties.reduce(
            (totals, penalty) => ({
              prestigeDelta: totals.prestigeDelta + penalty.prestigeDelta,
              favorDelta: totals.favorDelta + penalty.favorDelta,
              stressDelta: totals.stressDelta + penalty.stressDelta,
            }),
            { prestigeDelta: 0, favorDelta: 0, stressDelta: 0 },
          );
          const shouldApplyLateNightPenalty = Boolean(options?.lateNightPenalty && xunTransitions > 0);
          const postSettlementPrestige = normalizePrestige(
            current.state.prestige +
              monthlyExpensePrestigeDelta +
              monthlyFamilyPrestigeDelta +
              quarterlyFamilyAidPrestigeDelta +
              convictionPenaltyTotals.prestigeDelta +
              (palaceBanquetSettlement?.result.prestigeDelta ?? 0) +
              (nightlyServiceSettlement?.effects.playerPrestigeDelta ?? 0),
          );
          const postSettlementFavor = normalizePlayerFavor(
            current.state.favor +
              convictionPenaltyTotals.favorDelta +
              (nightlyServiceSettlement?.effects.playerFavorDelta ?? 0),
          );
          const postSettlementStress = Math.max(
            0,
            current.state.stress + convictionPenaltyTotals.stressDelta + (shouldApplyLateNightPenalty ? LATE_NIGHT_PENALTY.stress : 0),
          );
          const postSettlementTrueHeart = current.state.trueHeart + (nightlyServiceSettlement?.effects.playerTrueHeartDelta ?? 0);
          const currentRankName =
            normalizeTrackedPlayerRankLabel(current.hiddenStats.initialRank) ?? resolvePlayerRankByPrestige(current.state.prestige);
          const expectedRankName = resolvePlayerRankByPrestige(postSettlementPrestige);
          const nextRankName =
            monthTransitions > 0
              ? resolvePlayerActualRankLabel(current.hiddenStats.initialRank, postSettlementPrestige, monthTransitions * 2)
              : currentRankName;
          const nextResidenceName =
            monthTransitions > 0
              ? resolvePlayerResidenceByRank(current.state.routeId, nextRankName)
              : current.state.residenceName;
          const monthGovernance =
            monthTransitions > 0
              ? {
                  previousRankName: currentRankName,
                  expectedRankName,
                  nextRankName,
                  previousResidenceName: current.state.residenceName,
                  nextResidenceName,
                }
              : null;
          const rankPromotionReport =
            monthGovernance && getRankWeight(monthGovernance.nextRankName) < getRankWeight(monthGovernance.previousRankName)
              ? buildRankPromotionReport({
                  nextTime,
                  previousRankName: monthGovernance.previousRankName,
                  nextRankName: monthGovernance.nextRankName,
                  previousResidenceName: monthGovernance.previousResidenceName,
                  nextResidenceName: monthGovernance.nextResidenceName,
                  reportIndex: current.settlementReports.length + 1,
                })
              : null;
          const reportIndexOffset = rankPromotionReport ? 1 : 0;
          const shouldUpdatePlayerStats = monthTransitions > 0 || shouldApplyLateNightPenalty;
          const nextState = xunTransitions > 0 || nightlyServiceSettlement || palaceBanquetSettlement
            ? {
                ...current.state,
                stamina: xunTransitions > 0 ? resolveXunStartingStamina() : current.state.stamina,
                silver: xunTransitions > 0 ? Math.max(0, current.state.silver + monthlyNetSilver) : current.state.silver,
                prestige: postSettlementPrestige,
                favor: postSettlementFavor,
                stress: postSettlementStress,
                trueHeart: postSettlementTrueHeart,
                stats: shouldUpdatePlayerStats
                  ? {
                      ...current.state.stats,
                      health: Math.max(
                        0,
                        Number(current.state.stats.health ?? 0) +
                          monthlyExpenseHealthDelta +
                          (shouldApplyLateNightPenalty ? LATE_NIGHT_PENALTY.health : 0),
                      ),
                      temperament: Math.max(
                        0,
                        Number(current.state.stats.temperament ?? 0) +
                          (shouldApplyLateNightPenalty ? LATE_NIGHT_PENALTY.temperament : 0),
                      ),
                    }
                  : current.state.stats,
                residenceName: xunTransitions > 0 ? nextResidenceName : current.state.residenceName,
                monthlyExpenseStrategy:
                  monthTransitions > 0
                    ? current.state.nextMonthlyExpenseStrategy ?? current.state.monthlyExpenseStrategy ?? DEFAULT_MONTHLY_EXPENSE_STRATEGY
                    : current.state.monthlyExpenseStrategy,
                nextMonthlyExpenseStrategy: monthTransitions > 0 ? undefined : current.state.nextMonthlyExpenseStrategy,
                familyAidBonus: familyQuarterSettlements > 0 ? 0 : current.state.familyAidBonus ?? 0,
                familyAidPrestigePending:
                  familyQuarterSettlements > 0 ? 0 : current.state.familyAidPrestigePending ?? 0,
              }
            : current.state;
          const baseNextConcubines =
            xunTransitions > 0
              ? applyNpcActivityStressDeltas(
                  current.concubines.map((consort) => applyConcubinePressureHealthPenalty(consort, xunTransitions)),
                  npcRelationSettlement.deltasByConsortId,
                )
              : current.concubines;
          const baseNextCustomConsorts =
            xunTransitions > 0
              ? applyNpcActivityStressDeltas(
                  current.customConsorts.map((consort) => applyConcubinePressureHealthPenalty(consort, xunTransitions)),
                  npcRelationSettlement.deltasByConsortId,
                )
              : current.customConsorts;
          const nextConcubines = applyNightlyServiceConsortEffect(
            applyNpcPalaceStrifeConvictionPenalties(baseNextConcubines, npcConvictedCases),
            nightlyServiceSettlement?.targetConsortId,
            nightlyServiceSettlement?.targetConsortFavorDelta ?? 0,
          );
          const nextCustomConsorts = applyNightlyServiceConsortEffect(
            applyNpcPalaceStrifeConvictionPenalties(baseNextCustomConsorts, npcConvictedCases),
            nightlyServiceSettlement?.targetConsortId,
            nightlyServiceSettlement?.targetConsortFavorDelta ?? 0,
          );
          const nextPendingYangxinVerdict =
            current.pendingYangxinVerdict ??
            (xunTransitions > 0
              ? buildPendingYangxinVerdictEventForCase(
                  findPendingYangxinVerdictCase(nextPalaceStrifeCases),
                  nextState,
                  current.hiddenStats,
                  nextConcubines,
                  nextCustomConsorts,
                )
              : undefined);
          const shouldForceYangxinVerdict = Boolean(nextPendingYangxinVerdict && !current.pendingYangxinVerdict);
          const nextNpcActivity =
            xunTransitions > 0
              ? generateNpcActivities({
                  routeId: nextState.routeId,
                  xunKey: getCurrentXunKey(nextTime),
                  concubines: nextConcubines,
                  customConsorts: nextCustomConsorts,
                  relationMatrix: npcRelationSettlement.matrix,
                })
              : current.npcActivity;
          const nightlyServiceLines =
            xunTransitions > 0
              ? current.nightlyService.pendingMorningLines ?? []
              : hasPendingPlayerNightlyService
                ? []
                : nightlyServiceSettlement?.morningLines ?? [];
          const lateNightPenaltyLines = shouldApplyLateNightPenalty
            ? ['娇娇低声禀道：昨夜歇得太晚，晨起气色难免受损。压力+2，健康-10，气质-10。']
            : [];
          const palaceStrifeLines =
            xunTransitions > 0
              ? [
                  ...palaceStrifeSettlement.lines,
                  ...convictionPenalties.map((penalty) => penalty.summary),
                  ...npcConvictionPenaltyLines,
                ]
              : [];
          const settlementReport = hasPendingPlayerNightlyService
            ? null
            : buildSettlementReport({
                currentState: current.state,
                nextState,
                nextTime,
                xunTransitions,
                monthTransitions,
                economy,
                monthGovernance,
                nightlyServiceLines,
                lateNightPenaltyLines,
                palaceStrifeLines,
                reportIndex: current.settlementReports.length + reportIndexOffset + 1,
              });
          const registrationReport = registrationNotice.shouldShow
            ? buildPalaceBanquetRegistrationReport({
                seasonKey: registrationNotice.seasonKey,
                eventTime: registrationNotice.eventTime,
                reportIndex: current.settlementReports.length + reportIndexOffset + 2,
              })
            : null;
          const palaceBanquetReport = palaceBanquetSettlement
            ? buildPalaceBanquetResultReport({
                seasonKey: palaceBanquetCrossing.seasonKey,
                completedAt: palaceBanquetEventTime,
                lines: palaceBanquetSettlement.lines,
                reportIndex: current.settlementReports.length + reportIndexOffset + 3,
              })
            : null;
          let settlementReports = current.settlementReports;
          let latestSettlementReportId = current.latestSettlementReportId;
          [rankPromotionReport, settlementReport, registrationReport, palaceBanquetReport].forEach((report) => {
            if (!report || isDuplicateSettlementReport(settlementReports.at(-1), report)) {
              return;
            }
            settlementReports = [...settlementReports, report].slice(-MAX_SETTLEMENT_REPORTS);
            latestSettlementReportId = report.id;
          });

          return {
            state: nextState,
            hiddenStats:
              xunTransitions > 0 || nightlyServiceSettlement || palaceBanquetSettlement
                ? {
                    ...current.hiddenStats,
                    silver: nextState.silver,
                    prestige: nextState.prestige,
                    favor: nextState.favor,
                    stress: nextState.stress,
                    trueHeart: nextState.trueHeart,
                    ...resolveFavorPresentation(nextState.favor),
                    ...(monthTransitions > 0 ? { initialRank: nextRankName } : {}),
                  }
                : current.hiddenStats,
            concubines: enforceRosterFavorCaps(nextConcubines, nextState.favor),
            customConsorts: nextCustomConsorts,
            npcRelationMatrix: npcRelationSettlement.matrix,
            npcActivity: nextNpcActivity,
            pendingYangxinVerdict: nextPendingYangxinVerdict,
            palaceBanquetProgress: {
              ...current.palaceBanquetProgress,
              currentSeasonKey: resolvePalaceBanquetSeasonKeyForTime(nextTime),
              ...(registrationNotice.shouldShow ? { lastRegistrationNoticeSeasonKey: registrationNotice.seasonKey } : {}),
              ...(palaceBanquetSettlement
                ? {
                    lastResolvedSeasonKey: palaceBanquetCrossing.seasonKey,
                    lastResult: palaceBanquetSettlement.result,
                  }
                : {}),
            },
            nightlyService:
              nightlyServiceSettlement
                ? {
                    ...current.nightlyService,
                    playerNightFavorGauge: nightlyServiceSettlement.nextPlayerNightFavorGauge,
                    emperorMood: nightlyServiceSettlement.nextEmperorMood,
                    pendingEvent: nightlyServiceSettlement.pendingEvent,
                    pendingNotice: nightlyServiceSettlement.notice,
                    pendingMorningLines: nightlyServiceSettlement.morningLines,
                    reports: nightlyServiceSettlement.pendingEvent
                      ? current.nightlyService.reports
                      : [...current.nightlyService.reports, nightlyServiceSettlement.report].slice(-MAX_SETTLEMENT_REPORTS),
                    latestReportId: nightlyServiceSettlement.pendingEvent
                      ? current.nightlyService.latestReportId
                      : nightlyServiceSettlement.report.id,
                    queuedRolls: undefined,
                  }
                : xunTransitions > 0
                  ? {
                      ...current.nightlyService,
                      pendingMorningLines: undefined,
                    }
                  : current.nightlyService,
            palaceStrifeCases: nextPalaceStrifeCases,
            time: nextTime,
            settlementReports,
            latestSettlementReportId,
            ...(shouldForceYangxinVerdict
              ? {
                  currentView: 'bedchamber' as const,
                  scene: 'activity' as const,
                  activeChamberPanel: 'main' as const,
                  activeMapLocation: undefined,
                  dialogue: undefined,
                  mapEventText: '',
                }
              : {}),
          };
        }),
      acknowledgeSettlementReport: (reportId) =>
        set((current) => ({
          lastSeenSettlementReportId: reportId ?? current.latestSettlementReportId,
        })),
      acknowledgeNightlyServiceNotice: () =>
        set((current) => ({
          nightlyService: {
            ...current.nightlyService,
            pendingNotice: undefined,
          },
        })),
      finalizePendingNightlyService: (choices) =>
        set((current) => {
          const pendingEvent = current.nightlyService.pendingEvent;
          if (!pendingEvent) {
            return current;
          }
          const actionChoices = choices.map((choice) => (typeof choice === 'string' ? { actionId: choice } : choice));

          const result = resolvePlayerNightlyServiceEvent({
            routeId: current.state.routeId,
            pendingEvent,
            player: {
              name: current.state.name,
              favor: current.state.favor,
              trueHeart: current.state.trueHeart,
              rankLabel:
                normalizeTrackedPlayerRankLabel(current.hiddenStats.initialRank) ??
                resolvePlayerRankByPrestige(current.state.prestige),
              stats: current.state.stats,
            },
            emperorMood: current.nightlyService.emperorMood,
            actionIds: actionChoices.map((choice) => choice.actionId),
            actionChoices,
            concubines: [...current.concubines, ...current.customConsorts],
          });
          const nextState = {
            ...current.state,
            stamina: resolveXunStartingStamina(),
            prestige: normalizePrestige(current.state.prestige + result.effects.playerPrestigeDelta),
            favor: normalizePlayerFavor(current.state.favor + result.effects.playerFavorDelta),
            trueHeart: current.state.trueHeart + result.effects.playerTrueHeartDelta,
            flags: {
              ...current.state.flags,
              ...(result.pregnancy?.succeeded ? { pregnant: true } : {}),
            },
          };
          const nextConcubines = applyNightlyServiceConsortEffect(
            current.concubines,
            result.thirdPartyEffect?.targetConsortId,
            result.thirdPartyEffect?.favorDelta ?? 0,
          );
          const nextCustomConsorts = applyNightlyServiceConsortEffect(
              current.customConsorts,
              result.thirdPartyEffect?.targetConsortId,
              result.thirdPartyEffect?.favorDelta ?? 0,
            );
          const nextTime = getNextXunMorning(current.time);
          const settlementReport = buildSettlementReport({
            currentState: current.state,
            nextState,
            nextTime,
            xunTransitions: 1,
            monthTransitions: 0,
            economy: null,
            monthGovernance: null,
            nightlyServiceLines: result.lines,
            lateNightPenaltyLines: [],
            palaceStrifeLines: [],
            reportIndex: current.settlementReports.length + 1,
          });
          const shouldAppendSettlementReport = !isDuplicateSettlementReport(current.settlementReports.at(-1), settlementReport);
          const settlementReports = settlementReport && shouldAppendSettlementReport
            ? [...current.settlementReports, settlementReport].slice(-MAX_SETTLEMENT_REPORTS)
            : current.settlementReports;

          return {
            state: nextState,
            hiddenStats: {
              ...current.hiddenStats,
              prestige: nextState.prestige,
              favor: nextState.favor,
              trueHeart: nextState.trueHeart,
              ...resolveFavorPresentation(nextState.favor),
            },
            nightlyService: {
              ...current.nightlyService,
              playerNightFavorGauge: result.nextPlayerNightFavorGauge,
              emperorMood: result.nextEmperorMood,
              reports: [...current.nightlyService.reports, result.report].slice(-MAX_SETTLEMENT_REPORTS),
              latestReportId: result.report.id,
              pendingEvent: undefined,
              pendingNotice: undefined,
              pendingMorningLines: undefined,
            },
            concubines: nextConcubines,
            customConsorts: nextCustomConsorts,
            time: nextTime,
            currentView: 'bedchamber',
            scene: 'activity',
            activeChamberPanel: 'main',
            activeMapLocation: undefined,
            activeMapLocationEntryTime: undefined,
            activeAffairsSource: DEFAULT_AFFAIRS_SOURCE,
            mapEventText: '',
            settlementReports,
            latestSettlementReportId:
              settlementReport && shouldAppendSettlementReport ? settlementReport.id : current.latestSettlementReportId,
          };
        }),
      spendFamilyAid: () => {
        const current = get();
        if ((current.state.familyAidBonus ?? 0) > 0) {
          return { success: false, message: '本季度已送出家族接济。' };
        }
        if (current.state.silver < FAMILY_AID_COST) {
          return { success: false, message: '银两不足，无法家族接济。' };
        }

        const nextSilver = current.state.silver - FAMILY_AID_COST;
        set({
          state: {
            ...current.state,
            silver: nextSilver,
            familyAidBonus: FAMILY_AID_BONUS,
            familyAidPrestigePending: FAMILY_AID_QUARTERLY_PRESTIGE,
          },
          hiddenStats: {
            ...current.hiddenStats,
            silver: nextSilver,
          },
        });

        return { success: true, message: '已送出家族接济。' };
      },
      startPalaceStrifeCase: (input) => {
        const current = get();
        const target = findConsortById(input.targetConsortId, current.concubines, current.customConsorts);
        if (!target) {
          throw new Error(`Palace strife target not found: ${input.targetConsortId}`);
        }
        const framedTarget =
          input.framedTargetName ??
          (() => {
            const consort = findConsortById(input.framedTargetConsortId, current.concubines, current.customConsorts);
            return consort ? `${consort.rankLabel} ${consort.name}` : undefined;
          })();
        const fortuneCost = getPalaceStrifeFortuneCost(input.actionKind);
        const xunKey = getCurrentXunKey(current.time);
        const targetName = `${target.rankLabel} ${target.name}`;
        const caseState: PalaceStrifeCaseState = {
          id: `palace-strife-${xunKey}-${target.id}-${input.actionKind}-${current.palaceStrifeCases.length + 1}`,
          xunKey,
          year: current.time.year,
          month: current.time.month,
          xun: current.time.xun,
          actorId: 'player',
          targetConsortId: target.id,
          targetName,
          actionKind: input.actionKind,
          methodLabel: input.methodLabel,
          itemLabel: input.itemLabel,
          allyLabel: input.allyLabel,
          framedTargetConsortId: input.framedTargetConsortId,
          framedTargetName: framedTarget,
          queuedRolls: input.rolls,
          severity: resolvePalaceStrifeSeverity(input.actionKind, input.itemLabel),
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
          summary: `${input.methodLabel}已布置，待当旬夜晚结算。`,
        };
        set((latest) => {
          const nextFortune = Number(latest.state.stats.fortune ?? 0) - fortuneCost;
          return {
            state: {
              ...latest.state,
              stats: {
                ...latest.state.stats,
                fortune: nextFortune,
              },
            },
            palaceStrifeCases: [...latest.palaceStrifeCases, caseState],
            numericFeedbackSignal: {
              sequence: latest.numericFeedbackSignal.sequence + 1,
              bucket: latest.currentView === 'map-main' ? 'map-event' : 'chamber-action',
            },
          };
        });
        const result: PalaceStrifeResolution = {
          caseState,
          shouldPersistCase: true,
          resultText: `${input.methodLabel}已布置，福德-${fortuneCost}。当旬夜晚结算，下一旬由娇娇回禀。`,
        };
        return result;
      },
      bribePalaceStrifeCase: (caseId, silverSpent) => {
        const cost = Math.max(0, Math.floor(silverSpent));
        if (cost < 20) {
          return { success: false, message: '打点至少需要20两。' };
        }

        let result = { success: false, message: '未找到可打点的调查案。' };
        set((current) => {
          const targetCase = current.palaceStrifeCases.find((caseState) => caseState.id === caseId);
          if (!targetCase || targetCase.status !== 'investigating') {
            return current;
          }
          if (current.state.silver < cost) {
            result = { success: false, message: '银两不足，无法打点。' };
            return current;
          }

          const nextCase = applyPalaceStrifeBribe(targetCase, cost);
          const nextSilver = Math.max(0, current.state.silver - cost);
          result = {
            success: true,
            message: `${targetCase.targetName}一案已花费${cost}两打点，最高定案率降至${nextCase.convictionRate}%。`,
          };

          return {
            state: {
              ...current.state,
              silver: nextSilver,
            },
            hiddenStats: {
              ...current.hiddenStats,
              silver: nextSilver,
            },
            palaceStrifeCases: current.palaceStrifeCases.map((caseState) =>
              caseState.id === caseId ? nextCase : caseState,
            ),
          };
        });
        return result;
      },
      adjustPalaceStrifeSuspect: (caseId, suspectId, direction) => {
        const cost = 20;
        let result = { success: false, message: '未找到可干预的嫌疑人。' };
        set((current) => {
          const targetCase = current.palaceStrifeCases.find((caseState) => caseState.id === caseId);
          const targetSuspect = targetCase?.suspects?.find((suspect) => suspect.id === suspectId);
          if (!targetCase || targetCase.status !== 'investigating' || !targetSuspect) {
            return current;
          }
          if (current.state.silver < cost) {
            result = { success: false, message: '银两不足，无法打点。' };
            return current;
          }

          const delta = direction === 'increase' ? 5 : -5;
          const nextCase = applyPalaceStrifeSuspectIntervention(targetCase, suspectId, delta);
          const nextSuspect = nextCase.suspects?.find((suspect) => suspect.id === suspectId) ?? targetSuspect;
          const reachedVerdict = nextCase.status === 'pending_verdict';
          const nextSilver = current.state.silver - cost;
          result = {
            success: true,
            message:
              direction === 'increase'
                ? `已花费20两推高${nextSuspect.name}嫌疑，当前定案率${nextSuspect.suspicionRate}%。${reachedVerdict ? '此案已达裁断门槛，待养心殿传唤。' : ''}`
                : `已花费20两压低${nextSuspect.name}嫌疑，当前定案率${nextSuspect.suspicionRate}%。`,
          };

          return {
            state: {
              ...current.state,
              silver: nextSilver,
            },
            hiddenStats: {
              ...current.hiddenStats,
              silver: nextSilver,
            },
            palaceStrifeCases: current.palaceStrifeCases.map((caseState) =>
              caseState.id === caseId ? nextCase : caseState,
            ),
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: current.currentView === 'map-main' ? 'map-event' : 'chamber-action',
            },
          };
        });
        return result;
      },
      beginPendingYangxinVerdict: (caseId) => {
        let result = { success: false, message: '未找到待裁断案件。' };
        set((current) => {
          const targetCase = current.palaceStrifeCases.find((caseState) => caseState.id === caseId);
          const event = buildPendingYangxinVerdictEventForCase(
            targetCase,
            current.state,
            current.hiddenStats,
            current.concubines,
            current.customConsorts,
          );
          if (!targetCase || !event) {
            return current;
          }

          result = { success: true, message: '已传唤至养心殿听裁。' };
          return {
            currentView: 'bedchamber',
            scene: 'activity',
            activeChamberPanel: 'main',
            activeMapLocation: undefined,
            dialogue: undefined,
            mapEventText: '',
            pendingYangxinVerdict: event,
          };
        });
        return result;
      },
      advanceYangxinVerdict: (choiceId) => {
        let result = { success: false, message: '当前没有养心殿裁断事件。' };
        set((current) => {
          const event = current.pendingYangxinVerdict;
          if (!event) {
            return current;
          }

          if (event.stage === 'summon') {
            result = { success: true, message: '已进入养心殿。' };
            return {
              currentView: 'bedchamber',
              scene: 'activity',
              activeChamberPanel: 'main',
              activeMapLocation: '养心殿',
              dialogue: undefined,
              mapEventText: '',
              pendingYangxinVerdict: {
                ...event,
                stage: 'statements',
              },
            };
          }

          if (event.stage === 'statements') {
            result = { success: true, message: '已听完相关人发言。' };
            return {
              pendingYangxinVerdict: {
                ...event,
                stage: 'player-choice',
              },
            };
          }

          if (event.stage === 'player-choice') {
            if (!choiceId) {
              return current;
            }
            const targetCase = current.palaceStrifeCases.find((caseState) => caseState.id === event.sourceId);
            if (!targetCase) {
              return current;
            }
            const verdictResult = resolveYangxinVerdictResult(event, targetCase, choiceId);
            result = { success: true, message: verdictResult.summary };
            return {
              pendingYangxinVerdict: {
                ...event,
                stage: 'verdict',
                selectedChoiceId: choiceId,
                result: verdictResult,
              },
            };
          }

          if (event.stage === 'verdict') {
            result = { success: false, message: '裁断结果已出，请完成裁断。' };
            return current;
          }

          result = { success: true, message: '裁断事件已结束。' };
          return current;
        });
        return result;
      },
      finalizeYangxinVerdict: (eventId) => {
        let result = { success: false, message: '当前没有可完成的养心殿裁断。' };
        set((current) => {
          const event = current.pendingYangxinVerdict;
          if (!event || event.id !== eventId || event.sourceType !== 'palace-strife') {
            return current;
          }

          const targetCase = current.palaceStrifeCases.find((caseState) => caseState.id === event.sourceId);
          if (!targetCase || targetCase.status !== 'pending_verdict' || targetCase.penaltyApplied) {
            return {
              pendingYangxinVerdict: undefined,
            };
          }

          const resolvedResult =
            event.result ?? resolveYangxinVerdictResult(event, targetCase, event.selectedChoiceId ?? 'state-facts');
          const resolvedEvent: YangxinVerdictEventState = {
            ...event,
            stage: 'done',
            selectedChoiceId: resolvedResult.choiceId,
            result: resolvedResult,
          };
          const finalizedCase = finalizeYangxinVerdictCase(targetCase, resolvedEvent);
          const convictedSuspect = (targetCase.suspects ?? []).find(
            (suspect) => suspect.id === finalizedCase.convictedSuspectId,
          );
          const penalty = resolvedResult.penalty;
          const shouldPenalizePlayer = convictedSuspect?.subjectType === 'player';
          const convictedConsortId = convictedSuspect?.subjectType === 'consort' ? convictedSuspect.subjectId : undefined;
          const nextState = shouldPenalizePlayer
            ? {
                ...current.state,
                prestige: normalizePrestige(current.state.prestige + penalty.prestigeDelta),
                favor: normalizePlayerFavor(current.state.favor + penalty.favorDelta),
                stress: Math.max(0, current.state.stress + penalty.stressDelta),
              }
            : current.state;
          const applyVerdictConsortEffects = (consort: ConcubineProfile): ConcubineProfile => {
            const relationDelta = resolvedResult.relationshipDeltas
              .filter((delta) => delta.consortId === consort.id)
              .reduce((total, delta) => total + delta.relationToPlayerDelta, 0);
            const isConvictedConsort = convictedConsortId === consort.id;
            if (!relationDelta && !isConvictedConsort) {
              return consort;
            }
            return normalizeConcubineProfile({
              ...consort,
              stats: {
                ...consort.stats,
                prestige: isConvictedConsort
                  ? normalizePrestige(Number(consort.stats.prestige ?? 0) + penalty.prestigeDelta)
                  : Number(consort.stats.prestige ?? 0),
                favor: isConvictedConsort
                  ? Number(consort.stats.favor ?? 0) + penalty.favorDelta
                  : Number(consort.stats.favor ?? 0),
                stress: isConvictedConsort
                  ? Math.max(0, Number(consort.stats.stress ?? 0) + penalty.stressDelta)
                  : Number(consort.stats.stress ?? 0),
                relationToPlayer: clampToRange(
                  Number(consort.stats.relationToPlayer ?? 0) + relationDelta,
                  [-100, 100],
                ),
              },
            });
          };
          const nextConcubines = current.concubines.map(applyVerdictConsortEffects);
          const nextCustomConsorts = current.customConsorts.map(applyVerdictConsortEffects);

          result = { success: true, message: resolvedResult.summary };
          return {
            state: nextState,
            hiddenStats: shouldPenalizePlayer
              ? {
                  ...current.hiddenStats,
                  prestige: nextState.prestige,
                  favor: nextState.favor,
                  stress: nextState.stress,
                  ...resolveFavorPresentation(nextState.favor),
                }
              : current.hiddenStats,
            concubines: enforceRosterFavorCaps(nextConcubines, nextState.favor),
            customConsorts: nextCustomConsorts,
            palaceStrifeCases: current.palaceStrifeCases.map((caseState) =>
              caseState.id === finalizedCase.id ? finalizedCase : caseState,
            ),
            pendingYangxinVerdict: undefined,
            currentView: 'bedchamber',
            scene: 'activity',
            activeChamberPanel: 'main',
            activeMapLocation: '养心殿',
            dialogue: undefined,
            mapEventText: '',
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: 'settlement',
            },
          };
        });
        return result;
      },
      exportSaveGameV1: (savedAt) => buildSaveGameV1(get(), savedAt),
      loadSaveGameV1: (saveGame) => set(restoreSaveGameV1Fields(saveGame)),
      startNewGame: () => {
        clearSaveGameV1Storage();
        set(createInitialGameFlowFields('route-selection'));
      },
      resumeLastSave: () => {
        const saveGame = readSaveGameV1FromStorage();
        if (!saveGame) {
          return { success: false, message: '暂无可回溯的存档。' };
        }
        const currentView = resolveResumeViewFromSave(saveGame);
        set({
          ...restoreSaveGameV1Fields(saveGame),
          currentView,
          scene: resolveSceneForView(currentView),
          activeChamberPanel: 'main',
          activeMapLocation: undefined,
          activeAffairsSource: DEFAULT_AFFAIRS_SOURCE,
          dialogue: undefined,
          mapEventText: '',
          briefing: '',
        });
        return { success: true, message: '已读取上一次存档。' };
      },
      debugAddSilver: (amount) => {
        const requestedAmount = parseDebugPositiveIntAmount(amount);
        if (requestedAmount <= 0) {
          const currentSilver = get().state.silver;
          return {
            success: false,
            message: 'debug 加银两需要传入大于 0 的整数。',
            requestedAmount,
            appliedAmount: 0,
            silver: currentSilver,
          };
        }

        let result: DebugSilverResult = {
          success: false,
          message: 'debug 加银两失败。',
          requestedAmount,
          appliedAmount: 0,
          silver: get().state.silver,
        };

        set((current) => {
          const nextSilver = clampToRange(current.state.silver + requestedAmount, PLAYER_SILVER_RANGE);
          const appliedAmount = nextSilver - current.state.silver;
          result = {
            success: appliedAmount > 0,
            message:
              appliedAmount > 0
                ? `debug 已增加 ${appliedAmount} 银两，当前银两 ${nextSilver}。`
                : `当前银两已达到上限 ${PLAYER_SILVER_RANGE[1]}。`,
            requestedAmount,
            appliedAmount,
            silver: nextSilver,
          };

          if (appliedAmount <= 0) {
            return current;
          }

          return {
            state: {
              ...current.state,
              silver: nextSilver,
            },
            hiddenStats: {
              ...current.hiddenStats,
              silver: nextSilver,
            },
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: current.currentView === 'map-main' ? 'map-event' : 'chamber-action',
            },
          };
        });

        return result;
      },
      debugAddPrestige: (amount) => {
        const requestedAmount = parseDebugPositiveIntAmount(amount);
        if (requestedAmount <= 0) {
          const currentPrestige = get().state.prestige;
          return {
            success: false,
            message: 'debug 加声望需要传入大于 0 的整数。',
            requestedAmount,
            appliedAmount: 0,
            prestige: currentPrestige,
          };
        }

        let result: DebugPrestigeResult = {
          success: false,
          message: 'debug 加声望失败。',
          requestedAmount,
          appliedAmount: 0,
          prestige: get().state.prestige,
        };

        set((current) => {
          const nextPrestige = clampToRange(current.state.prestige + requestedAmount, PRESTIGE_RANGE);
          const appliedAmount = nextPrestige - current.state.prestige;
          result = {
            success: appliedAmount > 0,
            message:
              appliedAmount > 0
                ? `debug 已增加 ${appliedAmount} 声望，当前声望 ${nextPrestige}。`
                : `当前声望已达到上限 ${PRESTIGE_RANGE[1]}。`,
            requestedAmount,
            appliedAmount,
            prestige: nextPrestige,
          };

          if (appliedAmount <= 0) {
            return current;
          }

          return {
            state: {
              ...current.state,
              prestige: nextPrestige,
            },
            hiddenStats: {
              ...current.hiddenStats,
              prestige: nextPrestige,
            },
            numericFeedbackSignal: {
              sequence: current.numericFeedbackSignal.sequence + 1,
              bucket: current.currentView === 'map-main' ? 'map-event' : 'chamber-action',
            },
          };
        });

        return result;
      },
      markNumericFeedbackEvent: (bucket) =>
        set((current) => ({
          numericFeedbackSignal: {
            sequence: current.numericFeedbackSignal.sequence + 1,
            bucket,
          },
        })),
    }),
    {
      name: SAVE_GAME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        ({
          saveGame: buildSaveGameV1(state),
        }) as unknown as Partial<GameFlowStore>,
      merge: (persisted, current) => {
        const saveGame = (persisted as { saveGame?: SaveGameV1 } | undefined)?.saveGame;
        if (isSaveGameV1(saveGame)) {
          return {
            ...current,
            ...restoreSaveGameV1Fields(saveGame),
          };
        }

        clearSaveGameV1Storage();
        return current;
      },
    },
  ),
);
