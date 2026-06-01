import type { ConsortDialogueRequest, DialogueMemoryCandidate, DialogueRelationCandidate } from '../../types/contracts';
import type { PersonaGuard } from './personaGuard';

const clampConfidence = (value: number): number => Math.max(0, Math.min(1, value));
const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const normalizeSummary = (summary: string): string => summary.replace(/\s+/gu, ' ').trim();
const normalizeForKey = (value: string): string => normalizeSummary(value).replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 72);

export const buildRelationSourceEventId = (payload: ConsortDialogueRequest): string =>
  payload.requestId ??
  `${payload.sceneId ?? `scene:${payload.consortContext.id}`}:${payload.actionId}:${payload.selectedOptionId ?? 'turn'}`;

const mapMemoryTypeToRelationCandidateType = (
  candidateType: DialogueMemoryCandidate['type'],
): DialogueRelationCandidate['candidateType'] => {
  if (candidateType === 'interaction') {
    return 'rapport';
  }
  return candidateType;
};

const allowsRelationCandidateType = (
  personaGuard: PersonaGuard,
  candidateType: DialogueRelationCandidate['candidateType'],
): boolean => {
  if (personaGuard.npcKind === 'tool') {
    return candidateType === 'boundary' || candidateType === 'preference';
  }

  if (personaGuard.npcKind === 'special' && personaGuard.romanceStyle === 'none') {
    return candidateType !== 'promise';
  }

  return true;
};

const isPromotableRelationCandidate = (
  personaGuard: PersonaGuard,
  candidateType: DialogueRelationCandidate['candidateType'],
  importance: DialogueRelationCandidate['importance'],
): boolean => {
  if (!allowsRelationCandidateType(personaGuard, candidateType)) {
    return false;
  }

  if (personaGuard.npcKind === 'tool') {
    return candidateType === 'boundary' || candidateType === 'preference';
  }

  return candidateType !== 'rapport' && importance !== 'low';
};

const createRelationCandidate = (
  payload: ConsortDialogueRequest,
  personaGuard: PersonaGuard,
  input: {
    candidateType: DialogueRelationCandidate['candidateType'];
    summary: string;
    importance: DialogueRelationCandidate['importance'];
    confidence: number;
    source: DialogueRelationCandidate['source'];
    reason: string;
    dedupeSuffix?: string;
  },
): DialogueRelationCandidate | null => {
  const summary = normalizeSummary(input.summary);
  if (!summary || !allowsRelationCandidateType(personaGuard, input.candidateType)) {
    return null;
  }

  const sourceEventId = buildRelationSourceEventId(payload);
  const dedupeSeed = input.dedupeSuffix ? `${input.candidateType}:${input.dedupeSuffix}` : `${input.candidateType}:${summary}`;

  return {
    candidateType: input.candidateType,
    scope: 'relation',
    summary,
    importance: input.importance,
    confidence: clampConfidence(input.confidence),
    source: input.source,
    status: 'candidate',
    sourceEventId,
    promotable: isPromotableRelationCandidate(personaGuard, input.candidateType, input.importance),
    dedupeKey: `${payload.consortContext.id}:${normalizeForKey(dedupeSeed)}`,
    reason: input.reason,
  };
};

export const buildSystemRelationCandidates = (
  payload: ConsortDialogueRequest,
  personaGuard: PersonaGuard,
): DialogueRelationCandidate[] => {
  const npcName = payload.consortContext.name;
  const candidates: Array<DialogueRelationCandidate | null> = [];

  if (payload.actionId === 'gift' && payload.giftItemName) {
    candidates.push(
      createRelationCandidate(payload, personaGuard, {
        candidateType: 'gift',
        summary: `${payload.playerName}向${npcName}送出${payload.giftItemName}。`,
        importance: 'medium',
        confidence: 0.9,
        source: 'system',
        reason: '系统确认本轮发生送礼动作。',
        dedupeSuffix: `gift:${payload.giftItemName}`,
      }),
    );
  }

  if (payload.actionId === 'punish' || payload.actionId === 'quarrel') {
    candidates.push(
      createRelationCandidate(payload, personaGuard, {
        candidateType: 'conflict',
        summary: `${payload.playerName}与${npcName}在${payload.actionLabel}中出现紧张互动。`,
        importance: payload.actionId === 'punish' ? 'high' : 'medium',
        confidence: 0.82,
        source: 'system',
        reason: '系统确认本轮为冲突型互动。',
        dedupeSuffix: `conflict:${payload.actionId}`,
      }),
    );
  }

  if (payload.actionId === 'win-over' && payload.actionResult?.includes('愿与您交好')) {
    candidates.push(
      createRelationCandidate(payload, personaGuard, {
        candidateType: 'promise',
        summary: `${npcName}已对${payload.playerName}释放明确交好信号。`,
        importance: 'high',
        confidence: 0.8,
        source: 'system',
        reason: '系统规则确认拉拢动作得到正向回应。',
        dedupeSuffix: 'promise:win-over-success',
      }),
    );
  }

  if (payload.selectedOptionLabel && personaGuard.npcKind !== 'tool') {
    candidates.push(
      createRelationCandidate(payload, personaGuard, {
        candidateType: 'rapport',
        summary: `${payload.playerName}以“${payload.selectedOptionLabel}”回应${npcName}。`,
        importance: 'low',
        confidence: 0.72,
        source: 'system',
        reason: '系统记录到一次直接关系回应。',
        dedupeSuffix: `rapport:${payload.selectedOptionId ?? payload.selectedOptionLabel}`,
      }),
    );
  }

  return candidates.filter((candidate): candidate is DialogueRelationCandidate => Boolean(candidate));
};

export const normalizeAiRelationCandidates = (
  payload: ConsortDialogueRequest,
  aiMemoryCandidates: unknown[] | undefined,
  personaGuard: PersonaGuard,
): DialogueRelationCandidate[] =>
  (aiMemoryCandidates ?? [])
    .map((candidate) => toRecord(candidate))
    .map((candidate) => {
      if (candidate.scope !== 'relation') {
        return null;
      }

      const rawType = ['interaction', 'gift', 'conflict', 'promise', 'preference', 'boundary'].includes(String(candidate.type))
        ? (candidate.type as DialogueMemoryCandidate['type'])
        : 'interaction';
      const candidateType = mapMemoryTypeToRelationCandidateType(rawType);
      const importance =
        candidate.importance === 'high' || candidate.importance === 'medium' ? candidate.importance : 'low';

      return createRelationCandidate(payload, personaGuard, {
        candidateType,
        summary: String(candidate.summary ?? ''),
        importance,
        confidence: Number(candidate.confidence ?? 0.45),
        source: candidate.source === 'ai' ? 'ai' : 'system',
        reason: 'AI 提取出的关系候选，待后续审批决定是否升格。',
      });
    })
    .filter((candidate): candidate is DialogueRelationCandidate => Boolean(candidate));

export const dedupeRelationCandidates = (
  candidates: DialogueRelationCandidate[],
): DialogueRelationCandidate[] => {
  const deduped = new Map<string, DialogueRelationCandidate>();
  for (const candidate of candidates) {
    deduped.set(candidate.dedupeKey, candidate);
  }
  return Array.from(deduped.values()).slice(-6);
};
