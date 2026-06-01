import type { SessionMemoryKey, SessionMemorySnapshot } from './sessionMemoryTypes';

const serializeSessionMemoryKey = (key: SessionMemoryKey): string =>
  [key.saveId, key.sessionId, key.sceneId, key.npcId].map((part) => encodeURIComponent(part)).join('|');

export class SessionMemoryStore {
  private readonly records = new Map<string, SessionMemorySnapshot>();

  get(key: SessionMemoryKey): SessionMemorySnapshot | undefined {
    return this.records.get(serializeSessionMemoryKey(key));
  }

  set(snapshot: SessionMemorySnapshot): void {
    this.records.set(serializeSessionMemoryKey(snapshot), snapshot);
  }

  delete(key: SessionMemoryKey): void {
    this.records.delete(serializeSessionMemoryKey(key));
  }
}
