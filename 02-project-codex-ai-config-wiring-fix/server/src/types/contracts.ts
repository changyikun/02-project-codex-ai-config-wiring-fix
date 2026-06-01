export const ERROR_CODES = {
  INVALID_REQUEST: 'AI_4000',
  CALC_TIMEOUT: 'AI_5001',
  CALC_INVALID_JSON: 'AI_5002',
  CALC_ANOMALY_DETECTED: 'AI_5003',
  REDIS_WRITE_FAILED: 'AI_5004',
  NARRATIVE_PENDING: 'AI_6001',
  NARRATIVE_GENERATION_FAILED: 'AI_6002',
  INTERNAL_ERROR: 'AI_9000',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    traceId?: string;
    retryable: boolean;
    details?: unknown;
  };
}

export interface NumericNode {
  key: string;
  value: number;
  description: string;
}

export interface CalcAgentRequest {
  traceId: string;
  action: string;
  player: {
    routeId: string;
    name: string;
    silver: number;
    stamina: number;
    currentRankId: string;
    baseStats: {
      charm: number;
      intellect: number;
      intrigue: number;
      prestige: number;
      favor: number;
      resilience: number;
    };
    skills: Record<string, number>;
    persona: {
      title: string;
      summary: string;
      strengths: string[];
      weaknesses: string[];
    };
  };
  emperor: {
    mood: '疏离' | '审视' | '愉悦' | '偏爱' | '多疑' | '暴怒';
    sincerity: number;
    nightlyInterest: number;
    lastSummonTraceId?: string;
  };
  location: string;
  time: {
    year: number;
    month: number;
    xun: number;
    slotIndex: number;
    slot: string;
  };
  weights?: Record<string, number>;
}

export interface CalcAgentResponse {
  traceId: string;
  success: boolean;
  probability: number;
  deltas: {
    silver: number;
    stamina: number;
    favor: number;
    prestige: number;
  };
  metrics: NumericNode[];
  anomalyDetected: boolean;
  rollbackSuggested: boolean;
  cacheKey: string;
  generatedAt: string;
}

export interface NarrativeAgentResponse {
  traceId: string;
  summary: string;
  lines: Array<{
    speaker: string;
    text: string;
    emotion: string;
  }>;
  referencedMetrics: NumericNode[];
  locale: string;
}

export interface OpeningDialogueRequest {
  routeId: string;
  playerName: string;
  family: string;
  playerTitle: string;
  residenceName: string;
  npcName: string;
  topic: string;
  turn: number;
  selectedOptionId?: string;
  selectedOptionLabel?: string;
  history: Array<{
    speaker: string;
    text: string;
  }>;
  playerContext: {
    currentRank: string;
    personality: string;
    routeLabel?: string;
    favor: number;
    stress: number;
    prestige: number;
    trueHeart: number;
    silver: number;
    stamina: number;
    stats: Record<string, number>;
  };
  npcContext: {
    npcId: string;
    identity: string;
    publicFace: string;
    hiddenCore: string;
    speechStyle: string[];
    sceneDuty: string[];
  };
  routeContext: {
    playerRoleSummary: string;
    routePressure: string;
    mapFeatureSummary: string;
    choiceFocus: string;
  };
  timeContext: {
    year: number;
    month: number;
    xun: number;
    slotIndex: number;
    slot: string;
    slotProgress?: number;
  };
}

export interface DialogueDataEffects {
  silver: number;
  stamina: number;
  favor: number;
  prestige: number;
  stress: number;
  trueHeart: number;
  stats: Record<string, number>;
  flags?: Record<string, boolean>;
}

export interface StoryBranchOption {
  id: string;
  label: string;
  effectHint: string;
  nextTopic?: string;
  hiddenEffects: DialogueDataEffects;
  timeCost: number;
}

export interface OpeningDialogueResponse {
  mode: 'line' | 'branch';
  phase: 'continue' | 'finish';
  speakerIdentity: string;
  speakerName: string;
  text: string;
  nextActionLabel: string;
  timeCost: number;
  dataEffects: DialogueDataEffects;
  options: StoryBranchOption[];
}

export type RelationshipToneTag = 'friendly' | 'flirt' | 'cold' | 'reject' | 'neutral';

