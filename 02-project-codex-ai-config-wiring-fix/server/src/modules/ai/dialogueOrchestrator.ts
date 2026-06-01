import type {
  ConsortDialogueRequest,
  ConsortDialogueResponse,
  DialogueAffectHint,
  DialogueMemoryCandidate,
} from '../../types/contracts';
import type { RelationMemorySnapshot } from '../memory/relationMemoryTypes';
import type { SessionMemoryDebugInfo, SessionMemoryKey, SessionMemorySnapshot } from '../memory/sessionMemoryTypes';
import {
  buildKnowledgeAccessPolicy,
  buildMinimalWorldSlice,
  buildRelationSnapshotWithMemory,
  buildSessionSlice,
  type DialogueRelationSnapshot,
  type DialogueSessionSlice,
  type KnowledgeAccessPolicy,
  type MinimalWorldSlice,
} from './knowledgeAccessPolicy';
import { resolvePersonaGuard, type PersonaGuard } from './personaGuard';
import { buildSystemRelationCandidates, dedupeRelationCandidates, normalizeAiRelationCandidates } from './relationCandidate';

interface LightweightDialogueContext {
  personaGuard: PersonaGuard;
  knowledgeAccess: KnowledgeAccessPolicy;
  sessionContext: DialogueSessionSlice;
  relationSnapshot: DialogueRelationSnapshot;
  minimalWorldSlice: MinimalWorldSlice;
}

const clampConfidence = (value: number): number => Math.max(0, Math.min(1, value));
const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const normalizeCandidate = (
  candidate: Partial<DialogueMemoryCandidate>,
  fallback: Omit<DialogueMemoryCandidate, 'summary'> & { summary?: string },
): DialogueMemoryCandidate | null => {
  const summary = String(candidate.summary ?? fallback.summary ?? '').trim();
  if (!summary) {
    return null;
  }

  const scope = candidate.scope === 'relation' ? 'relation' : 'session';
  const type = ['interaction', 'gift', 'conflict', 'promise', 'preference', 'boundary'].includes(String(candidate.type))
    ? (candidate.type as DialogueMemoryCandidate['type'])
    : fallback.type;
  const importance =
    candidate.importance === 'high' || candidate.importance === 'medium' ? candidate.importance : fallback.importance;

  return {
    scope,
    type,
    summary,
    importance,
    confidence: clampConfidence(Number(candidate.confidence ?? fallback.confidence)),
    source: candidate.source === 'ai' ? 'ai' : fallback.source,
    status: 'candidate',
  };
};

export const buildSessionMemoryKey = (payload: ConsortDialogueRequest): SessionMemoryKey => {
  const sharedNpcKey = `npc-shared:${payload.consortContext.id}`;
  return {
    saveId: payload.saveId ?? `local:${payload.routeId}:${payload.playerName}`,
    sessionId: `session:${payload.consortContext.id}`,
    sceneId: sharedNpcKey,
    npcId: payload.consortContext.id,
  };
};

export const buildConsortDialogueContext = (
  payload: ConsortDialogueRequest,
  sessionMemory?: SessionMemorySnapshot,
  relationMemory?: RelationMemorySnapshot,
): LightweightDialogueContext => {
  const personaGuard = resolvePersonaGuard(payload.consortContext);
  const relationSnapshot = buildRelationSnapshotWithMemory(payload, relationMemory);
  const knowledgeAccess = buildKnowledgeAccessPolicy(payload, personaGuard);
  const minimalWorldSlice = buildMinimalWorldSlice(payload, personaGuard, knowledgeAccess, relationSnapshot);
  const sessionContext = buildSessionSlice(payload, sessionMemory, minimalWorldSlice.sceneId, minimalWorldSlice.timeLabel);
  if (relationSnapshot.longTermEntryCount > 0) {
    sessionContext.retrievedRefs.push(
      `relation-memory:total=${relationSnapshot.longTermEntryCount};highlights=${relationSnapshot.longTermHighlights.length}`,
    );
  }

  return {
    personaGuard,
    knowledgeAccess,
    sessionContext,
    relationSnapshot,
    minimalWorldSlice,
  };
};

