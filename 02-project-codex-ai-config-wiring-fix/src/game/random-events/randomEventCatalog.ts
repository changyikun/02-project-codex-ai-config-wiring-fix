import randomEventsCsv from './csv/random_events.csv?raw';
import {
  parseNumericCsv,
  parseOptionalNumber,
  parseRequiredNumber,
  splitPipeList,
  type NumericCsvRow,
} from '../numerics/csvNumericLoader';

export type RandomEventRowType = 'event' | 'line' | 'option';
export type RandomEventRepeatPolicy = 'once' | 'repeatable';
export type RandomEventPortraitPlacement = '' | 'stage' | 'dialogue-left';
export type RandomEventVariables = Record<string, string | number | boolean | null | undefined>;

export interface RandomEventPlayerEffect {
  prestige?: number;
  favor?: number;
  stress?: number;
  silver?: number;
  trueHeart?: number;
  stats?: Record<string, number>;
}

export interface RandomEventTargetEffect {
  relationToPlayer?: number;
  prestige?: number;
  favor?: number;
  stress?: number;
  health?: number;
}

export interface RandomEventInventoryDelta {
  itemId: string;
  quantity: number;
}

export interface RandomEventInventoryEffect {
  gain?: RandomEventInventoryDelta[];
  lose?: RandomEventInventoryDelta[];
}

export interface RandomEventEffect {
  player?: RandomEventPlayerEffect;
  target?: RandomEventTargetEffect;
  inventory?: RandomEventInventoryEffect;
}

export interface RandomEventLine {
  eventId: string;
  branchId: string;
  order: number;
  speakerIdentity: string;
  speakerName: string;
  portraitKey: string;
  portraitPlacement: RandomEventPortraitPlacement;
  narrationName: string;
  text: string;
  sceneHint: string;
  effect?: RandomEventEffect;
  unlockEventIds: string[];
  sourceFile: string;
}

export interface RandomEventOption {
  eventId: string;
  branchId: 'start';
  optionId: string;
  optionLabel: string;
  nextBranchId?: string;
  effect?: RandomEventEffect;
  unlockEventIds: string[];
  sourceFile: string;
}

export interface RandomEventBranch {
  branchId: string;
  lines: RandomEventLine[];
  options: RandomEventOption[];
}

export interface RandomEventDefinition {
  eventId: string;
  poolId: string;
  weight: number;
  repeatPolicy: RandomEventRepeatPolicy;
  prerequisiteEventIds: string[];
  branches: Record<string, RandomEventBranch>;
  sourceFile: string;
}

export interface RandomEventCatalog {
  events: Record<string, RandomEventDefinition>;
  eventsByPool: Record<string, string[]>;
  optionLockedEventIds: ReadonlySet<string>;
}

const RANDOM_EVENT_COLUMNS = [
  'eventId',
  'rowType',
  'poolId',
  'weight',
  'repeatPolicy',
  'prerequisiteEventIds',
  'branchId',
  'order',
  'speakerIdentity',
  'speakerName',
  'portraitKey',
  'portraitPlacement',
  'narrationName',
  'text',
  'sceneHint',
  'optionId',
  'optionLabel',
  'nextBranchId',
  'effectJson',
  'unlockEventIds',
  'notes',
] as const;

type RandomEventCsvColumn = (typeof RANDOM_EVENT_COLUMNS)[number];

const REQUIRED_COLUMNS = ['eventId', 'rowType'] as const;
const VALID_ROW_TYPES = new Set<RandomEventRowType>(['event', 'line', 'option']);
const VALID_REPEAT_POLICIES = new Set<RandomEventRepeatPolicy>(['once', 'repeatable']);
const VALID_PORTRAIT_PLACEMENTS = new Set<RandomEventPortraitPlacement>(['', 'stage', 'dialogue-left']);
const PLACEHOLDER_PATTERN = /\{\{([A-Za-z0-9_]+)\}\}/g;
const MULTILINE_COLUMNS = new Set<RandomEventCsvColumn>(['text', 'sceneHint', 'notes']);
const PLAYER_EFFECT_KEYS = new Set<keyof RandomEventPlayerEffect>([
  'prestige',
  'favor',
  'stress',
  'silver',
  'trueHeart',
  'stats',
]);
const TARGET_EFFECT_KEYS = new Set<keyof RandomEventTargetEffect>([
  'relationToPlayer',
  'prestige',
  'favor',
  'stress',
  'health',
]);

