import type {
  BondProfileState,
  ConcubineProfile,
  ConsortInteractionProgress,
  CraftWorksProgressState,
  GameNumericsState,
  HiddenStatsState,
  EmperorInteractionProgressState,
  InventoryItem,
  KitchenProgressState,
  MedicalProgressState,
  MusicHallProgressState,
  NightlyServiceState,
  NpcActivityState,
  NpcRelationMatrix,
  PalaceBanquetProgressState,
  PalaceTimeState,
  PalaceStrifeCaseState,
  PermanentNpcRelationshipMap,
  YangxinVerdictEventState,
  RouteId,
  RouteSelectionProfile,
  SettlementReport,
  TempleProgressState,
} from '../types';
import type { RandomEventProgress } from '../random-events/randomEventRuntime';
import {
  hasRequiredSaveProgress,
  hasRequiredSaveRelations,
  hasRequiredSaveSections,
  SAVE_GAME_SCHEMA_VERSION,
  SAVE_GAME_STORAGE_KEY,
} from './saveGameConfig';

export { SAVE_GAME_SCHEMA_VERSION, SAVE_GAME_STORAGE_KEY } from './saveGameConfig';

export interface SaveGameV1Source {
  routeId: RouteId;
  state: GameNumericsState;
  hiddenStats: HiddenStatsState;
  time: PalaceTimeState;
  selectedRoute?: RouteSelectionProfile;
  bondProfile: BondProfileState;
  concubineRouteId: RouteId;
  concubines: ConcubineProfile[];
  customConsorts: ConcubineProfile[];
  inventory: InventoryItem[];
  merchantLedger: Record<string, number>;
  consortInteractionMap: Record<string, ConsortInteractionProgress>;
  permanentNpcRelationships: PermanentNpcRelationshipMap;
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
  randomEventProgress: RandomEventProgress;
  settlementReports: SettlementReport[];
  palaceStrifeCases: PalaceStrifeCaseState[];
  pendingYangxinVerdict?: YangxinVerdictEventState;
  latestSettlementReportId?: string;
  lastSeenSettlementReportId?: string;
}

export interface SaveGameV1 {
  schemaVersion: typeof SAVE_GAME_SCHEMA_VERSION;
  savedAt: string;
  route: {
    routeId: RouteId;
    selectedRoute?: RouteSelectionProfile;
  };
  player: {
    state: GameNumericsState;
    hiddenStats: HiddenStatsState;
  };
  world: {
    time: PalaceTimeState;
    settlementReports: SettlementReport[];
    latestSettlementReportId?: string;
    lastSeenSettlementReportId?: string;
  };
  roster: {
    concubineRouteId: RouteId;
    concubines: ConcubineProfile[];
    customConsorts: ConcubineProfile[];
  };
  inventory: {
    items: InventoryItem[];
    merchantLedger: Record<string, number>;
  };
  relations: {
    bondProfile: BondProfileState;
    consortInteractionMap: Record<string, ConsortInteractionProgress>;
    npcRelationMatrix: NpcRelationMatrix;
    permanentNpcRelationships: PermanentNpcRelationshipMap;
  };
  cases: {
    palaceStrifeCases: PalaceStrifeCaseState[];
    pendingYangxinVerdict: YangxinVerdictEventState | null;
  };
  progress: {
    kitchen: KitchenProgressState;
    medical: MedicalProgressState;
    musicHall: MusicHallProgressState;
    palaceBanquet: PalaceBanquetProgressState;
    craftWorks: CraftWorksProgressState;
    temple: TempleProgressState;
    emperorInteraction: EmperorInteractionProgressState;
    nightlyService: NightlyServiceState;
    npcActivity: NpcActivityState;
    randomEvents: RandomEventProgress;
  };
}

interface PersistedSaveGameV1Envelope {
  state?: {
    saveGame?: SaveGameV1;
  };
}

const hasV051PalaceStrifeCases = (value: SaveGameV1): boolean =>
  Array.isArray(value.cases?.palaceStrifeCases) &&
  'pendingYangxinVerdict' in value.cases &&
  value.cases.palaceStrifeCases.every((caseState) => Array.isArray(caseState.suspects));

const hasConsortInteractionActionCounts = (value: SaveGameV1): boolean =>
  Boolean(value.relations?.consortInteractionMap) &&
  Object.values(value.relations.consortInteractionMap).every(
    (progress) => typeof progress.actionCountThisXun === 'number',
  );

