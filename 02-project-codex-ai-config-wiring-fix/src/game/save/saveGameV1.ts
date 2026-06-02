import type {
  BondProfileState,
  ConcubineProfile,
  ConsortInteractionProgress,
  GameNumericsState,
  HiddenStatsState,
  InventoryItem,
  KitchenProgressState,
  MedicalProgressState,
  MusicHallProgressState,
  NightlyServiceState,
  PalaceBanquetProgressState,
  PalaceTimeState,
  PalaceStrifeCaseState,
  RouteId,
  RouteSelectionProfile,
  SettlementReport,
  TempleProgressState,
} from '../types';

export const SAVE_GAME_SCHEMA_VERSION = 1;
export const SAVE_GAME_STORAGE_KEY = 'palace-galgame-flow';

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
  kitchenProgress: KitchenProgressState;
  medicalProgress: MedicalProgressState;
  musicHallProgress: MusicHallProgressState;
  palaceBanquetProgress: PalaceBanquetProgressState;
  templeProgress: TempleProgressState;
  nightlyService: NightlyServiceState;
  settlementReports: SettlementReport[];
  palaceStrifeCases: PalaceStrifeCaseState[];
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
  };
  cases: {
    palaceStrifeCases: PalaceStrifeCaseState[];
  };
  progress: {
    kitchen: KitchenProgressState;
    medical: MedicalProgressState;
    musicHall: MusicHallProgressState;
    palaceBanquet?: PalaceBanquetProgressState;
    temple: TempleProgressState;
    nightlyService: NightlyServiceState;
  };
}

interface PersistedSaveGameV1Envelope {
  state?: {
    saveGame?: SaveGameV1;
  };
}

const isSaveGameV1 = (value: unknown): value is SaveGameV1 =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as SaveGameV1).schemaVersion === SAVE_GAME_SCHEMA_VERSION &&
      typeof (value as SaveGameV1).savedAt === 'string' &&
      (value as SaveGameV1).player &&
      (value as SaveGameV1).world &&
      (value as SaveGameV1).route,
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
    return isSaveGameV1(saveGame) ? saveGame : undefined;
  } catch {
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
  },
  cases: {
    palaceStrifeCases: source.palaceStrifeCases,
  },
  progress: {
    kitchen: source.kitchenProgress,
    medical: source.medicalProgress,
    musicHall: source.musicHallProgress,
    palaceBanquet: source.palaceBanquetProgress,
    temple: source.templeProgress,
    nightlyService: source.nightlyService,
  },
});
