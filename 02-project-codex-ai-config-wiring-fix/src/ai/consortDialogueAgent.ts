import type { PalaceTimeState } from '../game/types';
import type { RelationshipToneTag } from '../game/types';
import { buildApiUrl } from './apiBaseUrl';

const CONSORT_DIALOGUE_TIMEOUT_MS_PROD = 6000;
const CONSORT_DIALOGUE_TIMEOUT_MS_TEST = 80;

export const CONSORT_DIALOGUE_TIMEOUT_MS = import.meta.env?.VITEST
  ? CONSORT_DIALOGUE_TIMEOUT_MS_TEST
  : CONSORT_DIALOGUE_TIMEOUT_MS_PROD;

export interface ConsortDialogueRequestPayload {
  saveId?: string;
  sessionId?: string;
  requestId?: string;
  sceneId?: string;
  strictAi?: boolean;
  routeId: string;
  playerName: string;
  playerRank: string;
  playerResidence: string;
  playerOpeningTendency?: string;
  canPunish: boolean;
  topic: 'visit' | 'action' | 'follow-up';
  actionId: string;
  actionLabel: string;
  actionResult?: string;
  selectedOptionId?: string;
  selectedOptionLabel?: string;
  giftItemName?: string;
  smearTargetName?: string;
  history: Array<{
    speaker: string;
    text: string;
  }>;
  recentContext: string[];
  playerContext: {
    favor: number;
    stress: number;
    prestige: number;
    trueHeart: number;
    silver: number;
    stamina: number;
    stats: Record<string, number>;
  };
  consortContext: {
    id: string;
    name: string;
    rank: string;
    residence: string;
    stateLabel: string;
    personality: string;
    summary: string;
    currentGoodwill: number;
    currentAffection: number;
    emperorFavor: number;
    stress: number;
    allies: string[];
    rivals: string[];
  };
  timeContext: PalaceTimeState;
}

export interface ConsortDialogueOptionPayload {
  id: string;
  label: string;
  effectHint: string;
  localToneTag: RelationshipToneTag;
  nextTopic?: string;
}

export interface DialogueMemoryCandidatePayload {
  scope: 'session' | 'relation';
  type: 'interaction' | 'gift' | 'conflict' | 'promise' | 'preference' | 'boundary';
  summary: string;
  importance: 'low' | 'medium' | 'high';
  confidence: number;
  source: 'ai' | 'system';
  status: 'candidate';
}

export interface DialogueRelationCandidatePayload {
  candidateType: 'rapport' | 'gift' | 'conflict' | 'promise' | 'preference' | 'boundary';
  scope: 'relation';
  summary: string;
  importance: 'low' | 'medium' | 'high';
  confidence: number;
  source: 'ai' | 'system';
  status: 'candidate';
  sourceEventId: string;
  promotable: boolean;
  dedupeKey: string;
  reason: string;
}

export type LongTermRelationTypePayload = 'familiarity' | 'trust' | 'affinity' | 'dependency';

export interface DialogueRelationMemoryEntrySummaryPayload {
  entryId: string;
  relationType: LongTermRelationTypePayload;
  candidateType: DialogueRelationCandidatePayload['candidateType'];
  summary: string;
  sceneId: string;
  sourceEventId: string;
  dedupeKey: string;
  promotedAt: string;
  acceptedRule: string;
}

export interface DialogueRelationPromotionRejectedCandidatePayload {
  dedupeKey: string;
  candidateType: DialogueRelationCandidatePayload['candidateType'];
  reason: string;
}

export interface DialogueRelationMemoryInfoPayload {
  enabled: boolean;
  totalEntryCount: number;
  sceneEntryCount: number;
  snapshotHighlights: Array<{
    relationType: LongTermRelationTypePayload;
    summary: string;
  }>;
  reviewedCount: number;
  promotedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  promotedEntries: DialogueRelationMemoryEntrySummaryPayload[];
  rejectedCandidates: DialogueRelationPromotionRejectedCandidatePayload[];
}

export interface DialogueAffectHintPayload {
  key: 'trust' | 'affection' | 'tension' | 'suspicion' | 'mood';
  direction: 'up' | 'down' | 'flat';
  reason: string;
  confidence: number;
}

export interface DialogueSessionMemoryInfoPayload {
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

export interface ConsortDialogueResponsePayload {
  mode: 'line' | 'branch';
  phase: 'continue' | 'finish';
  speakerIdentity: string;
  speakerName: string;
  text: string;
  sceneHint?: string;
  options: ConsortDialogueOptionPayload[];
  memoryCandidates?: DialogueMemoryCandidatePayload[];
  relationCandidates?: DialogueRelationCandidatePayload[];
  affectHints?: DialogueAffectHintPayload[];
  sessionMemory?: DialogueSessionMemoryInfoPayload;
  relationMemory?: DialogueRelationMemoryInfoPayload;
}

interface RequestConsortDialogueOptions {
  timeoutMs?: number | null;
}

export const requestConsortDialogue = async (
  payload: ConsortDialogueRequestPayload,
  options: RequestConsortDialogueOptions = {},
): Promise<ConsortDialogueResponsePayload> => {
  const timeoutMs = options.timeoutMs === undefined ? CONSORT_DIALOGUE_TIMEOUT_MS : options.timeoutMs;
  const controller = timeoutMs === null ? undefined : new AbortController();
  const timeoutId =
    controller && typeof timeoutMs === 'number' && timeoutMs > 0
      ? globalThis.setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  const response = await fetch(buildApiUrl('/api/v1/ai/consort-dialogue'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: controller?.signal,
  }).finally(() => {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
  });

  if (!response.ok) {
    throw new Error(`妃嫔对话 AI 调用失败: ${response.status}`);
  }

  return response.json() as Promise<ConsortDialogueResponsePayload>;
};