const hasEmperorInteractionSchedule = (value: SaveGameV1): boolean => {
  const progress = value.progress?.emperorInteraction;
  return Boolean(
    progress &&
      typeof progress.xunKey === 'string' &&
      typeof progress.mood === 'number' &&
      progress.schedule &&
      progress.schedule.xunKey === progress.xunKey &&
      progress.schedule.slots &&
      ['清晨', '上午', '中午', '下午', '傍晚', '夜晚', '深夜'].every(
        (slot) => typeof progress.schedule.slots[slot as keyof typeof progress.schedule.slots]?.location === 'string',
      ),
  );
};

export const isSaveGameV1 = (value: unknown): value is SaveGameV1 =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as SaveGameV1).schemaVersion === SAVE_GAME_SCHEMA_VERSION &&
      typeof (value as SaveGameV1).savedAt === 'string' &&
      hasRequiredSaveSections(value) &&
      hasRequiredSaveRelations((value as SaveGameV1).relations) &&
      hasRequiredSaveProgress((value as SaveGameV1).progress) &&
      Array.isArray((value as SaveGameV1).progress?.emperorInteraction?.triggeredEncounterIds) &&
      hasEmperorInteractionSchedule(value as SaveGameV1) &&
      hasConsortInteractionActionCounts(value as SaveGameV1) &&
      hasV051PalaceStrifeCases(value as SaveGameV1),
  );

const resolveSaveStorage = (storage?: Storage): Storage | undefined => {
  if (storage) {
    return storage;
  }
  if (typeof localStorage === 'undefined') {
    return undefined;
  }
  return localStorage;
};

export const readSaveGameV1FromStorage = (storage?: Storage): SaveGameV1 | undefined => {
  const targetStorage = resolveSaveStorage(storage);
  if (!targetStorage) {
    return undefined;
  }

  try {
    const encoded = targetStorage.getItem(SAVE_GAME_STORAGE_KEY);
    if (!encoded) {
      return undefined;
    }
    const envelope = JSON.parse(encoded) as PersistedSaveGameV1Envelope;
    const saveGame = envelope.state?.saveGame;
    if (isSaveGameV1(saveGame)) {
      return saveGame;
    }
    targetStorage.removeItem(SAVE_GAME_STORAGE_KEY);
    return undefined;
  } catch {
    targetStorage.removeItem(SAVE_GAME_STORAGE_KEY);
    return undefined;
  }
};

export const clearSaveGameV1Storage = (storage?: Storage): void => {
  const targetStorage = resolveSaveStorage(storage);
  targetStorage?.removeItem(SAVE_GAME_STORAGE_KEY);
};

export const buildSaveGameV1 = (source: SaveGameV1Source, savedAt = new Date().toISOString()): SaveGameV1 => ({
  schemaVersion: SAVE_GAME_SCHEMA_VERSION,
  savedAt,
  route: {
    routeId: source.routeId,
    selectedRoute: source.selectedRoute,
  },
  player: {
    state: source.state,
    hiddenStats: source.hiddenStats,
  },
  world: {
    time: source.time,
    settlementReports: source.settlementReports,
    latestSettlementReportId: source.latestSettlementReportId,
    lastSeenSettlementReportId: source.lastSeenSettlementReportId,
  },
  roster: {
    concubineRouteId: source.concubineRouteId,
    concubines: source.concubines,
    customConsorts: source.customConsorts,
  },
  inventory: {
    items: source.inventory,
    merchantLedger: source.merchantLedger,
  },
  relations: {
    bondProfile: source.bondProfile,
    consortInteractionMap: source.consortInteractionMap,
    npcRelationMatrix: source.npcRelationMatrix,
    permanentNpcRelationships: source.permanentNpcRelationships,
  },
  cases: {
    palaceStrifeCases: source.palaceStrifeCases,
    pendingYangxinVerdict: source.pendingYangxinVerdict ?? null,
  },
  progress: {
    kitchen: source.kitchenProgress,
    medical: source.medicalProgress,
    musicHall: source.musicHallProgress,
    palaceBanquet: source.palaceBanquetProgress,
    craftWorks: source.craftWorksProgress,
    temple: source.templeProgress,
    emperorInteraction: source.emperorInteraction,
    nightlyService: source.nightlyService,
    npcActivity: source.npcActivity,
    randomEvents: source.randomEventProgress,
  },
});