interface EventBuildState {
  meta?: {
    eventId: string;
    poolId: string;
    weight: number;
    repeatPolicy: RandomEventRepeatPolicy;
    prerequisiteEventIds: string[];
    sourceFile: string;
  };
  branches: Map<string, RandomEventBranch>;
}

const normalizeTemplateField = (value: string): string => value.replace(/\\n/g, '\n').trim();

const normalizeCsvValue = (column: RandomEventCsvColumn, value: string): string => {
  const trimmed = value.trim();
  return MULTILINE_COLUMNS.has(column) ? normalizeTemplateField(trimmed) : trimmed;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertFiniteDelta = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`random_events effect field "${fieldName}" must be a finite number.`);
  }
  return value;
};

const parseInventoryDeltas = (value: unknown, fieldName: string): RandomEventInventoryDelta[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error(`random_events effect field "${fieldName}" must be an array.`);
  }
  return value.map((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new Error(`random_events effect field "${fieldName}[${index}]" must be an object.`);
    }
    const itemId = entry.itemId;
    const quantity = entry.quantity;
    if (typeof itemId !== 'string' || !itemId.trim()) {
      throw new Error(`random_events effect field "${fieldName}[${index}].itemId" must be a non-empty string.`);
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`random_events effect field "${fieldName}[${index}].quantity" must be a positive integer.`);
    }
    return { itemId: itemId.trim(), quantity };
  });
};

const parsePlayerEffect = (value: unknown): RandomEventPlayerEffect => {
  if (!isPlainObject(value)) {
    throw new Error('random_events effect field "player" must be an object.');
  }
  const effect: RandomEventPlayerEffect = {};
  Object.entries(value).forEach(([key, rawValue]) => {
    if (!PLAYER_EFFECT_KEYS.has(key as keyof RandomEventPlayerEffect)) {
      throw new Error(`random_events effect has unsupported player field "${key}".`);
    }
    if (key === 'stats') {
      if (!isPlainObject(rawValue)) {
        throw new Error('random_events effect field "player.stats" must be an object.');
      }
      effect.stats = Object.fromEntries(
        Object.entries(rawValue).map(([statKey, statValue]) => [
          statKey,
          assertFiniteDelta(statValue, `player.stats.${statKey}`),
        ]),
      );
      return;
    }
    effect[key as Exclude<keyof RandomEventPlayerEffect, 'stats'>] = assertFiniteDelta(rawValue, `player.${key}`);
  });
  return effect;
};

const parseTargetEffect = (value: unknown): RandomEventTargetEffect => {
  if (!isPlainObject(value)) {
    throw new Error('random_events effect field "target" must be an object.');
  }
  const effect: RandomEventTargetEffect = {};
  Object.entries(value).forEach(([key, rawValue]) => {
    if (!TARGET_EFFECT_KEYS.has(key as keyof RandomEventTargetEffect)) {
      throw new Error(`random_events effect has unsupported target field "${key}".`);
    }
    effect[key as keyof RandomEventTargetEffect] = assertFiniteDelta(rawValue, `target.${key}`);
  });
  return effect;
};

