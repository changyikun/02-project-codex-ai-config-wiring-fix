import type {
  ConsortDialogueRequest,
  DialogueMemoryCandidate,
  DialogueRelationCandidate,
  LongTermRelationType,
} from '../../types/contracts';
import type { RelationMemorySnapshot } from '../memory/relationMemoryTypes';
import type { SessionMemorySnapshot } from '../memory/sessionMemoryTypes';
import type { PersonaGuard } from './personaGuard';

type FactBucket = 'public_facts' | 'relation_snapshot' | 'session_slice';
type RelationAccessLevel = 'full' | 'limited' | 'minimal';

export interface DialogueRelationSnapshot {
  currentGoodwill: number;
  currentAffection: number;
  relationStage: string;
  alliesWithPlayer: boolean;
  rivalsWithPlayer: boolean;
  longTermEntryCount: number;
  longTermHighlights: Array<{
    relationType: LongTermRelationType;
    summary: string;
  }>;
}

export interface DialogueSessionSlice {
  recentTurns: ConsortDialogueRequest['history'];
  recentSummary: string;
  storedRecentTurns: Array<{
    speaker: string;
    text: string;
  }>;
  totalExchangeCount: number;
  recentMemoryCandidates: Array<{
    summary: string;
    importance: DialogueMemoryCandidate['importance'];
    source: DialogueMemoryCandidate['source'];
    promotable: boolean;
  }>;
  recentRelationCandidates: Array<{
    candidateType: DialogueRelationCandidate['candidateType'];
    summary: string;
    importance: DialogueRelationCandidate['importance'];
    promotable: boolean;
    reason: string;
  }>;
  retrievedRefs: string[];
}

export interface MinimalWorldSlice {
  sceneId: string;
  routeId: string;
  timeLabel: string;
  publicFacts: string[];
  forbiddenFactTypes: string[];
}

export interface KnowledgeAccessPolicy {
  npcId: string;
  npcKind: PersonaGuard['npcKind'];
  allowedBuckets: FactBucket[];
  relationAccess: RelationAccessLevel;
  sessionAccess: 'recent_only';
  forbiddenFactTypes: string[];
}

const BASE_FORBIDDEN_FACT_TYPES = [
  'hidden_true_heart',
  'lineage_secret',
  'case_truth',
  'private_medical',
  'untriggered_route_node',
];

const buildRecentSummary = (history: ConsortDialogueRequest['history']): string => {
  const turns = history.slice(-4);
  if (turns.length === 0) {
    return '本场景刚开始，尚无连续对话摘要。';
  }
  return turns.map((turn) => `${turn.speaker}：${turn.text}`).join(' / ');
};

export const relationStageByValues = (goodwill: number, affection: number): string => {
  if (affection >= 70) return '高倾情';
  if (goodwill >= 60) return '亲近信任';
  if (goodwill >= 10) return '关系平稳';
  if (goodwill <= -30) return '明显敌对';
  return '谨慎试探';
};

export const buildRelationSnapshot = (payload: ConsortDialogueRequest): DialogueRelationSnapshot => ({
  currentGoodwill: payload.consortContext.currentGoodwill,
  currentAffection: payload.consortContext.currentAffection,
  relationStage: relationStageByValues(
    payload.consortContext.currentGoodwill,
    payload.consortContext.currentAffection,
  ),
  alliesWithPlayer: payload.consortContext.allies.includes('玩家'),
  rivalsWithPlayer: payload.consortContext.rivals.includes('玩家'),
  longTermEntryCount: 0,
  longTermHighlights: [],
});

export const buildRelationSnapshotWithMemory = (
  payload: ConsortDialogueRequest,
  relationMemory: RelationMemorySnapshot | undefined,
): DialogueRelationSnapshot => {
  const baseSnapshot = buildRelationSnapshot(payload);
  const highlightEntries =
    relationMemory && relationMemory.sceneEntries.length > 0 ? relationMemory.sceneEntries : relationMemory?.recentEntries ?? [];

  return {
    ...baseSnapshot,
    longTermEntryCount: relationMemory?.totalEntryCount ?? 0,
    longTermHighlights: highlightEntries.slice(-4).map((entry) => ({
      relationType: entry.relationType,
      summary: entry.summary,
    })),
  };
};

