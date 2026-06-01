import type { DialogueRelationCandidate, LongTermRelationType } from '../../types/contracts';

export const LONG_TERM_RELATION_TYPES: LongTermRelationType[] = ['familiarity', 'trust', 'affinity', 'dependency'];

export interface RelationMemoryKey {
  saveId: string;
  npcId: string;
  playerId: string;
}

export interface RelationMemoryReadKey extends RelationMemoryKey {
  sceneId?: string;
}

export interface RelationMemoryEntry {
  entryId: string;
  saveId: string;
  npcId: string;
  playerId: string;
  sceneId: string;
  relationType: LongTermRelationType;
  candidateType: DialogueRelationCandidate['candidateType'];
  summary: string;
  importance: DialogueRelationCandidate['importance'];
  confidence: number;
  source: DialogueRelationCandidate['source'];
  sourceEventId: string;
  dedupeKey: string;
  reason: string;
  acceptedRule: string;
  promotedAt: string;
}

export interface RelationMemorySnapshot extends RelationMemoryKey {
  totalEntryCount: number;
  sceneEntryCount: number;
  countsByType: Record<LongTermRelationType, number>;
  latestByType: Partial<Record<LongTermRelationType, RelationMemoryEntry>>;
  recentEntries: RelationMemoryEntry[];
  sceneEntries: RelationMemoryEntry[];
  updatedAt?: string;
}

export interface RelationMemoryWriteResult {
  insertedEntries: RelationMemoryEntry[];
  duplicateKeys: string[];
  snapshot: RelationMemorySnapshot;
}