export const buildConsortDialogueAiPayload = (
  payload: ConsortDialogueRequest,
  context: LightweightDialogueContext,
) => ({
  request: {
    saveId: payload.saveId,
    sessionId: payload.sessionId,
    requestId: payload.requestId,
    sceneId: context.minimalWorldSlice.sceneId,
    routeId: payload.routeId,
    topic: payload.topic,
    actionId: payload.actionId,
    actionLabel: payload.actionLabel,
    actionResult: payload.actionResult,
    selectedOptionId: payload.selectedOptionId,
    selectedOptionLabel: payload.selectedOptionLabel,
    giftItemName: payload.giftItemName,
    smearTargetName: payload.smearTargetName,
  },
  player: {
    name: payload.playerName,
    rank: payload.playerRank,
    residence: payload.playerResidence,
    openingTendency: payload.playerOpeningTendency,
    canPunish: payload.canPunish,
    visibleState: {
      favor: payload.playerContext.favor,
      stressBand:
        payload.playerContext.stress >= 80 ? '高压' : payload.playerContext.stress >= 50 ? '有压力' : '尚稳',
      prestige: payload.playerContext.prestige,
      staminaBand:
        payload.playerContext.stamina <= 2 ? '体力很低' : payload.playerContext.stamina <= 5 ? '体力偏低' : '尚可行动',
    },
  },
  npc: {
    ...payload.consortContext,
    relationStage: context.relationSnapshot.relationStage,
  },
  world: context.minimalWorldSlice,
  relation: context.relationSnapshot,
  session: context.sessionContext,
  personaGuard: context.personaGuard,
  knowledgeAccess: context.knowledgeAccess,
});

export const buildConsortDialoguePromptRules = (context: LightweightDialogueContext): string[] => [
  '本次 user payload 已经是裁剪后的对白上下文，不包含全量世界真相；你不得自行补完未提供的秘密事实。',
  `当前 sceneId=${context.minimalWorldSlice.sceneId}，只允许使用 publicFacts、relation、session、personaGuard 中提供的信息。`,
  `当前关系阶段为${context.relationSnapshot.relationStage}；对白亲近程度必须与该阶段一致。`,
  `角色类别：${context.personaGuard.npcKind}。`,
  `角色口吻关键词：${context.personaGuard.speechStyle.join('、')}。`,
  `暧昧风格：${context.personaGuard.romanceStyle}；冲突风格：${context.personaGuard.conflictStyle}；秘密处理方式：${context.personaGuard.secrecyStyle}。`,
  `禁谈主题：${context.personaGuard.tabooTopics.join('、')}。`,
  `知识边界：${context.personaGuard.knowledgeBoundary.join('')}`,
  `允许读取的上下文桶：${context.knowledgeAccess.allowedBuckets.join('、')}。关系读取级别：${context.knowledgeAccess.relationAccess}。`,
  `不得引用以下 fact types：${context.minimalWorldSlice.forbiddenFactTypes.join('、')}。`,
  context.relationSnapshot.longTermEntryCount > 0
    ? `relation.longTermHighlights 中有 ${context.relationSnapshot.longTermHighlights.length} 条已审批的长期关系锚点，只能按这些锚点延续口吻，不得超写。`
    : '当前没有已审批的长期关系锚点，不得假装双方已有更深的长期关系事实。',
  '如需要形成记忆，只能放入 memoryCandidates，且必须写成候选，不得宣称已经入库或已经成为世界事实。',
  'memoryCandidates 仅记录本轮互动中值得后续记住的关系或会话候选；不要写位分、怀孕、案件结论、血脉、主线推进等硬事实候选。',
  'session.recentMemoryCandidates 是短期会话候选停留区，只能帮助你接住最近对话，不能把候选记忆说成长期事实或世界真相。',
  'session.recentRelationCandidates 是审批前关系候选停留区，只能帮助你保持关系连续性，不得把它们说成已经确认的长期关系事实。',
];

