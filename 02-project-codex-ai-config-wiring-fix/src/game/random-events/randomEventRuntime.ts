import {
  PLAYER_FAVOR_RANGE,
  PLAYER_SILVER_RANGE,
  PLAYER_STRESS_RANGE,
  PRESTIGE_RANGE,
} from '../../config/constants';
import { numericInventoryItems } from '../numerics/numericCatalog';
import type { ConcubineProfile, GameNumericsState, InventoryItem } from '../types';
import type { PermanentNpcRelationshipState } from '../types';
import {
  getRandomEvent,
  randomEventCatalog,
  renderRandomEventEffect,
  renderRandomEventLine,
  type RandomEventCatalog,
  type RandomEventDefinition,
  type RandomEventEffect,
  type RandomEventLine,
  type RandomEventOption,
  type RandomEventVariables,
} from './randomEventCatalog';

export interface RandomEventProgress {
  triggerCounts: Record<string, number>;
  unlockedEventIds: string[];
  pendingUnlocks: RandomEventPendingUnlock[];
}

export interface RandomEventPendingUnlock {
  eventId: string;
  availableFromXunKey: string;
}

export type RandomEventSessionStage = 'lines' | 'options' | 'done';

export interface RandomEventSession {
  eventId: string;
  branchId: string;
  lineIndex: number;
  stage: RandomEventSessionStage;
  variables: RandomEventVariables;
  selectedOptionId?: string;
  appliedLineEffectKeys: string[];
}

export interface RandomEventAdvanceResult {
  session: RandomEventSession;
  line?: RandomEventLine;
  effect?: RandomEventEffect;
  unlockEventIds: string[];
  awaitingOptions: boolean;
  completed: boolean;
}

export interface RandomEventOptionResult {
  session: RandomEventSession;
  option: RandomEventOption;
  effect?: RandomEventEffect;
  unlockEventIds: string[];
  completed: boolean;
}

export interface RandomEventEffectContext {
  player: GameNumericsState;
  targetKind?: 'consort' | 'npc';
  target?: ConcubineProfile;
  npcRelationship?: PermanentNpcRelationshipState;
  inventory?: InventoryItem[];
  itemCatalog?: readonly InventoryItem[];
}

