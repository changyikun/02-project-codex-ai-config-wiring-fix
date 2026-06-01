import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { PLAYER_FAVOR_RANGE, STAMINA_INITIAL_PER_XUN, STAMINA_MAX, getFavorTierByValue } from '../../config/constants';
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
  describePalaceStrifeInvestigationChanges,
  generateNpcPalaceStrifeCase,
  resolvePalaceStrifeAttempt,
  resolvePalaceStrifeConvictionPenalty,
  resolvePalaceStrifeSeverity,
  resolveYangxinHearing,
} from '../lib/palaceStrifeRuntime';
import { resolveNightlyService, resolvePlayerNightlyServiceEvent } from '../lib/nightlyServiceRuntime';
import { buildSaveGameV1, type SaveGameV1 } from '../save/saveGameV1';
import type {
  AffairSourceLabel,
  BondProfileState,
  ConcubineProfile,
  ConsortInteractionProgress,
  ConsortPalaceActionId,
  CurrentView,
  DialogueTurn,
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
  NightlyServiceState,
  PalaceStrifeCaseState,
  PalaceStrifeResolution,
  PalaceStrifeStartInput,
  YangxinHearingStance,
  TempleProgressState,
  RelationshipJudgeOutcome,
  RouteSelectionProfile,
  SceneId,
  MapAreaId,
  SettlementReport,
} from '../types';

export interface GameFlowStore {
  currentView: CurrentView;
  scene: SceneId;
  activeChamberPanel: ChamberPanelId;
  activeMapLocation?: MapAreaId;
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
  templeProgress: TempleProgressState;
  nightlyService: NightlyServiceState;
  settlementReports: SettlementReport[];
  palaceStrifeCases: PalaceStrifeCaseState[];
  latestSettlementReportId?: string;
  lastSeenSettlementReportId?: string;
  setCurrentView: (view: CurrentView) => void;
  setScene: (scene: SceneId) => void;
  openChamberPanel: (panel: ChamberPanelId) => void;
  closeChamberPanel: () => void;
  setActiveAffairsSource: (source: AffairSourceLabel) => void;
  enterMainChamber: (location?: MapAreaId | null) => void;
  enterMapMain: () => void;
  setRoute: (routeId: GameNumericsState['routeId']) => void;
  applyRouteSelection: (profile: RouteSelectionProfile) => void;
  setPlayerName: (name: string) => void;
  patchState: (patch: Partial<GameNumericsState>) => void;
  patchHiddenStats: (patch: Partial<HiddenStatsState>) => void;
  setBriefing: (briefing: string) => void;
  setDialogue: (dialogue?: DialogueTurn) => void;
  setMapEventText: (text: string) => void;
  setSave: (save: NumericSaveEnvelope) => void;
  setAttributeValue: (key: string, value: number) => void;
  validatePoints: () => void;
  ensureBondProfile: (routeId?: GameNumericsState['routeId']) => void;
  ensureConcubines: (routeId?: GameNumericsState['routeId']) => void;
  addCustomConsort: (consort: ConcubineProfile) => void;
  patchConcubineById: (consortId: string, updater: (consort: ConcubineProfile) => ConcubineProfile) => void;
  patchKitchenProgress: (patch: Partial<KitchenProgressState>) => void;
  patchMedicalProgress: (patch: Partial<MedicalProgressState>) => void;
  patchMusicHallProgress: (patch: Partial<MusicHallProgressState>) => void;
  patchTempleProgress: (patch: Partial<TempleProgressState>) => void;
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
  };
  applyBondJudgement: (result: RelationshipJudgeOutcome) => void;
  advanceTime: (steps?: number) => void;
  acknowledgeSettlementReport: (reportId?: string) => void;
  acknowledgeNightlyServiceNotice: () => void;
  finalizePendingNightlyService: (choices: Array<NightlyServiceInteractionActionId | NightlyServiceInteractionChoice>) => void;
  spendFamilyAid: () => { success: boolean; message: string };
  startPalaceStrifeCase: (input: PalaceStrifeStartInput) => PalaceStrifeResolution;
  bribePalaceStrifeCase: (caseId: string, silverSpent: number) => { success: boolean; message: string };
  resolveYangxinPalaceStrifeCase: (caseId: string, stance: YangxinHearingStance) => { success: boolean; message: string };
  exportSaveGameV1: (savedAt?: string) => SaveGameV1;
  loadSaveGameV1: (saveGame: SaveGameV1) => void;
  applyStoryEffects: (effects: Partial<GameNumericsState> & { stats?: Record<string, number>; flags?: Record<string, boolean> }) => void;
}