export interface DialogueMemoryCandidate {
  scope: 'session' | 'relation';
  type: 'interaction' | 'gift' | 'conflict' | 'promise' | 'preference' | 'boundary';
  summary: string;
  importance: 'low' | 'medium' | 'high';
  confidence: number;
  source: 'ai' | 'system';
  status: 'candidate';
}

export interface DialogueRelationCandidate {
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

export type LongTermRelationType = 'familiarity' | 'trust' | 'affinity' | 'dependency';

export interface DialogueRelationMemoryEntrySummary {
  entryId: string;
  relationType: LongTermRelationType;
  candidateType: DialogueRelationCandidate['candidateType'];
  summary: string;
  sceneId: string;
  sourceEventId: string;
  dedupeKey: string;
  promotedAt: string;
  acceptedRule: string;
}

export interface DialogueRelationPromotionRejectedCandidate {
  dedupeKey: string;
  candidateType: DialogueRelationCandidate['candidateType'];
  reason: string;
}

export interface DialogueRelationMemoryInfo {
  enabled: boolean;
  totalEntryCount: number;
  sceneEntryCount: number;
  snapshotHighlights: Array<{
    relationType: LongTermRelationType;
    summary: string;
  }>;
  reviewedCount: number;
  promotedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  promotedEntries: DialogueRelationMemoryEntrySummary[];
  rejectedCandidates: DialogueRelationPromotionRejectedCandidate[];
}

export interface DialogueAffectHint {
  key: 'trust' | 'affection' | 'tension' | 'suspicion' | 'mood';
  direction: 'up' | 'down' | 'flat';
  reason: string;
  confidence: number;
}

export interface DialogueSessionMemoryInfo {
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

export interface ConsortDialogueOption {
  id: string;
  label: string;
  effectHint: string;
  fallbackToneTag: RelationshipToneTag;
  nextTopic?: string;
}

export interface ConsortDialogueRequest {
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
  timeContext: {
    year: number;
    month: number;
    xun: number;
    slotIndex: number;
    slot: string;
    slotProgress?: number;
  };
}

export interface ConsortDialogueResponse {
  mode: 'line' | 'branch';
  phase: 'continue' | 'finish';
  speakerIdentity: string;
  speakerName: string;
  text: string;
  nextActionLabel: string;
  sceneHint?: string;
  options: ConsortDialogueOption[];
  memoryCandidates?: DialogueMemoryCandidate[];
  relationCandidates?: DialogueRelationCandidate[];
  affectHints?: DialogueAffectHint[];
  sessionMemory?: DialogueSessionMemoryInfo;
  relationMemory?: DialogueRelationMemoryInfo;
}

export interface RelationshipJudgeRequest {
  routeId: string;
  npcId: string;
  sceneType: string;
  optionText: string;
  npcProfile: string;
  currentFavor: number;
  currentAffection: number;
  recentContext: string[];
}

export interface RelationshipJudgeResponse {
  toneTag: RelationshipToneTag;
  favorDelta: number;
  affectionDelta: number;
  reason: string;
  confidence: number;
}

export interface TempleAmbientRequest {
  routeId: string;
  playerName: string;
  playerRank: string;
  location: string;
  action: 'worship' | 'pray' | 'stroll-idle';
  stateHint?: string;
  timeContext: {
    year: number;
    month: number;
    xun: number;
    slotIndex: number;
    slot: string;
    slotProgress?: number;
  };
}

export interface TempleAmbientResponse {
  text: string;
}

export interface TaiyiAmbientRequest {
  routeId: string;
  playerName: string;
  playerRank: string;
  location: string;
  action: 'stroll-idle' | 'consult';
  stateHint?: string;
  timeContext: {
    year: number;
    month: number;
    xun: number;
    slotIndex: number;
    slot: string;
    slotProgress?: number;
  };
}

export interface TaiyiAmbientResponse {
  text: string;
}

export interface MiaoYinAmbientRequest {
  routeId: string;
  playerName: string;
  playerRank: string;
  location: string;
  action: 'listen' | 'stroll-idle' | 'sign-up';
  stateHint?: string;
  timeContext: {
    year: number;
    month: number;
    xun: number;
    slotIndex: number;
    slot: string;
    slotProgress?: number;
  };
}

export interface MiaoYinAmbientResponse {
  text: string;
}

export interface CalcEventPayload {
  traceId: string;
  cacheKey: string;
  generatedAt: string;
}