export interface RandomEventEffectResult {
  player: GameNumericsState;
  target?: ConcubineProfile;
  npcRelationship?: PermanentNpcRelationshipState;
  inventory: InventoryItem[];
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const createSeededRandomEventRandom = (seed: string): (() => number) => {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = Math.imul(state + 0x6d2b79f5, 1);
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const addUnique = (values: string[], additions: readonly string[]): string[] => {
  const next = new Set(values);
  additions.forEach((value) => next.add(value));
  return [...next];
};

const cloneProgress = (progress: RandomEventProgress): RandomEventProgress => ({
  triggerCounts: { ...progress.triggerCounts },
  unlockedEventIds: [...progress.unlockedEventIds],
  pendingUnlocks: progress.pendingUnlocks.map((unlock) => ({ ...unlock })),
});

export const createInitialRandomEventProgress = (): RandomEventProgress => ({
  triggerCounts: {},
  unlockedEventIds: [],
  pendingUnlocks: [],
});

const hasTriggered = (progress: RandomEventProgress, eventId: string): boolean => Number(progress.triggerCounts[eventId] ?? 0) > 0;

const isEventEligible = (
  event: RandomEventDefinition,
  progress: RandomEventProgress,
  catalog: RandomEventCatalog,
): boolean => {
  if (event.repeatPolicy === 'once' && hasTriggered(progress, event.eventId)) {
    return false;
  }
  if (catalog.optionLockedEventIds.has(event.eventId) && !progress.unlockedEventIds.includes(event.eventId)) {
    return false;
  }
  return event.prerequisiteEventIds.every((eventId) => hasTriggered(progress, eventId));
};

export const listEligibleRandomEvents = ({
  poolId,
  progress,
  catalog = randomEventCatalog,
}: {
  poolId: string;
  progress: RandomEventProgress;
  catalog?: RandomEventCatalog;
}): RandomEventDefinition[] =>
  (catalog.eventsByPool[poolId] ?? [])
    .map((eventId) => catalog.events[eventId])
    .filter((event): event is RandomEventDefinition => Boolean(event))
    .filter((event) => isEventEligible(event, progress, catalog));

export const listEligibleRandomEventsByPools = ({
  poolIds,
  progress,
  catalog = randomEventCatalog,
}: {
  poolIds: readonly string[];
  progress: RandomEventProgress;
  catalog?: RandomEventCatalog;
}): RandomEventDefinition[] => [
  ...new Map(
    poolIds
      .flatMap((poolId) => listEligibleRandomEvents({ poolId, progress, catalog }))
      .map((event) => [event.eventId, event] as const),
  ).values(),
];

const pickWeightedRandomEvent = (
  eligibleEvents: readonly RandomEventDefinition[],
  random: () => number,
): RandomEventDefinition | undefined => {
  const totalWeight = eligibleEvents.reduce((sum, event) => sum + event.weight, 0);
  if (totalWeight <= 0) {
    return undefined;
  }
  const roll = clamp(random(), 0, 0.999999999) * totalWeight;
  let cursor = 0;
  return eligibleEvents.find((event) => {
    cursor += event.weight;
    return roll < cursor;
  });
};

export const pickRandomEvent = ({
  poolId,
  progress,
  random,
  catalog = randomEventCatalog,
}: {
  poolId: string;
  progress: RandomEventProgress;
  random: () => number;
  catalog?: RandomEventCatalog;
}): RandomEventDefinition | undefined => {
  const eligibleEvents = listEligibleRandomEvents({ poolId, progress, catalog });
  return pickWeightedRandomEvent(eligibleEvents, random);
};

export const pickRandomEventBySeed = ({
  poolId,
  progress,
  seed,
  catalog = randomEventCatalog,
}: {
  poolId: string;
  progress: RandomEventProgress;
  seed: string;
  catalog?: RandomEventCatalog;
}): RandomEventDefinition | undefined =>
  pickRandomEvent({
    poolId,
    progress,
    random: createSeededRandomEventRandom(seed),
    catalog,
  });

export const pickRandomEventFromPoolsBySeed = ({
  poolIds,
  progress,
  seed,
  catalog = randomEventCatalog,
}: {
  poolIds: readonly string[];
  progress: RandomEventProgress;
  seed: string;
  catalog?: RandomEventCatalog;
}): RandomEventDefinition | undefined => {
  const eligibleEvents = listEligibleRandomEventsByPools({ poolIds, progress, catalog });
  return pickWeightedRandomEvent(eligibleEvents, createSeededRandomEventRandom(seed));
};

export const beginRandomEventSession = ({
  eventId,
  variables = {},
  catalog = randomEventCatalog,
}: {
  eventId: string;
  variables?: RandomEventVariables;
  catalog?: RandomEventCatalog;
}): RandomEventSession => {
  const event = getRandomEvent(eventId, catalog);
  if (!event.branches.start) {
    throw new Error(`Random event "${eventId}" is missing start branch.`);
  }
  return {
    eventId,
    branchId: 'start',
    lineIndex: 0,
    stage: 'lines',
    variables,
    appliedLineEffectKeys: [],
  };
};

export const getRandomEventCurrentLine = (
  session: RandomEventSession,
  catalog: RandomEventCatalog = randomEventCatalog,
): RandomEventLine | undefined => {
  if (session.stage !== 'lines') {
    return undefined;
  }
  const branch = getRandomEvent(session.eventId, catalog).branches[session.branchId];
  const line = branch?.lines[session.lineIndex];
  return line ? renderRandomEventLine(line, session.variables) : undefined;
};

export const getRandomEventCurrentOptions = (
  session: RandomEventSession,
  catalog: RandomEventCatalog = randomEventCatalog,
): RandomEventOption[] => {
  if (session.stage !== 'options') {
    return [];
  }
  return getRandomEvent(session.eventId, catalog).branches[session.branchId]?.options ?? [];
};

export const applyRandomEventUnlocks = (
  progress: RandomEventProgress,
  unlockEventIds: readonly string[],
): RandomEventProgress => ({
  ...cloneProgress(progress),
  unlockedEventIds: addUnique(progress.unlockedEventIds, unlockEventIds),
});

export const queueRandomEventUnlocks = (
  progress: RandomEventProgress,
  unlockEventIds: readonly string[],
  availableFromXunKey: string,
): RandomEventProgress => {
  const next = cloneProgress(progress);
  const existingImmediate = new Set(next.unlockedEventIds);
  const existingPending = new Set(next.pendingUnlocks.map((unlock) => unlock.eventId));
  unlockEventIds.forEach((eventId) => {
    if (!eventId || existingImmediate.has(eventId) || existingPending.has(eventId)) {
      return;
    }
    next.pendingUnlocks.push({ eventId, availableFromXunKey });
    existingPending.add(eventId);
  });
  return next;
};

const parseXunKey = (xunKey: string): [number, number, number] => {
  const [year, month, xun] = xunKey.split('-').map((value) => Number(value));
  return [year || 0, month || 0, xun || 0];
};

const compareXunKey = (left: string, right: string): number => {
  const leftParts = parseXunKey(left);
  const rightParts = parseXunKey(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
};

export const releaseAvailableRandomEventUnlocks = (
  progress: RandomEventProgress,
  currentXunKey: string,
): RandomEventProgress => {
  const next = cloneProgress(progress);
  const releasable = next.pendingUnlocks
    .filter((unlock) => compareXunKey(unlock.availableFromXunKey, currentXunKey) <= 0)
    .map((unlock) => unlock.eventId);
  if (releasable.length === 0) {
    return next;
  }
  return {
    ...next,
    unlockedEventIds: addUnique(next.unlockedEventIds, releasable),
    pendingUnlocks: next.pendingUnlocks.filter((unlock) => compareXunKey(unlock.availableFromXunKey, currentXunKey) > 0),
  };
};

const getLineEffectKey = (session: RandomEventSession): string => `${session.branchId}:${session.lineIndex}`;

export const advanceRandomEventLine = (
  session: RandomEventSession,
  catalog: RandomEventCatalog = randomEventCatalog,
): RandomEventAdvanceResult => {
  if (session.stage !== 'lines') {
    return {
      session,
      unlockEventIds: [],
      awaitingOptions: session.stage === 'options',
      completed: session.stage === 'done',
    };
  }

  const event = getRandomEvent(session.eventId, catalog);
  const branch = event.branches[session.branchId];
  const sourceLine = branch?.lines[session.lineIndex];
  if (!branch || !sourceLine) {
    return {
      session: { ...session, stage: 'done' },
      unlockEventIds: [],
      awaitingOptions: false,
      completed: true,
    };
  }

  const effectKey = getLineEffectKey(session);
  const shouldApplyLineEffect = !session.appliedLineEffectKeys.includes(effectKey);
  const nextAppliedLineEffectKeys = shouldApplyLineEffect
    ? [...session.appliedLineEffectKeys, effectKey]
    : session.appliedLineEffectKeys;
  const isLastLine = session.lineIndex >= branch.lines.length - 1;
  const nextStage: RandomEventSessionStage = isLastLine ? (branch.options.length > 0 ? 'options' : 'done') : 'lines';
  const nextSession: RandomEventSession = {
    ...session,
    lineIndex: isLastLine ? session.lineIndex : session.lineIndex + 1,
    stage: nextStage,
    appliedLineEffectKeys: nextAppliedLineEffectKeys,
  };

  return {
    session: nextSession,
    line: renderRandomEventLine(sourceLine, session.variables),
    effect: shouldApplyLineEffect ? renderRandomEventEffect(sourceLine.effect, session.variables) : undefined,
    unlockEventIds: shouldApplyLineEffect ? sourceLine.unlockEventIds : [],
    awaitingOptions: nextStage === 'options',
    completed: nextStage === 'done',
  };
};

export const selectRandomEventOption = (
  session: RandomEventSession,
  optionId: string,
  catalog: RandomEventCatalog = randomEventCatalog,
): RandomEventOptionResult => {
  if (session.stage !== 'options') {
    throw new Error(`Random event "${session.eventId}" is not waiting for options.`);
  }
  const event = getRandomEvent(session.eventId, catalog);
  const option = event.branches.start?.options.find((candidate) => candidate.optionId === optionId);
  if (!option) {
    throw new Error(`Random event "${session.eventId}" has no option "${optionId}".`);
  }
  const nextSession: RandomEventSession = option.nextBranchId
    ? {
        ...session,
        branchId: option.nextBranchId,
        lineIndex: 0,
        stage: 'lines',
        selectedOptionId: option.optionId,
      }
    : {
        ...session,
        stage: 'done',
        selectedOptionId: option.optionId,
      };

  return {
    session: nextSession,
    option,
    effect: renderRandomEventEffect(option.effect, session.variables),
    unlockEventIds: option.unlockEventIds,
    completed: nextSession.stage === 'done',
  };
};

export const completeRandomEvent = (session: RandomEventSession, progress: RandomEventProgress): RandomEventProgress => {
  if (session.stage !== 'done') {
    throw new Error(`Random event "${session.eventId}" cannot be completed before it reaches done stage.`);
  }
  const next = cloneProgress(progress);
  next.triggerCounts[session.eventId] = Number(next.triggerCounts[session.eventId] ?? 0) + 1;
  return next;
};

const buildItemTemplateMap = (itemCatalog: readonly InventoryItem[]): Map<string, InventoryItem> =>
  new Map(itemCatalog.map((item) => [item.itemId, { ...item }]));

const defaultItemCatalog = (): InventoryItem[] =>
  numericInventoryItems.map(({ pools: _pools, tags: _tags, ...item }) => ({
    ...item,
  }));

const applyInventoryEffect = (
  inventory: InventoryItem[],
  effect: NonNullable<RandomEventEffect['inventory']>,
  itemCatalog: readonly InventoryItem[],
): InventoryItem[] => {
  const nextInventory = inventory.map((item) => ({ ...item }));
  const itemTemplates = buildItemTemplateMap(itemCatalog);

  effect.lose?.forEach((delta) => {
    const existingIndex = nextInventory.findIndex((item) => item.itemId === delta.itemId);
    const existing = existingIndex >= 0 ? nextInventory[existingIndex] : undefined;
    if (!existing || existing.quantity < delta.quantity) {
      throw new Error(`Cannot lose inventory item "${delta.itemId}" x${delta.quantity}; not enough quantity.`);
    }
    const nextQuantity = existing.quantity - delta.quantity;
    if (nextQuantity <= 0) {
      nextInventory.splice(existingIndex, 1);
    } else {
      nextInventory[existingIndex] = { ...existing, quantity: nextQuantity };
    }
  });

  effect.gain?.forEach((delta) => {
    const existingIndex = nextInventory.findIndex((item) => item.itemId === delta.itemId);
    if (existingIndex >= 0) {
      const existing = nextInventory[existingIndex];
      nextInventory[existingIndex] = { ...existing, quantity: existing.quantity + delta.quantity };
      return;
    }
    const templateId = delta.templateItemId ?? delta.itemId;
    const template = itemTemplates.get(templateId);
    if (!template) {
      throw new Error(`Cannot gain unknown inventory item "${templateId}".`);
    }
    nextInventory.push({
      ...template,
      itemId: delta.itemId,
      id: delta.itemId,
      description: delta.description ?? template.description,
      metadata: delta.metadata ? { ...(template.metadata ?? {}), ...delta.metadata } : template.metadata,
      quantity: delta.quantity,
    });
  });

  return nextInventory;
};

export const applyRandomEventEffect = (
  effect: RandomEventEffect | undefined,
  context: RandomEventEffectContext,
): RandomEventEffectResult => {
  const inventory = context.inventory ? context.inventory.map((item) => ({ ...item })) : [];
  if (!effect) {
    return {
      player: { ...context.player, stats: { ...context.player.stats }, flags: { ...context.player.flags } },
      target: context.target,
      npcRelationship: context.npcRelationship,
      inventory,
    };
  }

  let player: GameNumericsState = {
    ...context.player,
    stats: { ...context.player.stats },
    flags: { ...context.player.flags },
  };
  let target = context.target ? { ...context.target, stats: { ...context.target.stats } } : undefined;
  let npcRelationship = context.npcRelationship ? { ...context.npcRelationship } : undefined;
  let nextInventory = inventory;

  if (effect.player) {
    player = {
      ...player,
      prestige: clamp(player.prestige + (effect.player.prestige ?? 0), PRESTIGE_RANGE[0], PRESTIGE_RANGE[1]),
      favor: clamp(player.favor + (effect.player.favor ?? 0), PLAYER_FAVOR_RANGE[0], PLAYER_FAVOR_RANGE[1]),
      stress: clamp(player.stress + (effect.player.stress ?? 0), PLAYER_STRESS_RANGE[0], PLAYER_STRESS_RANGE[1]),
      silver: clamp(player.silver + (effect.player.silver ?? 0), PLAYER_SILVER_RANGE[0], PLAYER_SILVER_RANGE[1]),
      trueHeart: player.trueHeart + (effect.player.trueHeart ?? 0),
      stats: {
        ...player.stats,
        ...Object.fromEntries(
          Object.entries(effect.player.stats ?? {}).map(([key, delta]) => [key, Math.max(0, Number(player.stats[key] ?? 0) + delta)]),
        ),
      },
    };
  }

  if (effect.target) {
    if (context.targetKind === 'npc') {
      if (!npcRelationship) {
        throw new Error('Random event target effect requires a permanent NPC relationship context.');
      }
      const unsupportedNpcFields = Object.entries(effect.target).filter(
        ([key, delta]) => key !== 'relationToPlayer' && Number(delta ?? 0) !== 0,
      );
      if (unsupportedNpcFields.length > 0) {
        throw new Error(`Random event NPC target effect does not support "${unsupportedNpcFields[0][0]}".`);
      }
      npcRelationship = {
        ...npcRelationship,
        affinity: clamp(npcRelationship.affinity + (effect.target.relationToPlayer ?? 0), 0, 100),
      };
    } else if (!target) {
      throw new Error('Random event target effect requires a target context.');
    } else {
      target = {
        ...target,
        stats: {
          ...target.stats,
          relationToPlayer: clamp(
            target.stats.relationToPlayer + (effect.target.relationToPlayer ?? 0),
            -100,
            100,
          ),
          prestige: clamp(target.stats.prestige + (effect.target.prestige ?? 0), PRESTIGE_RANGE[0], PRESTIGE_RANGE[1]),
          favor: clamp(target.stats.favor + (effect.target.favor ?? 0), PLAYER_FAVOR_RANGE[0], PLAYER_FAVOR_RANGE[1]),
          stress: clamp(target.stats.stress + (effect.target.stress ?? 0), PLAYER_STRESS_RANGE[0], PLAYER_STRESS_RANGE[1]),
          health: Math.max(0, target.stats.health + (effect.target.health ?? 0)),
        },
      };
    }
  }

  if (effect.inventory) {
    nextInventory = applyInventoryEffect(nextInventory, effect.inventory, context.itemCatalog ?? defaultItemCatalog());
  }

  return { player, target, npcRelationship, inventory: nextInventory };
};