export const parseRandomEventEffectJson = (value: string, fieldName = 'effectJson'): RandomEventEffect | undefined => {
  if (!value) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`random_events ${fieldName} must be valid JSON. ${(error as Error).message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`random_events ${fieldName} must be a JSON object.`);
  }

  const effect: RandomEventEffect = {};
  Object.entries(parsed).forEach(([key, rawValue]) => {
    if (key === 'player') {
      effect.player = parsePlayerEffect(rawValue);
      return;
    }
    if (key === 'target') {
      effect.target = parseTargetEffect(rawValue);
      return;
    }
    if (key === 'inventory') {
      if (!isPlainObject(rawValue)) {
        throw new Error('random_events effect field "inventory" must be an object.');
      }
      const unsupportedInventoryKeys = Object.keys(rawValue).filter((inventoryKey) => !['gain', 'lose'].includes(inventoryKey));
      if (unsupportedInventoryKeys.length > 0) {
        throw new Error(`random_events effect has unsupported inventory field "${unsupportedInventoryKeys[0]}".`);
      }
      effect.inventory = {
        gain: parseInventoryDeltas(rawValue.gain, 'inventory.gain'),
        lose: parseInventoryDeltas(rawValue.lose, 'inventory.lose'),
      };
      return;
    }
    throw new Error(`random_events effect has unsupported root field "${key}".`);
  });

  return effect;
};

const getOrCreateBuildState = (buildStates: Map<string, EventBuildState>, eventId: string): EventBuildState => {
  const existing = buildStates.get(eventId);
  if (existing) {
    return existing;
  }
  const created: EventBuildState = { branches: new Map() };
  buildStates.set(eventId, created);
  return created;
};

const getOrCreateBranch = (buildState: EventBuildState, branchId: string): RandomEventBranch => {
  const existing = buildState.branches.get(branchId);
  if (existing) {
    return existing;
  }
  const created: RandomEventBranch = { branchId, lines: [], options: [] };
  buildState.branches.set(branchId, created);
  return created;
};

const parseEventRow = (row: Record<RandomEventCsvColumn, string>, sourceFile: string, buildState: EventBuildState) => {
  if (buildState.meta) {
    throw new Error(`${sourceFile} has duplicate event row for "${row.eventId}".`);
  }
  const poolId = row.poolId;
  if (!poolId) {
    throw new Error(`${sourceFile} event "${row.eventId}" has an empty poolId.`);
  }
  const repeatPolicy = row.repeatPolicy as RandomEventRepeatPolicy;
  if (!VALID_REPEAT_POLICIES.has(repeatPolicy)) {
    throw new Error(`${sourceFile} event "${row.eventId}" has invalid repeatPolicy "${row.repeatPolicy}".`);
  }
  const weight = parseOptionalNumber(row.weight, `${row.eventId}.weight`) ?? 1;
  if (weight <= 0) {
    throw new Error(`${sourceFile} event "${row.eventId}" weight must be greater than 0.`);
  }
  buildState.meta = {
    eventId: row.eventId,
    poolId,
    weight,
    repeatPolicy,
    prerequisiteEventIds: splitPipeList(row.prerequisiteEventIds),
    sourceFile,
  };
};

const parseLineRow = (row: Record<RandomEventCsvColumn, string>, sourceFile: string, buildState: EventBuildState) => {
  const branchId = row.branchId;
  if (!branchId) {
    throw new Error(`${sourceFile} line for "${row.eventId}" has an empty branchId.`);
  }
  if (!row.text) {
    throw new Error(`${sourceFile} line for "${row.eventId}" branch "${branchId}" has an empty text.`);
  }
  const portraitPlacement = row.portraitPlacement as RandomEventPortraitPlacement;
  if (!VALID_PORTRAIT_PLACEMENTS.has(portraitPlacement)) {
    throw new Error(`${sourceFile} line for "${row.eventId}" has invalid portraitPlacement "${row.portraitPlacement}".`);
  }
  const branch = getOrCreateBranch(buildState, branchId);
  branch.lines.push({
    eventId: row.eventId,
    branchId,
    order: parseRequiredNumber(row.order, `${row.eventId}.${branchId}.order`),
    speakerIdentity: row.speakerIdentity,
    speakerName: row.speakerName,
    portraitKey: row.portraitKey,
    portraitPlacement,
    narrationName: row.narrationName,
    text: row.text,
    sceneHint: row.sceneHint,
    effect: parseRandomEventEffectJson(row.effectJson, `${row.eventId}.${branchId}.effectJson`),
    unlockEventIds: splitPipeList(row.unlockEventIds),
    sourceFile,
  });
};

const parseOptionRow = (row: Record<RandomEventCsvColumn, string>, sourceFile: string, buildState: EventBuildState) => {
  if (row.branchId !== 'start') {
    throw new Error(`${sourceFile} option "${row.optionId}" for "${row.eventId}" must be on branchId=start.`);
  }
  if (!row.optionId || !row.optionLabel) {
    throw new Error(`${sourceFile} option row for "${row.eventId}" must include optionId and optionLabel.`);
  }
  const branch = getOrCreateBranch(buildState, 'start');
  branch.options.push({
    eventId: row.eventId,
    branchId: 'start',
    optionId: row.optionId,
    optionLabel: row.optionLabel,
    nextBranchId: row.nextBranchId || undefined,
    effect: parseRandomEventEffectJson(row.effectJson, `${row.eventId}.${row.optionId}.effectJson`),
    unlockEventIds: splitPipeList(row.unlockEventIds),
    sourceFile,
  });
};

const buildRowRecord = (row: NumericCsvRow): Record<RandomEventCsvColumn, string> => {
  const record = {} as Record<RandomEventCsvColumn, string>;
  RANDOM_EVENT_COLUMNS.forEach((column) => {
    record[column] = normalizeCsvValue(column, row[column] ?? '');
  });
  return record;
};

const validateAndBuildCatalog = (buildStates: Map<string, EventBuildState>): RandomEventCatalog => {
  const knownEventIds = new Set(buildStates.keys());
  const events: Record<string, RandomEventDefinition> = {};
  const eventsByPool: Record<string, string[]> = {};
  const optionLockedEventIds = new Set<string>();

  buildStates.forEach((buildState, eventId) => {
    if (!buildState.meta) {
      throw new Error(`random_events has rows for "${eventId}" but no event row.`);
    }

    buildState.meta.prerequisiteEventIds.forEach((prerequisiteId) => {
      if (!knownEventIds.has(prerequisiteId)) {
        throw new Error(`random_events event "${eventId}" references unknown prerequisiteEventId "${prerequisiteId}".`);
      }
    });

    const startBranch = buildState.branches.get('start');
    if (!startBranch || startBranch.lines.length === 0) {
      throw new Error(`random_events event "${eventId}" is missing start branch lines.`);
    }

    const referencedBranches = new Set<string>();
    const optionIds = new Set<string>();
    buildState.branches.forEach((branch) => {
      const lineOrders = new Set<number>();
      branch.lines.forEach((line) => {
        if (lineOrders.has(line.order)) {
          throw new Error(`random_events event "${eventId}" branch "${branch.branchId}" has duplicate line order ${line.order}.`);
        }
        lineOrders.add(line.order);
        line.unlockEventIds.forEach((unlockId) => {
          if (!knownEventIds.has(unlockId)) {
            throw new Error(`random_events event "${eventId}" references unknown unlockEventId "${unlockId}".`);
          }
          optionLockedEventIds.add(unlockId);
        });
      });
      branch.options.forEach((option) => {
        if (optionIds.has(option.optionId)) {
          throw new Error(`random_events event "${eventId}" has duplicate optionId "${option.optionId}".`);
        }
        optionIds.add(option.optionId);
        if (option.nextBranchId) {
          referencedBranches.add(option.nextBranchId);
        }
        option.unlockEventIds.forEach((unlockId) => {
          if (!knownEventIds.has(unlockId)) {
            throw new Error(`random_events event "${eventId}" references unknown unlockEventId "${unlockId}".`);
          }
          optionLockedEventIds.add(unlockId);
        });
      });
    });

    if (startBranch.options.length === 0) {
      const nonStartBranches = [...buildState.branches.keys()].filter((branchId) => branchId !== 'start');
      if (nonStartBranches.length > 0) {
        throw new Error(`random_events event "${eventId}" has non-start branch without options.`);
      }
    }

    buildState.branches.forEach((branch, branchId) => {
      if (branchId !== 'start') {
        if (branch.options.length > 0) {
          throw new Error(`random_events event "${eventId}" result branch "${branchId}" cannot contain options.`);
        }
        if (!referencedBranches.has(branchId)) {
          throw new Error(`random_events event "${eventId}" has orphan branch "${branchId}".`);
        }
      }
    });

    referencedBranches.forEach((branchId) => {
      if (!buildState.branches.has(branchId)) {
        throw new Error(`random_events event "${eventId}" option references missing branch "${branchId}".`);
      }
    });

    const branches = Object.fromEntries(
      [...buildState.branches.entries()].map(([branchId, branch]) => [
        branchId,
        {
          branchId,
          lines: [...branch.lines].sort((left, right) => left.order - right.order),
          options: [...branch.options],
        },
      ]),
    );

    events[eventId] = {
      ...buildState.meta,
      branches,
    };
    eventsByPool[buildState.meta.poolId] = [...(eventsByPool[buildState.meta.poolId] ?? []), eventId];
  });

  return { events, eventsByPool, optionLockedEventIds };
};

export const parseRandomEventCsv = (csvText: string, sourceFile = 'inline.csv'): RandomEventCatalog => {
  const rows = parseNumericCsv(csvText, sourceFile, REQUIRED_COLUMNS);
  const buildStates = new Map<string, EventBuildState>();

  rows.forEach((rawRow) => {
    const row = buildRowRecord(rawRow);
    if (!row.eventId) {
      throw new Error(`${sourceFile} has a row with empty eventId.`);
    }
    const rowType = row.rowType as RandomEventRowType;
    if (!VALID_ROW_TYPES.has(rowType)) {
      throw new Error(`${sourceFile} event "${row.eventId}" has invalid rowType "${row.rowType}".`);
    }
    const buildState = getOrCreateBuildState(buildStates, row.eventId);
    if (rowType === 'event') {
      parseEventRow(row, sourceFile, buildState);
      return;
    }
    if (rowType === 'line') {
      parseLineRow(row, sourceFile, buildState);
      return;
    }
    parseOptionRow(row, sourceFile, buildState);
  });

  return validateAndBuildCatalog(buildStates);
};

export const loadRandomEventCatalog = (sources: Record<string, string>): RandomEventCatalog => {
  const mergedBuildStates = new Map<string, EventBuildState>();
  Object.entries(sources).forEach(([sourceFile, csvText]) => {
    const catalog = parseRandomEventCsv(csvText, sourceFile);
    Object.entries(catalog.events).forEach(([eventId, event]) => {
      if (mergedBuildStates.has(eventId)) {
        throw new Error(`Duplicate random event id "${eventId}".`);
      }
      const buildState: EventBuildState = {
        meta: {
          eventId: event.eventId,
          poolId: event.poolId,
          weight: event.weight,
          repeatPolicy: event.repeatPolicy,
          prerequisiteEventIds: event.prerequisiteEventIds,
          sourceFile: event.sourceFile,
        },
        branches: new Map(Object.entries(event.branches).map(([branchId, branch]) => [branchId, { ...branch }])),
      };
      mergedBuildStates.set(eventId, buildState);
    });
  });
  return validateAndBuildCatalog(mergedBuildStates);
};

export const randomEventCatalog = loadRandomEventCatalog({
  'random_events.csv': randomEventsCsv,
});

export const getRandomEvent = (eventId: string, catalog: RandomEventCatalog = randomEventCatalog): RandomEventDefinition => {
  const event = catalog.events[eventId];
  if (!event) {
    throw new Error(`Unknown random event "${eventId}".`);
  }
  return event;
};

export const renderRandomEventTemplate = (template: string, variables: RandomEventVariables = {}): string =>
  template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? match : String(value);
  });

export const renderRandomEventLine = (line: RandomEventLine, variables: RandomEventVariables = {}): RandomEventLine => ({
  ...line,
  speakerIdentity: renderRandomEventTemplate(line.speakerIdentity, variables),
  speakerName: renderRandomEventTemplate(line.speakerName, variables),
  portraitKey: renderRandomEventTemplate(line.portraitKey, variables),
  narrationName: renderRandomEventTemplate(line.narrationName, variables),
  text: renderRandomEventTemplate(line.text, variables),
  sceneHint: renderRandomEventTemplate(line.sceneHint, variables),
});

export const findUnresolvedRandomEventVariables = (text: string): string[] => {
  const unresolved = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    unresolved.add(match[1]);
  }
  return [...unresolved];
};
