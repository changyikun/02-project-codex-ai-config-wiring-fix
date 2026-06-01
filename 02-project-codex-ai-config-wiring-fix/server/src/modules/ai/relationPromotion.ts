import type {
  ConsortDialogueRequest,
  DialogueRelationCandidate,
  DialogueRelationMemoryInfo,
  DialogueRelationMemoryEntrySummary,
  DialogueRelationPromotionRejectedCandidate,
  LongTermRelationType,
} from '../../types/contracts';
import { buildRelationMemoryKey, RelationMemoryService } from '../memory/relationMemoryService';
import type { RelationMemoryEntry } from '../memory/relationMemoryTypes';
import type { SessionMemorySnapshot } from '../memory/sessionMemoryTypes';
import type { PersonaGuard } from './personaGuard';
import { buildRelationSourceEventId } from './relationCandidate';

const MIN_PROMOTION_CONFIDENCE = 0.68;
const MIN_PROMOTION_IMPORTANCE: DialogueRelationCandidate['importance'] = 'medium';

const RELATION_TYPE_MAP: Partial<Record<DialogueRelationCandidate['candidateType'], LongTermRelationType>> = {
  gift: 'affinity',
  preference: 'affinity',
  conflict: 'trust',
  boundary: 'familiarity',
};

const TOOL_ALLOWED_RELATION_TYPES = new Set<DialogueRelationCandidate['candidateType']>(['boundary', 'preference']);

const toSummary = (entry: RelationMemoryEntry): DialogueRelationMemoryEntrySummary => ({
  entryId: entry.entryId,
  relationType: entry.relationType,
  candidateType: entry.candidateType,
  summary: entry.summary,
  sceneId: entry.sceneId,
  sourceEventId: entry.sourceEventId,
  dedupeKey: entry.dedupeKey,
  promotedAt: entry.promotedAt,
  acceptedRule: entry.acceptedRule,
});

const buildHighlights = (entries: RelationMemoryEntry[]): DialogueRelationMemoryInfo['snapshotHighlights'] =>
  entries.slice(-4).map((entry) => ({
    relationType: entry.relationType,
    summary: entry.summary,
  }));

const buildEntryId = (
  saveId: string,
  npcId: string,
  relationType: LongTermRelationType,
  dedupeKey: string,
): string => {
  const normalizedSeed = dedupeKey.replace(/[^a-zA-Z0-9:-]+/g, '-').slice(0, 72);
  return `${saveId}:${npcId}:${relationType}:${normalizedSeed}`;
};

const resolvePromotionRule = (
  candidate: DialogueRelationCandidate,
  relationType: LongTermRelationType,
): string =>
  `promote:${candidate.candidateType}->${relationType};promotable=true;confidence>=${MIN_PROMOTION_CONFIDENCE};importance>=${MIN_PROMOTION_IMPORTANCE};sourceEventId=required`;

const resolveRejectReason = (
  candidate: DialogueRelationCandidate,
  personaGuard: PersonaGuard,
): string | null => {
  if (candidate.promotable !== true) {
    return 'not_promotable';
  }

  if (!candidate.sourceEventId?.trim()) {
    return 'missing_source_event_id';
  }

  if (personaGuard.npcKind === 'tool' && !TOOL_ALLOWED_RELATION_TYPES.has(candidate.candidateType)) {
    return 'tool_npc_rejects_deep_relation';
  }

  if (candidate.confidence < MIN_PROMOTION_CONFIDENCE) {
    return 'confidence_below_threshold';
  }

  if (candidate.importance === 'low') {
    return 'importance_below_threshold';
  }

  if (!RELATION_TYPE_MAP[candidate.candidateType]) {
    return 'unsupported_relation_type';
  }

  return null;
};

const buildRejectedCandidate = (
  candidate: DialogueRelationCandidate,
  reason: string,
): DialogueRelationPromotionRejectedCandidate => ({
  dedupeKey: candidate.dedupeKey,
  candidateType: candidate.candidateType,
  reason,
});