export const buildSessionSlice = (
  payload: ConsortDialogueRequest,
  sessionMemory: SessionMemorySnapshot | undefined,
  sceneId: string,
  timeLabel: string,
): DialogueSessionSlice => {
  const liveSummary = buildRecentSummary(payload.history);
  const recentSummary = sessionMemory?.recentSummary
    ? `短存上下文：${sessionMemory.recentSummary} / 当前前端上下文：${liveSummary}`
    : liveSummary;

  return {
    recentTurns: payload.history.slice(-6),
    recentSummary,
    storedRecentTurns: (sessionMemory?.recentTurns ?? []).slice(-4).map((turn) => ({
      speaker: turn.speaker,
      text: turn.text,
    })),
    totalExchangeCount: sessionMemory?.totalExchangeCount ?? 0,
    recentMemoryCandidates: (sessionMemory?.recentMemoryCandidates ?? []).slice(-5).map((candidate) => ({
      summary: candidate.summary,
      importance: candidate.importance,
      source: candidate.source,
      promotable: candidate.promotable,
    })),
    recentRelationCandidates: (sessionMemory?.recentRelationCandidates ?? []).slice(-4).map((candidate) => ({
      candidateType: candidate.candidateType,
      summary: candidate.summary,
      importance: candidate.importance,
      promotable: candidate.promotable,
      reason: candidate.reason,
    })),
    retrievedRefs: [
      `npc:${payload.consortContext.id}`,
      `scene:${sceneId}`,
      `time:${timeLabel}`,
      `session-memory:turns=${sessionMemory?.recentTurns.length ?? 0};candidates=${sessionMemory?.recentMemoryCandidates.length ?? 0};relationCandidates=${sessionMemory?.recentRelationCandidates.length ?? 0};exchanges=${sessionMemory?.totalExchangeCount ?? 0}`,
    ],
  };
};

export const buildKnowledgeAccessPolicy = (
  payload: ConsortDialogueRequest,
  personaGuard: PersonaGuard,
): KnowledgeAccessPolicy => {
  if (personaGuard.npcKind === 'tool') {
    return {
      npcId: payload.consortContext.id,
      npcKind: personaGuard.npcKind,
      allowedBuckets: ['public_facts', 'session_slice', 'relation_snapshot'],
      relationAccess: 'minimal',
      sessionAccess: 'recent_only',
      forbiddenFactTypes: [...BASE_FORBIDDEN_FACT_TYPES, 'trade_inventory_truth', 'romance_route_truth'],
    };
  }

  if (personaGuard.npcKind === 'ambient') {
    return {
      npcId: payload.consortContext.id,
      npcKind: personaGuard.npcKind,
      allowedBuckets: ['public_facts', 'session_slice', 'relation_snapshot'],
      relationAccess: 'limited',
      sessionAccess: 'recent_only',
      forbiddenFactTypes: [...BASE_FORBIDDEN_FACT_TYPES, 'hidden_emperor_truth'],
    };
  }

  if (personaGuard.npcKind === 'special') {
    return {
      npcId: payload.consortContext.id,
      npcKind: personaGuard.npcKind,
      allowedBuckets: ['public_facts', 'session_slice', 'relation_snapshot'],
      relationAccess: 'limited',
      sessionAccess: 'recent_only',
      forbiddenFactTypes: [...BASE_FORBIDDEN_FACT_TYPES, 'hidden_emperor_truth', 'court_inner_truth'],
    };
  }

  return {
    npcId: payload.consortContext.id,
    npcKind: personaGuard.npcKind,
    allowedBuckets: ['public_facts', 'session_slice', 'relation_snapshot'],
    relationAccess: 'full',
    sessionAccess: 'recent_only',
    forbiddenFactTypes: BASE_FORBIDDEN_FACT_TYPES,
  };
};

export const buildMinimalWorldSlice = (
  payload: ConsortDialogueRequest,
  personaGuard: PersonaGuard,
  policy: KnowledgeAccessPolicy,
  relationSnapshot: DialogueRelationSnapshot,
): MinimalWorldSlice => {
  const sceneId = payload.sceneId ?? `consort-dialogue:${payload.consortContext.id}:${payload.actionId}`;
  const timeLabel = `第${payload.timeContext.year}年${payload.timeContext.month}月${payload.timeContext.xun}旬${payload.timeContext.slot}`;
  const publicFacts = [
    `当前场景：${payload.actionLabel}`,
    `当前地点：${payload.consortContext.residence || payload.playerResidence}`,
    `玩家当前身份：${payload.playerRank}`,
    `NPC 当前身份：${payload.consortContext.rank}`,
    `NPC 当前状态：${payload.consortContext.stateLabel}`,
  ];

  if (policy.relationAccess !== 'minimal') {
    publicFacts.push(`双方关系阶段：${relationSnapshot.relationStage}`);
  } else {
    publicFacts.push(`该 NPC 为工具型角色，互动以边界感、见闻和当下分寸为主。`);
  }

  if (personaGuard.npcKind === 'special') {
    publicFacts.push('该角色具备高位压迫感或特殊立场，但仍只能基于已提供上下文回话。');
  }

  return {
    sceneId,
    routeId: payload.routeId,
    timeLabel,
    publicFacts,
    forbiddenFactTypes: policy.forbiddenFactTypes,
  };
};
