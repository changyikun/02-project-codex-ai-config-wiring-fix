import { randomUUID } from 'node:crypto';
import type { AuditLogRecord, CharacterState, SnapshotRecord } from './types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface Store {
  characters: Map<string, CharacterState>;
  snapshots: SnapshotRecord[];
  audits: AuditLogRecord[];
}

const deepClone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

export class FoundationRepository {
  private store: Store = {
    characters: new Map<string, CharacterState>(),
    snapshots: [],
    audits: [],
  };

  async transaction<T>(handler: (tx: FoundationRepository) => Promise<T>): Promise<T> {
    const backup: Store = {
      characters: new Map(this.store.characters),
      snapshots: deepClone(this.store.snapshots),
      audits: deepClone(this.store.audits),
    };
    try {
      return await handler(this);
    } catch (error) {
      this.store = backup;
      throw error;
    }
  }

  async upsertCharacter(state: CharacterState): Promise<void> {
    this.store.characters.set(state.characterId, state);
  }

  async getCharacter(characterId: string): Promise<CharacterState | undefined> {
    return this.store.characters.get(characterId);
  }

  async appendSnapshot(record: Omit<SnapshotRecord, 'snapshotId'>): Promise<SnapshotRecord> {
    const snapshot: SnapshotRecord = {
      snapshotId: randomUUID(),
      ...record,
    };
    this.store.snapshots.push(snapshot);
    this.store.snapshots = this.store.snapshots.filter((item) => Date.now() - new Date(item.createdAt).getTime() <= SEVEN_DAYS_MS);
    return snapshot;
  }

  async getSnapshot(snapshotId: string): Promise<SnapshotRecord | undefined> {
    return this.store.snapshots.find((item) => item.snapshotId === snapshotId);
  }

  async appendAudit(record: Omit<AuditLogRecord, 'auditId' | 'createdAt'>): Promise<void> {
    this.store.audits.push({
      auditId: randomUUID(),
      createdAt: new Date().toISOString(),
      ...record,
    });
  }

  async listAudits(characterId: string): Promise<AuditLogRecord[]> {
    return this.store.audits.filter((item) => item.characterId === characterId);
  }
}