interface ReviewRelationCandidatesInput {
  payload: ConsortDialogueRequest;
  personaGuard: PersonaGuard;
  sessionMemory?: SessionMemorySnapshot;
  relationMemoryService: RelationMemoryService;
}

export const reviewRelationCandidatesForPromotion = ({
  payload,
  personaGuard,
  sessionMemory,
  relationMemoryService,
}: ReviewRelationCandidatesInput): DialogueRelationMemoryInfo => {
  const relationMemoryKey = buildRelationMemoryKey(payload);
  const currentSourceEventId = buildRelationSourceEventId(payload);
  const reviewCandidates = (sessionMemory?.recentRelationCandidates ?? []).filter(
    (candidate) => candidate.sourceEventId === currentSourceEventId,
  );

  const rejectedCandidates: DialogueRelationPromotionRejectedCandidate[] = [];
  const pendingEntries: RelationMemoryEntry[] = [];
  const seenPendingKeys = new Set<string>();

  for (const candidate of reviewCandidates) {
    const rejectReason = resolveRejectReason(candidate, personaGuard);
    if (rejectReason) {
      rejectedCandidates.push(buildRejectedCandidate(candidate, rejectReason));
      continue;
    }

    if (seenPendingKeys.has(candidate.dedupeKey)) {
      rejectedCandidates.push(buildRejectedCandidate(candidate, 'duplicate_dedupe_key'));
      continue;
    }

    seenPendingKeys.add(candidate.dedupeKey);
    const relationType = RELATION_TYPE_MAP[candidate.candidateType] as LongTermRelationType;
    const promotedAt = new Date().toISOString();

    pendingEntries.push({
      entryId: buildEntryId(relationMemoryKey.saveId, relationMemoryKey.npcId, relationType, candidate.dedupeKey),
      saveId: relationMemoryKey.saveId,
      npcId: relationMemoryKey.npcId,
      playerId: relationMemoryKey.playerId,
      sceneId: payload.sceneId ?? `scene:${payload.consortContext.id}`,
      relationType,
      candidateType: candidate.candidateType,
      summary: candidate.summary,
      importance: candidate.importance,
      confidence: candidate.confidence,
      source: candidate.source,
      sourceEventId: candidate.sourceEventId,
      dedupeKey: candidate.dedupeKey,
      reason: candidate.reason,
      acceptedRule: resolvePromotionRule(candidate, relationType),
      promotedAt,
    });
  }

  const writeResult = relationMemoryService.appendPromotedEntries(
    {
      ...relationMemoryKey,
      sceneId: payload.sceneId,
    },
    pendingEntries,
  );

  for (const duplicateKey of writeResult.duplicateKeys) {
    const duplicateCandidate = reviewCandidates.find((candidate) => candidate.dedupeKey === duplicateKey);
    if (!duplicateCandidate) {
      continue;
    }
    rejectedCandidates.push(buildRejectedCandidate(duplicateCandidate, 'duplicate_dedupe_key'));
  }

  const highlightEntries =
    writeResult.snapshot.sceneEntries.length > 0 ? writeResult.snapshot.sceneEntries : writeResult.snapshot.recentEntries;

  return {
    enabled: true,
    totalEntryCount: writeResult.snapshot.totalEntryCount,
    sceneEntryCount: writeResult.snapshot.sceneEntryCount,
    snapshotHighlights: buildHighlights(highlightEntries),
    reviewedCount: reviewCandidates.length,
    promotedCount: writeResult.insertedEntries.length,
    rejectedCount: rejectedCandidates.length,
    duplicateCount: rejectedCandidates.filter((candidate) => candidate.reason === 'duplicate_dedupe_key').length,
    promotedEntries: writeResult.insertedEntries.map(toSummary),
    rejectedCandidates,
  };
};
