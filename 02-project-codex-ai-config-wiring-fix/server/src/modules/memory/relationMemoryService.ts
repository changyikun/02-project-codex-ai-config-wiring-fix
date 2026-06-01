import type { ConsortDialogueRequest, LongTermRelationType } from '../../types/contracts';
import { RelationMemoryStore } from './relationMemoryStore';
import type {
  RelationMemoryEntry,
  RelationMemoryKey,
  RelationMemoryReadKey,
  RelationMemorySnapshot,
  RelationMemoryWriteResult,
} from './relationMemoryTypes';
import { LONG_TERM_RELATION_TYPES } from './relationMemoryTypes';

const MAX_SNAPSHOT_RECENT_ENTRIES = 6;

const buildEmptyCounts = (): Record<LongTermRelationType, number> => ({
  familiarity: 0,
  trust: 0,
  affinity: 0,
  dependency: 0,
});

const buildSnapshot = (
  key: RelationMemoryReadKey,
  entries: RelationMemoryEntry[],
): RelationMemorySnapshot => {
  const countsByType = buildEmptyCounts();
  const latestByType: Partial<Record<LongTermRelationType, RelationMemoryEntry>> = {};

  for (const relationType of LONG_TERM_RELATION_TYPES) {
    const typedEntries = entries.filter((entry) => entry.relationType === relationType);
    countsByType[relationType] = typedEntries.length;
    if (typedEntries.length > 0) {
      latestByType[relationType] = typedEntries[typedEntries.length - 1];
    }
  }

  const sceneEntries = key.sceneId ? entries.filter((entry) => entry.sceneId === key.sceneId).slice(-MAX_SNAPSHOT_RECENT_ENTRIES) : [];

  return {
    saveId: key.saveId,
    npcId: key.npcId,
    playerId: key.playerId,
    totalEntryCount: entries.length,
    sceneEntryCount: sceneEntries.length,
    countsByType,
    latestByType,
    recentEntries: entries.slice(-MAX_SNAPSHOT_RECENT_ENTRIES),
    sceneEntries,
    updatedAt: entries[entries.length - 1]?.promotedAt,
  };
};

export const buildRelationMemoryKey = (payload: ConsortDialogueRequest): RelationMemoryKey => ({
  saveId: payload.saveId ?? `local:${payload.routeId}:${payload.playerName}`,
  npcId: payload.consortContext.id,
  playerId: payload.playerName,
});

export class RelationMemoryService {
  constructor(private readonly store = new RelationMemoryStore()) {}

  readSnapshot(key: RelationMemoryReadKey): RelationMemorySnapshot {
    return buildSnapshot(key, this.store.get(key));
  }

  listEntries(key: RelationMemoryReadKey): RelationMemoryEntry[] {
    const entries = this.store.get(key);
    return key.sceneId ? entries.filter((entry) => entry.sceneId === key.sceneId) : entries;
  }

  hasDedupeKey(key: RelationMemoryKey, dedupeKey: string): boolean {
    return this.store.get(key).some((entry) => entry.dedupeKey === dedupeKey);
  }

  appendPromotedEntries(
    key: RelationMemoryReadKey,
    entries: RelationMemoryEntry[],
  ): RelationMemoryWriteResult {
    const existingEntries = this.store.get(key);
    const existingKeys = new Set(existingEntries.map((entry) => entry.dedupeKey));
    const insertedEntries: RelationMemoryEntry[] = [];
    const duplicateKeys: string[] = [];

    for (const entry of entries) {
      if (existingKeys.has(entry.dedupeKey)) {
        duplicateKeys.push(entry.dedupeKey);
        continue;
      }

      existingKeys.add(entry.dedupeKey);
      insertedEntries.push(entry);
    }

    if (insertedEntries.length > 0) {
      this.store.set(key, [...existingEntries, ...insertedEntries]);
    }

    return {
      insertedEntries,
      duplicateKeys,
      snapshot: this.readSnapshot(key),
    };
  }
}