export const buildSessionMemoryDebugInfo = (
  previousSessionMemory: SessionMemorySnapshot | undefined,
  sessionMemory: SessionMemorySnapshot | undefined,
  context: LightweightDialogueContext,
  writtenMemoryCandidateCount: number,
  writtenRelationCandidateCount: number,
): SessionMemoryDebugInfo => ({
  enabled: true,
  readTurnCount: previousSessionMemory?.recentTurns.length ?? 0,
  readMemoryCandidateCount: previousSessionMemory?.recentMemoryCandidates.length ?? 0,
  writtenMemoryCandidateCount,
  readRelationCandidateCount: previousSessionMemory?.recentRelationCandidates.length ?? 0,
  writtenRelationCandidateCount,
  totalTurnCount: sessionMemory?.totalTurnCount ?? 0,
  totalExchangeCount: sessionMemory?.totalExchangeCount ?? 0,
  recentTurnCount: sessionMemory?.recentTurns.length ?? 0,
  recentMemoryCandidateCount: sessionMemory?.recentMemoryCandidates.length ?? 0,
  recentRelationCandidateCount: sessionMemory?.recentRelationCandidates.length ?? 0,
  recentSummary: sessionMemory?.recentSummary,
  retrievedRefs: context.sessionContext.retrievedRefs,
});

export const buildSystemMemoryCandidates = (payload: ConsortDialogueRequest): DialogueMemoryCandidate[] => {
  const candidates: DialogueMemoryCandidate[] = [];
  const npcName = payload.consortContext.name;

  if (payload.actionId === 'gift' && payload.giftItemName) {
    candidates.push({
      scope: 'relation',
      type: 'gift',
      summary: `${payload.playerName}向${npcName}送出${payload.giftItemName}。`,
      importance: 'medium',
      confidence: 0.9,
      source: 'system',
      status: 'candidate',
    });
  }

  if (payload.actionId === 'punish' || payload.actionId === 'quarrel') {
    candidates.push({
      scope: 'relation',
      type: 'conflict',
      summary: `${payload.playerName}与${npcName}在${payload.actionLabel}中出现紧张互动。`,
      importance: payload.actionId === 'punish' ? 'high' : 'medium',
      confidence: 0.82,
      source: 'system',
      status: 'candidate',
    });
  }

  if (payload.actionId === 'smear' && payload.smearTargetName) {
    candidates.push({
      scope: 'session',
      type: 'interaction',
      summary: `${payload.playerName}在谈话中把${payload.smearTargetName}带入话题，可能影响${npcName}的立场。`,
      importance: 'medium',
      confidence: 0.72,
      source: 'system',
      status: 'candidate',
    });
  }

  if (payload.selectedOptionLabel) {
    candidates.push({
      scope: 'session',
      type: 'interaction',
      summary: `${payload.playerName}选择以“${payload.selectedOptionLabel}”回应${npcName}。`,
      importance: 'low',
      confidence: 0.75,
      source: 'system',
      status: 'candidate',
    });
  }

  return candidates;
};

export const mergeDialogueMetadata = (
  payload: ConsortDialogueRequest,
  response: ConsortDialogueResponse,
  aiMemoryCandidates: unknown[] | undefined,
  aiAffectHints: unknown[] | undefined,
): ConsortDialogueResponse => {
  const systemCandidates = buildSystemMemoryCandidates(payload);
  const normalizedAiCandidates = (aiMemoryCandidates ?? [])
    .map((candidate) => toRecord(candidate))
    .map((candidate) =>
      normalizeCandidate(candidate, {
        scope: 'session',
        type: 'interaction',
        importance: 'low',
        confidence: 0.45,
        source: 'ai',
        status: 'candidate',
      }),
    )
    .filter((candidate): candidate is DialogueMemoryCandidate => Boolean(candidate));
  const personaGuard = resolvePersonaGuard(payload.consortContext);
  const relationCandidates = dedupeRelationCandidates([
    ...buildSystemRelationCandidates(payload, personaGuard),
    ...normalizeAiRelationCandidates(payload, aiMemoryCandidates, personaGuard),
  ]);

  const affectHints = (aiAffectHints ?? [])
    .map((hint) => toRecord(hint))
    .map((hint) => ({
      key: String(hint.key ?? ''),
      direction: String(hint.direction ?? ''),
      reason: String(hint.reason ?? '').trim(),
      confidence: clampConfidence(Number(hint.confidence ?? 0.45)),
    }))
    .filter((hint): hint is DialogueAffectHint => {
      return (
        ['trust', 'affection', 'tension', 'suspicion', 'mood'].includes(hint.key) &&
        ['up', 'down', 'flat'].includes(hint.direction) &&
        hint.reason.length > 0
      );
    })
    .slice(0, 3);

  return {
    ...response,
    memoryCandidates: [...systemCandidates, ...normalizedAiCandidates].slice(0, 5),
    relationCandidates,
    affectHints,
  };
};
