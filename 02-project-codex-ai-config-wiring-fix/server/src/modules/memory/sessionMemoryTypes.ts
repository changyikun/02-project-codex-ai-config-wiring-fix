import type { DialogueMemoryCandidate, DialogueRelationCandidate } from '../../types/contracts';

export interface SessionMemoryKey {
  saveId: string;
  sessionId: string;
  sceneId: string;
  npcId: string;
}

export interface SessionMemoryTurn {
  speaker: string;
  text: string;
  source: 'player' | 'npc' | 'system';
  requestId?: string;
  createdAt: string;
}

export interface SessionMemoryCandidateEntry extends DialogueMemoryCandidate {
  requestId?: string;
  createdAt: string;
  promotable: boolean;
}

export interface SessionMemoryRelationCandidateEntry extends DialogueRelationCandidate {
  createdAt: string;
}

export interface SessionMemorySnapshot extends SessionMemoryKey {
  recentTurns: SessionMemoryTurn[];
  recentSummary?: string;
  recentMemoryCandidates: SessionMemoryCandidateEntry[];
  recentRelationCandidates: SessionMemoryRelationCandidateEntry[];
  totalTurnCount: number;
  totalExchangeCount: number;
  updatedAt: string;
}

export interface SessionMemoryWriteInput extends SessionMemoryKey {
  requestId?: string;
  turns: Array<Omit<SessionMemoryTurn, 'createdAt'>>;
  memoryCandidates: DialogueMemoryCandidate[];
  relationCandidates: DialogueRelationCandidate[];
}

export interface SessionMemoryDebugInfo {
  enabled: boolean;
  readTurnCount: number;
  readMemoryCandidateCount: number;
  writtenMemoryCandidateCount: number;
  readRelationCandidateCount: number;
  writtenRelationCandidateCount: number;
  totalTurnCount: number;
  totalExchangeCount: number;
  recentTurnCount: number;
  recentMemoryCandidateCount: number;
  recentRelationCandidateCount: number;
  recentSummary?: string;
  retrievedRefs: string[];
}
