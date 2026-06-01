import type { DialogueMemoryCandidate } from '../../types/contracts';
import { SessionMemoryStore } from './sessionMemoryStore';
import type {
  SessionMemoryCandidateEntry,
  SessionMemoryKey,
  SessionMemoryRelationCandidateEntry,
  SessionMemorySnapshot,
  SessionMemoryTurn,
  SessionMemoryWriteInput,
} from './sessionMemoryTypes';

const MAX_RECENT_TURNS = 8;
const MAX_RECENT_CANDIDATES = 10;
const MAX_RECENT_RELATION_CANDIDATES = 6;
const MAX_SUMMARY_TURNS = 4;
const MAX_RECENT_SUMMARY_LENGTH = 360;
const MAX_CANDIDATE_SUMMARY_LENGTH = 160;
const SESSION_MEMORY_TTL_MS = 30 * 60 * 1000;

const isPromotableCandidate = (candidate: DialogueMemoryCandidate): boolean =>
  candidate.scope === 'relation' || candidate.importance === 'high';

const buildRecentSummary = (turns: SessionMemoryTurn[]): string | undefined => {
  const recentTurns = turns.slice(-MAX_SUMMARY_TURNS);
  if (recentTurns.length === 0) {
    return undefined;
  }
  return truncateText(recentTurns.map((turn) => `${turn.speaker}：${turn.text}`).join(' / '), MAX_RECENT_SUMMARY_LENGTH);
};

const truncateText = (text: string, maxLength: number): string =>
  text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text;

const isExpired = (snapshot: SessionMemorySnapshot, nowMs = Date.now()): boolean => {
  const updatedAtMs = Date.parse(snapshot.updatedAt);
  return Number.isFinite(updatedAtMs) && nowMs - updatedAtMs > SESSION_MEMORY_TTL_MS;
};

const dedupeRelationCandidates = (
  candidates: SessionMemoryRelationCandidateEntry[],
): SessionMemoryRelationCandidateEntry[] => {
  const deduped = new Map<string, SessionMemoryRelationCandidateEntry>();
  for (const candidate of candidates) {
    deduped.set(candidate.dedupeKey, candidate);
  }
  return Array.from(deduped.values()).slice(-MAX_RECENT_RELATION_CANDIDATES);
};

export class SessionMemoryService {
  constructor(private readonly store = new SessionMemoryStore()) {}

  read(key: SessionMemoryKey): SessionMemorySnapshot | undefined {
    const snapshot = this.store.get(key);
    if (!snapshot) {
      return undefined;
    }

    if (isExpired(snapshot)) {
      this.store.delete(key);
      return undefined;
    }

    return snapshot;
  }

  append(input: SessionMemoryWriteInput): SessionMemorySnapshot {
    const previous = this.read(input);
    const now = new Date().toISOString();
    const nextTurns: SessionMemoryTurn[] = [
      ...(previous?.recentTurns ?? []),
      ...input.turns
        .map((turn) => ({
          ...turn,
          text: turn.text.trim(),
          createdAt: now,
        }))
        .filter((turn) => turn.text.length > 0),
    ].slice(-MAX_RECENT_TURNS);
    const nextCandidates: SessionMemoryCandidateEntry[] = [
      ...(previous?.recentMemoryCandidates ?? []),
      ...input.memoryCandidates.map((candidate) => ({
        ...candidate,
        summary: truncateText(candidate.summary.trim(), MAX_CANDIDATE_SUMMARY_LENGTH),
        requestId: input.requestId,
        createdAt: now,
        promotable: isPromotableCandidate(candidate),
      })),
    ].slice(-MAX_RECENT_CANDIDATES);
    const nextRelationCandidates = dedupeRelationCandidates([
      ...(previous?.recentRelationCandidates ?? []),
      ...input.relationCandidates
        .map((candidate) => ({
          ...candidate,
          summary: truncateText(candidate.summary.trim(), MAX_CANDIDATE_SUMMARY_LENGTH),
          reason: truncateText(candidate.reason.trim(), MAX_CANDIDATE_SUMMARY_LENGTH),
          createdAt: now,
        }))
        .filter((candidate) => candidate.summary.length > 0 && candidate.reason.length > 0),
    ]);

    const snapshot: SessionMemorySnapshot = {
      saveId: input.saveId,
      sessionId: input.sessionId,
      sceneId: input.sceneId,
      npcId: input.npcId,
      recentTurns: nextTurns,
      recentSummary: buildRecentSummary(nextTurns),
      recentMemoryCandidates: nextCandidates,
      recentRelationCandidates: nextRelationCandidates,
      totalTurnCount: (previous?.totalTurnCount ?? previous?.recentTurns.length ?? 0) + input.turns.length,
      totalExchangeCount: (previous?.totalExchangeCount ?? 0) + 1,
      updatedAt: now,
    };

    this.store.set(snapshot);
    return snapshot;
  }
}
