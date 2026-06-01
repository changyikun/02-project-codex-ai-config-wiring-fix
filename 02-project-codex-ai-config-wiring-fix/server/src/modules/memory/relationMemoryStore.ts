import type { RelationMemoryEntry, RelationMemoryKey } from './relationMemoryTypes';

const serializeRelationMemoryKey = (key: RelationMemoryKey): string =>
  [key.saveId, key.npcId, key.playerId].map((part) => encodeURIComponent(part)).join('|');

export class RelationMemoryStore {
  private readonly records = new Map<string, RelationMemoryEntry[]>();

  get(key: RelationMemoryKey): RelationMemoryEntry[] {
    return this.records.get(serializeRelationMemoryKey(key)) ?? [];
  }

  set(key: RelationMemoryKey, entries: RelationMemoryEntry[]): void {
    this.records.set(serializeRelationMemoryKey(key), entries);
  }
}