const initialStats = Object.fromEntries(attributeFields.map((field) => [field.key, field.value]));

const getFieldMinMap = (): Record<string, number> => Object.fromEntries(attributeFields.map((field) => [field.key, field.min]));

const sumExcessPoints = (stats: Record<string, number>, mins: Record<string, number>): number =>
  Object.entries(stats).reduce((acc, [key, value]) => {
    const current = Number.isFinite(value) ? Number(value) : 0;
    const min = Number.isFinite(mins[key]) ? Number(mins[key]) : 0;
    return acc + Math.max(0, current - min);
  }, 0);

const clampInt = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.floor(value)));
const clampToRange = (value: number, range: readonly [number, number]): number => Math.max(range[0], Math.min(range[1], value));
const timeSlots: PalaceTimeState['slot'][] = ['清晨', '上午', '中午', '下午', '傍晚', '夜晚', '深夜'];
const DEFAULT_AFFAIRS_SOURCE = '????' as AffairSourceLabel;
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
  concubines: ConcubineProfile[],
  customConsorts: ConcubineProfile[],
): { cases: PalaceStrifeCaseState[]; lines: string[]; resolvedIds: Set<string> } => {
  const lines: string[] = [];
  const resolvedIds = new Set<string>();
  const cases = caseStates.map((caseState) => {
    if (caseState.status !== 'pending_resolution') {
      return caseState;
    }

    const target = findConsortById(caseState.targetConsortId, concubines, customConsorts);
    if (!target) {
      resolvedIds.add(caseState.id);
      const missingTargetCase: PalaceStrifeCaseState = {
        ...caseState,
        status: 'resolved',
        outcome: 'cold_case',
        summary: `${caseState.targetName}一事失去对象，暂作疑案封存。`,
      };
      return missingTargetCase;
    }

    const resolved = resolvePalaceStrifeAttempt({
      playerState: buildAttackerStateForPalaceStrife(caseState, playerState, concubines, customConsorts),
      target,
      actionKind: caseState.actionKind,
      methodLabel: caseState.methodLabel,
      itemLabel: caseState.itemLabel,
      allyLabel: caseState.allyLabel,
      framedTargetName: caseState.framedTargetName,
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
      yangxinHearingRequired: caseState.actorId === 'player' && resolved.status === 'investigating',
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

const settlePalaceStrifeForXunTransitions = (
  caseStates: PalaceStrifeCaseState[],
  xunTransitions: number,
  playerState: GameNumericsState,
  concubines: ConcubineProfile[],
  customConsorts: ConcubineProfile[],
  nextTime: PalaceTimeState,
): { cases: PalaceStrifeCaseState[]; lines: string[] } => {
  let nextCases = caseStates;
  const lines: string[] = [];

  for (let i = 0; i < xunTransitions; i += 1) {
    const beforeStep = nextCases;
    const resolved = resolvePendingPalaceStrifeCasesForTransition(nextCases, playerState, concubines, customConsorts);
    const afterInvestigation = resolved.cases.map((caseState) =>
      resolved.resolvedIds.has(caseState.id) ? caseState : advancePalaceStrifeInvestigations([caseState], 1)[0],
    );
    lines.push(...resolved.lines, ...describePalaceStrifeInvestigationChanges(beforeStep, afterInvestigation));
    nextCases = afterInvestigation;
  }

  const npcCase = generateNpcPalaceStrifeCase({
    concubines: [...concubines, ...customConsorts],
    existingCases: nextCases,
    time: {
      year: nextTime.year,
      month: nextTime.month,
      xun: nextTime.xun,
    },
  });
  if (npcCase) {
    nextCases = [...nextCases, npcCase];
    lines.push(`宫中暗流：${npcCase.summary}`);
  }

  return { cases: nextCases, lines };
};

const applyNpcPalaceStrifeConvictionPenalties = (
  concubines: ConcubineProfile[],
  convictedCases: PalaceStrifeCaseState[],
): ConcubineProfile[] => {
  if (convictedCases.length === 0) {
    return concubines;
  }

  const penaltiesByActorId = new Map<string, ReturnType<typeof resolvePalaceStrifeConvictionPenalty>>();
  convictedCases.forEach((caseState) => {
    if (caseState.actorId !== 'npc' || !caseState.actorConsortId) {
      return;
    }
    const penalty = resolvePalaceStrifeConvictionPenalty(caseState);
    const existing = penaltiesByActorId.get(caseState.actorConsortId);
    penaltiesByActorId.set(caseState.actorConsortId, {
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
        prestige: Math.max(0, Number(consort.stats.prestige ?? 0) + penalty.prestigeDelta),
        favor: Number(consort.stats.favor ?? 0) + penalty.favorDelta,
        stress: Number(consort.stats.stress ?? 0) + penalty.stressDelta,
        relationToPlayer: Math.min(Number(consort.stats.relationToPlayer ?? 0), -20),
      },
    });
  });
};

const describeNpcPalaceStrifeConvictionPenalties = (convictedCases: PalaceStrifeCaseState[]): string[] =>
  convictedCases
    .filter((caseState) => caseState.actorId === 'npc' && caseState.actorConsortId)
    .map((caseState) => {
      const penalty = resolvePalaceStrifeConvictionPenalty(caseState);
      return `${caseState.actorName ?? caseState.actorConsortId}因${caseState.targetName}一案定罪，声望-${Math.abs(
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
  favorDeltaThisXun: 0,
  affectionDeltaThisXun: 0,
});

const buildRouteConcubines = (
  routeId: GameNumericsState['routeId'],
  customConsorts: ConcubineProfile[],
  playerFavor: number,
): ConcubineProfile[] => buildInitialConcubineRoster(routeId, customConsorts, [playerFavor]);

const resolvePointsTotalByFamily = (family: string): number => {
  const normalized = String(family ?? '').replace(/\s+/g, '');
  if (normalized.includes('镇国公') || normalized.includes('和亲公主')) {
    return 48;
  }
  if (normalized.includes('异国贡女')) {
    return 52;
  }
  if (normalized.includes('罪臣')) {
    return 54;
  }
  if (normalized.includes('商贾')) {
    return 56;
  }

  const gradeMatch = normalized.match(/[一二三四五六七八九]品/);
  if (gradeMatch) {
    const gradeMap: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
    };
    const n = gradeMap[gradeMatch[0][0]];
    if (n) {
      return clampInt(47 + n, 48, 56);
    }
  }

  return 50;
};

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
  const pointsTotal = resolvePointsTotalByFamily(state.family);
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

const initialState: GameNumericsState = validatePointsState({
  name: '沈容儿',
  age: 15,
  family: '四品文官义女',
  residenceName: '储秀宫',
  openingTendency: undefined,
  monthlyExpenseStrategy: DEFAULT_MONTHLY_EXPENSE_STRATEGY,
  nextMonthlyExpenseStrategy: undefined,
  familyAidBonus: 0,
  familyAidPrestigePending: 0,
  pointsTotal: 48,
  pointsLeft: 24,
  routeId: 'lanyinxuguo',
  actionPoints: 4,
  stamina: STAMINA_INITIAL_PER_XUN,
  silver: 1000,
  prestige: 2500,
  stress: 30,
  favor: 50,
  trueHeart: 35,
  stats: initialStats,
  flags: {},
});

const initialHiddenStats: HiddenStatsState = {
  silver: 1000,
  prestige: 2500,
  stress: 30,
  favor: 50,
  trueHeart: 35,
  ...resolveFavorPresentation(initialState.favor),
};

const initialTime: PalaceTimeState = {
  year: 1,
  month: 1,
  xun: 1,
  slotIndex: 0,
  slot: timeSlots[0],
  slotProgress: 0,
};

const initialBondProfile = buildInitialBondProfile('lanyinxuguo', getCurrentXunKey(initialTime));
const initialConcubines = buildRouteConcubines('lanyinxuguo', [], initialState.favor);
const initialInventory = cloneInitialInventory();
const initialMerchantLedger: Record<string, number> = {};
const createInitialKitchenProgress = (): KitchenProgressState => ({
  strollCount: 0,
  buZiyouUnlocked: false,
  buZiyouMet: false,
  buZiyouFavor: 0,
  buZiyouAffinity: 0,
});

const createInitialTempleProgress = (): TempleProgressState => ({
  worshipCount: 0,
  prayerCount: 0,
  strollCount: 0,
  dangYiFavor: 0,
  dangYiAffinity: 0,
});

const createInitialMedicalProgress = (): MedicalProgressState => ({
  strollCount: 0,
  consultationCount: 0,
  jianNingMet: false,
  jianNingFavor: 0,
  jianNingAffinity: 0,
});

const createInitialMusicHallProgress = (): MusicHallProgressState => ({
  listenCount: 0,
  strollCount: 0,
  signUpCount: 0,
  lianQiaoFirstMet: false,
  lianQiaoMet: false,
  lianQiaoFavor: 0,
  lianQiaoAffection: 0,
});

const createInitialNightlyService = (): NightlyServiceState => ({
  playerNightFavorGauge: 0,
  emperorMood: 40,
  reports: [],
});

const restoreSaveGameV1Fields = (saveGame: SaveGameV1): Partial<GameFlowStore> => ({
  currentView: 'start',
  scene: 'menu',
  activeChamberPanel: 'main',
  activeMapLocation: undefined,
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
  templeProgress: saveGame.progress.temple,
  nightlyService: saveGame.progress.nightlyService ?? createInitialNightlyService(),
  settlementReports: saveGame.world.settlementReports,
  palaceStrifeCases: saveGame.cases?.palaceStrifeCases ?? [],
  latestSettlementReportId: saveGame.world.latestSettlementReportId,
  lastSeenSettlementReportId: saveGame.world.lastSeenSettlementReportId,
});

export const useGameFlowStore = create<GameFlowStore>()(
  persist(
    (set, get) => ({
      currentView: 'start',
      scene: 'menu',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
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
      templeProgress: createInitialTempleProgress(),
      nightlyService: createInitialNightlyService(),
      settlementReports: [],
      palaceStrifeCases: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
      setCurrentView: (currentView) => set({ currentView }),
      setScene: (scene) => set({ scene }),
      openChamberPanel: (activeChamberPanel) => set({ activeChamberPanel }),
      closeChamberPanel: () => set({ activeChamberPanel: 'main' }),
      setActiveAffairsSource: (activeAffairsSource) => set({ activeAffairsSource }),
      enterMainChamber: (location) =>
        set({
          currentView: 'bedchamber',
          scene: 'activity',
          activeChamberPanel: 'main',
          activeMapLocation: location ?? undefined,
        }),
      enterMapMain: () =>
        set({
          currentView: 'map-main',
          scene: 'map',
          activeChamberPanel: 'main',
        }),
      setRoute: (routeId) =>
        set((current) => ({
          routeId,
          state: { ...current.state, routeId },
          bondProfile: buildInitialBondProfile(routeId, getCurrentXunKey(current.time)),
          concubineRouteId: routeId,
          concubines: buildRouteConcubines(routeId, current.customConsorts, current.state.favor),
          merchantLedger: {},
          kitchenProgress: createInitialKitchenProgress(),
          medicalProgress: createInitialMedicalProgress(),
          musicHallProgress: createInitialMusicHallProgress(),
          templeProgress: createInitialTempleProgress(),
          nightlyService: createInitialNightlyService(),
          settlementReports: [],
          latestSettlementReportId: undefined,
          lastSeenSettlementReportId: undefined,
        })),
      applyRouteSelection: (profile) =>
        set((current) => {
          const nextFavor = normalizePlayerFavor(profile.hiddenStats.favor);
          return {
            currentView: 'attribute-assignment',
            routeId: profile.id,
            selectedRoute: profile,
            state: validatePointsState({
              ...current.state,
              ...profile.baseState,
              routeId: profile.id,
              name: profile.baseState.name ?? profile.defaultName,
              family: profile.baseState.family ?? profile.familyDisplay,
              residenceName: profile.baseState.residenceName ?? profile.residenceDisplay,
              monthlyExpenseStrategy: profile.baseState.monthlyExpenseStrategy ?? DEFAULT_MONTHLY_EXPENSE_STRATEGY,
              nextMonthlyExpenseStrategy: profile.baseState.nextMonthlyExpenseStrategy,
              familyAidBonus: profile.baseState.familyAidBonus ?? 0,
              familyAidPrestigePending: profile.baseState.familyAidPrestigePending ?? 0,
              age: profile.baseState.age ?? current.state.age,
              stamina: profile.baseState.stamina ?? STAMINA_INITIAL_PER_XUN,
              silver: profile.hiddenStats.silver,
              prestige: profile.hiddenStats.prestige,
              stress: profile.hiddenStats.stress,
              favor: nextFavor,
              trueHeart: profile.hiddenStats.trueHeart,
              pointsTotal: profile.baseState.pointsTotal ?? current.state.pointsTotal,
              pointsLeft: profile.baseState.pointsTotal ?? profile.baseState.pointsLeft ?? current.state.pointsLeft,
              flags: {
                routeLockedStats: Boolean(profile.statsLocked),
              },
            }),
            hiddenStats: {
              ...profile.hiddenStats,
              favor: nextFavor,
              ...resolveFavorPresentation(nextFavor),
            },
            bondProfile: buildInitialBondProfile(profile.id, getCurrentXunKey(current.time)),
            concubineRouteId: profile.id,
            concubines: buildRouteConcubines(profile.id, current.customConsorts, nextFavor),
            inventory: cloneInitialInventory(),
            merchantLedger: {},
            consortInteractionMap: {},
            kitchenProgress: createInitialKitchenProgress(),
            medicalProgress: createInitialMedicalProgress(),
            musicHallProgress: createInitialMusicHallProgress(),
            templeProgress: createInitialTempleProgress(),
            nightlyService: createInitialNightlyService(),
            settlementReports: [],
            latestSettlementReportId: undefined,
            lastSeenSettlementReportId: undefined,
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
          const shouldValidate = 'family' in patch || 'stats' in patch || 'pointsTotal' in patch || 'pointsLeft' in patch;
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
      validatePoints: () => set((current) => ({ state: validatePointsState(current.state) })),
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
          return {
            customConsorts,
            concubines: buildRouteConcubines(current.state.routeId, customConsorts, current.state.favor),
            concubineRouteId: current.state.routeId,
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
      patchTempleProgress: (patch) =>
        set((current) => ({
          templeProgress: {
            ...current.templeProgress,
            ...patch,
          },
        })),
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

          return consumed ? { inventory: nextInventory } : current;
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
        };

        set((current) => {
          const xunKey = getCurrentXunKey(current.time);
          const activeProgress =
            current.consortInteractionMap[consortId]?.xunKey === xunKey
              ? current.consortInteractionMap[consortId]
              : createEmptyConsortInteractionProgress(consortId, xunKey);
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
            prestige: Math.max(0, current.state.prestige + (effects.prestige ?? 0)),
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
      advanceTime: (steps = 1) =>
        set((current) => {
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
          const nextTime = {
            year,
            month,
            xun,
            slotIndex,
            slot: timeSlots[slotIndex],
            slotProgress,
          };
          const shouldResolveNightlyService =
            enteredNight || (xunTransitions > 0 && !current.nightlyService.pendingMorningLines);
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
          const palaceStrifeSettlement =
            xunTransitions > 0
              ? settlePalaceStrifeForXunTransitions(
                  current.palaceStrifeCases,
                  xunTransitions,
                  current.state,
                  current.concubines,
                  current.customConsorts,
                  nextTime,
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
          const playerConvictedCases = newlyConvictedCases.filter((caseState) => caseState.actorId === 'player');
          const npcConvictedCases = newlyConvictedCases.filter((caseState) => caseState.actorId === 'npc');
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
          const postSettlementPrestige = Math.max(
            0,
            current.state.prestige +
              monthlyExpensePrestigeDelta +
              monthlyFamilyPrestigeDelta +
              quarterlyFamilyAidPrestigeDelta +
              convictionPenaltyTotals.prestigeDelta +
              (nightlyServiceSettlement?.effects.playerPrestigeDelta ?? 0),
          );
          const postSettlementFavor = normalizePlayerFavor(
            current.state.favor +
              convictionPenaltyTotals.favorDelta +
              (nightlyServiceSettlement?.effects.playerFavorDelta ?? 0),
          );
          const postSettlementStress = Math.max(0, current.state.stress + convictionPenaltyTotals.stressDelta);
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
          const nextState = xunTransitions > 0 || nightlyServiceSettlement
            ? {
                ...current.state,
                stamina: xunTransitions > 0 ? resolveXunStartingStamina() : current.state.stamina,
                silver: xunTransitions > 0 ? Math.max(0, current.state.silver + monthlyNetSilver) : current.state.silver,
                prestige: postSettlementPrestige,
                favor: postSettlementFavor,
                stress: postSettlementStress,
                trueHeart: postSettlementTrueHeart,
                stats: monthTransitions > 0
                  ? {
                      ...current.state.stats,
                      health: Math.max(0, Number(current.state.stats.health ?? 0) + monthlyExpenseHealthDelta),
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
              ? current.concubines.map((consort) => applyConcubinePressureHealthPenalty(consort, xunTransitions))
              : current.concubines;
          const baseNextCustomConsorts =
            xunTransitions > 0
              ? current.customConsorts.map((consort) => applyConcubinePressureHealthPenalty(consort, xunTransitions))
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
          const nightlyServiceLines =
            xunTransitions > 0
              ? current.nightlyService.pendingMorningLines ?? []
              : hasPendingPlayerNightlyService
                ? []
                : nightlyServiceSettlement?.morningLines ?? [];
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
                palaceStrifeLines,
                reportIndex: current.settlementReports.length + 1,
              });
          const settlementReports = settlementReport
            ? [...current.settlementReports, settlementReport].slice(-MAX_SETTLEMENT_REPORTS)
            : current.settlementReports;

          return {
            state: nextState,
            hiddenStats:
              xunTransitions > 0 || nightlyServiceSettlement
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
            latestSettlementReportId: settlementReport?.id ?? current.latestSettlementReportId,
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
            prestige: Math.max(0, current.state.prestige + result.effects.playerPrestigeDelta),
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
            palaceStrifeLines: [],
            reportIndex: current.settlementReports.length + 1,
          });
          const settlementReports = settlementReport
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
            settlementReports,
            latestSettlementReportId: settlementReport?.id ?? current.latestSettlementReportId,
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
            message: `${targetCase.targetName}一案已花费${cost}两打点，定案率降至${nextCase.convictionRate}%。`,
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
      resolveYangxinPalaceStrifeCase: (caseId, stance) => {
        let result = { success: false, message: '未找到需要养心殿裁断的案件。' };
        set((current) => {
          const targetCase = current.palaceStrifeCases.find((caseState) => caseState.id === caseId);
          if (
            !targetCase ||
            targetCase.status !== 'investigating' ||
            !targetCase.yangxinHearingRequired ||
            targetCase.yangxinHearingResolved
          ) {
            return current;
          }

          const nextCase = resolveYangxinHearing(targetCase, current.state, stance);
          result = {
            success: true,
            message: nextCase.yangxinHearingSummary ?? '养心殿裁断已记录。',
          };

          return {
            palaceStrifeCases: current.palaceStrifeCases.map((caseState) =>
              caseState.id === caseId ? nextCase : caseState,
            ),
          };
        });
        return result;
      },
      exportSaveGameV1: (savedAt) => buildSaveGameV1(get(), savedAt),
      loadSaveGameV1: (saveGame) => set(restoreSaveGameV1Fields(saveGame)),
    }),
    {
      name: 'palace-galgame-flow',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        ({
          saveGame: buildSaveGameV1(state),
        }) as unknown as Partial<GameFlowStore>,
      merge: (persisted, current) => {
        const saveGame = (persisted as { saveGame?: SaveGameV1 } | undefined)?.saveGame;
        if (saveGame?.schemaVersion === 1) {
          return {
            ...current,
            ...restoreSaveGameV1Fields(saveGame),
          };
        }

        return {
          ...current,
          ...(persisted as Partial<GameFlowStore>),
          currentView: 'start',
        activeChamberPanel: (persisted as Partial<GameFlowStore>)?.activeChamberPanel ?? 'main',
        activeMapLocation: (persisted as Partial<GameFlowStore>)?.activeMapLocation,
        activeAffairsSource: (persisted as Partial<GameFlowStore>)?.activeAffairsSource ?? '宫斗事务',
        bondProfile:
          (persisted as Partial<GameFlowStore>)?.bondProfile ??
          buildInitialBondProfile(current.state.routeId, getCurrentXunKey(current.time)),
        concubineRouteId: (persisted as Partial<GameFlowStore>)?.concubineRouteId ?? current.state.routeId,
        concubines:
          (persisted as Partial<GameFlowStore>)?.concubines
            ? enforceConcubineFavorTierCaps(
                (persisted as Partial<GameFlowStore>)?.concubines?.map(normalizeConcubineProfile) ?? [],
                [((persisted as Partial<GameFlowStore>)?.state?.favor ?? current.state.favor)],
              )
            : buildRouteConcubines(
                (persisted as Partial<GameFlowStore>)?.routeId ?? current.state.routeId,
                ((persisted as Partial<GameFlowStore>)?.customConsorts ?? []).map(normalizeConcubineProfile),
                (persisted as Partial<GameFlowStore>)?.state?.favor ?? current.state.favor,
              ),
        customConsorts: ((persisted as Partial<GameFlowStore>)?.customConsorts ?? []).map(normalizeConcubineProfile),
        inventory: (persisted as Partial<GameFlowStore>)?.inventory ?? cloneInitialInventory(),
        merchantLedger: (persisted as Partial<GameFlowStore>)?.merchantLedger ?? {},
        consortInteractionMap: (persisted as Partial<GameFlowStore>)?.consortInteractionMap ?? {},
        kitchenProgress: (persisted as Partial<GameFlowStore>)?.kitchenProgress ?? createInitialKitchenProgress(),
        medicalProgress: (persisted as Partial<GameFlowStore>)?.medicalProgress ?? createInitialMedicalProgress(),
        musicHallProgress: (persisted as Partial<GameFlowStore>)?.musicHallProgress ?? createInitialMusicHallProgress(),
        templeProgress: (persisted as Partial<GameFlowStore>)?.templeProgress ?? createInitialTempleProgress(),
        settlementReports: (persisted as Partial<GameFlowStore>)?.settlementReports ?? [],
        palaceStrifeCases: (persisted as Partial<GameFlowStore>)?.palaceStrifeCases ?? [],
        latestSettlementReportId: (persisted as Partial<GameFlowStore>)?.latestSettlementReportId,
        lastSeenSettlementReportId: (persisted as Partial<GameFlowStore>)?.lastSeenSettlementReportId,
        };
      },
    },
  ),
);
