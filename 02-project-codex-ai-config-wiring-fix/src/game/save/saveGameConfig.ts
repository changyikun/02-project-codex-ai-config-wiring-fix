import type {
  EmperorInteractionProgressState,
  KitchenProgressState,
  MedicalProgressState,
  MusicHallProgressState,
  NightlyServiceState,
  PalaceBanquetProgressState,
  TempleProgressState,
} from '../types';
import { getNumericRuleValue } from '../numerics/numericCatalog';

export const SAVE_GAME_SCHEMA_VERSION = 3;
export const SAVE_GAME_STORAGE_KEY = 'palace-galgame-flow';

export const SAVE_GAME_REQUIRED_SECTIONS = ['route', 'player', 'world', 'roster', 'inventory', 'relations', 'cases', 'progress'] as const;

export const SAVE_GAME_REQUIRED_PROGRESS_KEYS = [
  'kitchen',
  'medical',
  'musicHall',
  'palaceBanquet',
  'temple',
  'emperorInteraction',
  'nightlyService',
  'npcActivity',
] as const;

export const SAVE_GAME_REQUIRED_RELATION_KEYS = ['bondProfile', 'consortInteractionMap', 'npcRelationMatrix'] as const;

export const createInitialKitchenProgress = (): KitchenProgressState => ({
  strollCount: 0,
  buZiyouUnlocked: false,
  buZiyouMet: false,
  buZiyouFavor: 0,
  buZiyouAffinity: 0,
});

export const createInitialTempleProgress = (): TempleProgressState => ({
  worshipCount: 0,
  prayerCount: 0,
  strollCount: 0,
  dangYiFavor: 0,
  dangYiAffinity: 0,
});

export const createInitialMedicalProgress = (): MedicalProgressState => ({
  strollCount: 0,
  consultationCount: 0,
  jianNingMet: false,
  jianNingFavor: 0,
  jianNingAffinity: 0,
});

export const createInitialMusicHallProgress = (): MusicHallProgressState => ({
  listenCount: 0,
  strollCount: 0,
  signUpCount: 0,
  lianQiaoFirstMet: false,
  lianQiaoMet: false,
  lianQiaoFavor: 0,
  lianQiaoAffection: 0,
  musicScoreMastery: {},
});

export const createInitialPalaceBanquetProgress = (): PalaceBanquetProgressState => ({
  submissionCount: 0,
});

export const createInitialEmperorInteractionProgress = (): EmperorInteractionProgressState => ({
  triggeredEncounterIds: [],
});

export const createInitialNightlyService = (): NightlyServiceState => ({
  playerNightFavorGauge: getNumericRuleValue('initial_player_night_favor_gauge'),
  emperorMood: getNumericRuleValue('initial_emperor_mood'),
  reports: [],
});

export const hasRequiredSaveSections = (value: unknown): boolean =>
  Boolean(
    value &&
      typeof value === 'object' &&
      SAVE_GAME_REQUIRED_SECTIONS.every((section) => Boolean((value as Record<string, unknown>)[section])),
  );

export const hasRequiredSaveProgress = (progress: unknown): boolean =>
  Boolean(
    progress &&
      typeof progress === 'object' &&
      SAVE_GAME_REQUIRED_PROGRESS_KEYS.every((key) => Boolean((progress as Record<string, unknown>)[key])),
  );

export const hasRequiredSaveRelations = (relations: unknown): boolean =>
  Boolean(
    relations &&
      typeof relations === 'object' &&
      SAVE_GAME_REQUIRED_RELATION_KEYS.every((key) => (relations as Record<string, unknown>)[key] !== undefined),
  );
