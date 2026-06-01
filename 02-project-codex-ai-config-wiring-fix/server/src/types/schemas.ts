import { z } from 'zod';

export const calcAgentRequestSchema = z.object({
  traceId: z.string().min(1),
  action: z.string().min(1),
  player: z.object({
    routeId: z.string().min(1),
    name: z.string().min(1),
    silver: z.number(),
    stamina: z.number(),
    currentRankId: z.string().min(1),
    baseStats: z.object({
      charm: z.number(),
      intellect: z.number(),
      intrigue: z.number(),
      prestige: z.number(),
      favor: z.number(),
      resilience: z.number(),
    }),
    skills: z.record(z.string(), z.number()),
    persona: z.object({
      title: z.string(),
      summary: z.string(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
    }),
  }),
  emperor: z.object({
    mood: z.enum(['疏离', '审视', '愉悦', '偏爱', '多疑', '暴怒']),
    sincerity: z.number(),
    nightlyInterest: z.number(),
    lastSummonTraceId: z.string().optional(),
  }),
  location: z.string().min(1),
  time: z.object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    xun: z.number().int().min(1).max(3),
    slotIndex: z.number().int().min(0).max(6),
    slot: z.string().min(1),
  }),
  weights: z.record(z.string(), z.number()).optional(),
});

export const calcAgentResponseSchema = z.object({
  traceId: z.string(),
  success: z.boolean(),
  probability: z.number(),
  deltas: z.object({
    silver: z.number(),
    stamina: z.number(),
    favor: z.number(),
    prestige: z.number(),
  }),
  metrics: z.array(
    z.object({
      key: z.string(),
      value: z.number(),
      description: z.string(),
    }),
  ),
  anomalyDetected: z.boolean(),
  rollbackSuggested: z.boolean(),
  cacheKey: z.string(),
  generatedAt: z.string(),
});

export const narrativeAgentResponseSchema = z.object({
  traceId: z.string(),
  summary: z.string(),
  lines: z.array(
    z.object({
      speaker: z.string(),
      text: z.string(),
      emotion: z.string(),
    }),
  ),
  referencedMetrics: z.array(
    z.object({
      key: z.string(),
      value: z.number(),
      description: z.string(),
    }),
  ),
  locale: z.string(),
});

export const openingDialogueRequestSchema = z.object({
  routeId: z.string().min(1),
  playerName: z.string().min(1),
  family: z.string().min(1),
  playerTitle: z.string().min(1),
  residenceName: z.string().min(1),
  npcName: z.string().min(1),
  topic: z.string().min(1),
  turn: z.number().int().min(1),
  selectedOptionId: z.string().min(1).optional(),
  selectedOptionLabel: z.string().min(1).optional(),
  history: z.array(
    z.object({
      speaker: z.string().min(1),
      text: z.string().min(1),
    }),
  ),
  playerContext: z.object({
    currentRank: z.string().min(1),
    personality: z.string().min(1),
    routeLabel: z.string().min(1).optional(),
    favor: z.number(),
    stress: z.number(),
    prestige: z.number(),
    trueHeart: z.number(),
    silver: z.number(),
    stamina: z.number(),
    stats: z.record(z.string(), z.number()),
  }),
  npcContext: z.object({
    npcId: z.string().min(1),
    identity: z.string().min(1),
    publicFace: z.string().min(1),
    hiddenCore: z.string().min(1),
    speechStyle: z.array(z.string().min(1)).min(1),
    sceneDuty: z.array(z.string().min(1)).min(1),
  }),
  routeContext: z.object({
    playerRoleSummary: z.string().min(1),
    routePressure: z.string().min(1),
    mapFeatureSummary: z.string().min(1),
    choiceFocus: z.string().min(1),
  }),
  timeContext: z.object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    xun: z.number().int().min(1).max(3),
    slotIndex: z.number().int().min(0).max(6),
    slot: z.string().min(1),
    slotProgress: z.number().min(0).max(1).optional(),
  }),
});

const dialogueDataEffectsSchema = z.object({
  silver: z.number(),
  stamina: z.number(),
  favor: z.number(),
  prestige: z.number(),
  stress: z.number(),
  trueHeart: z.number(),
  stats: z.record(z.string(), z.number()),
  flags: z.record(z.string(), z.boolean()).optional(),
});

export const openingDialogueResponseSchema = z.object({
  mode: z.enum(['line', 'branch']),
  phase: z.enum(['continue', 'finish']),
  speakerIdentity: z.string().min(1),
  speakerName: z.string().min(1),
  text: z.string().min(1),
  nextActionLabel: z.string().min(1),
  timeCost: z.number().min(0).max(1),
  dataEffects: dialogueDataEffectsSchema,
  options: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      effectHint: z.string().min(1),
      nextTopic: z.string().min(1).optional(),
      hiddenEffects: dialogueDataEffectsSchema,
      timeCost: z.number().min(0).max(1),
    }),
  ),
});

const relationshipToneTagSchema = z.enum(['friendly', 'flirt', 'cold', 'reject', 'neutral']);

const dialogueMemoryCandidateSchema = z.object({
  scope: z.enum(['session', 'relation']),
  type: z.enum(['interaction', 'gift', 'conflict', 'promise', 'preference', 'boundary']),
  summary: z.string().min(1),
  importance: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1),
  source: z.enum(['ai', 'system']),
  status: z.literal('candidate'),
});

const dialogueRelationCandidateSchema = z.object({
  candidateType: z.enum(['rapport', 'gift', 'conflict', 'promise', 'preference', 'boundary']),
  scope: z.literal('relation'),
  summary: z.string().min(1),
  importance: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1),
  source: z.enum(['ai', 'system']),
  status: z.literal('candidate'),
  sourceEventId: z.string().min(1),
  promotable: z.boolean(),
  dedupeKey: z.string().min(1),
  reason: z.string().min(1),
});

const dialogueAffectHintSchema = z.object({
  key: z.enum(['trust', 'affection', 'tension', 'suspicion', 'mood']),
  direction: z.enum(['up', 'down', 'flat']),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const dialogueSessionMemoryInfoSchema = z.object({
  enabled: z.boolean(),
  readTurnCount: z.number().int().min(0),
  readMemoryCandidateCount: z.number().int().min(0),
  writtenMemoryCandidateCount: z.number().int().min(0),
  readRelationCandidateCount: z.number().int().min(0),
  writtenRelationCandidateCount: z.number().int().min(0),
  totalTurnCount: z.number().int().min(0),
  totalExchangeCount: z.number().int().min(0),
  recentTurnCount: z.number().int().min(0),
  recentMemoryCandidateCount: z.number().int().min(0),
  recentRelationCandidateCount: z.number().int().min(0),
  recentSummary: z.string().min(1).optional(),
  retrievedRefs: z.array(z.string().min(1)),
});

const longTermRelationTypeSchema = z.enum(['familiarity', 'trust', 'affinity', 'dependency']);

const dialogueRelationMemoryEntrySummarySchema = z.object({
  entryId: z.string().min(1),
  relationType: longTermRelationTypeSchema,
  candidateType: z.enum(['rapport', 'gift', 'conflict', 'promise', 'preference', 'boundary']),
  summary: z.string().min(1),
  sceneId: z.string().min(1),
  sourceEventId: z.string().min(1),
  dedupeKey: z.string().min(1),
  promotedAt: z.string().min(1),
  acceptedRule: z.string().min(1),
});

const dialogueRelationPromotionRejectedCandidateSchema = z.object({
  dedupeKey: z.string().min(1),
  candidateType: z.enum(['rapport', 'gift', 'conflict', 'promise', 'preference', 'boundary']),
  reason: z.string().min(1),
});

const dialogueRelationMemoryInfoSchema = z.object({
  enabled: z.boolean(),
  totalEntryCount: z.number().int().min(0),
  sceneEntryCount: z.number().int().min(0),
  snapshotHighlights: z
    .array(
      z.object({
        relationType: longTermRelationTypeSchema,
        summary: z.string().min(1),
      }),
    )
    .max(4),
  reviewedCount: z.number().int().min(0),
  promotedCount: z.number().int().min(0),
  rejectedCount: z.number().int().min(0),
  duplicateCount: z.number().int().min(0),
  promotedEntries: z.array(dialogueRelationMemoryEntrySummarySchema).max(6),
  rejectedCandidates: z.array(dialogueRelationPromotionRejectedCandidateSchema).max(6),
});

export const consortDialogueRequestSchema = z.object({
  saveId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  requestId: z.string().min(1).optional(),
  sceneId: z.string().min(1).optional(),
  strictAi: z.boolean().optional(),
  routeId: z.string().min(1),
  playerName: z.string().min(1),
  playerRank: z.string().min(1),
  playerResidence: z.string().min(1),
  playerOpeningTendency: z.string().min(1).optional(),
  canPunish: z.boolean(),
  topic: z.enum(['visit', 'action', 'follow-up']),
  actionId: z.string().min(1),
  actionLabel: z.string().min(1),
  actionResult: z.string().min(1).optional(),
  selectedOptionId: z.string().min(1).optional(),
  selectedOptionLabel: z.string().min(1).optional(),
  giftItemName: z.string().min(1).optional(),
  smearTargetName: z.string().min(1).optional(),
  history: z.array(
    z.object({
      speaker: z.string().min(1),
      text: z.string().min(1),
    }),
  ),
  recentContext: z.array(z.string().min(1)),
  playerContext: z.object({
    favor: z.number(),
    stress: z.number(),
    prestige: z.number(),
    trueHeart: z.number(),
    silver: z.number(),
    stamina: z.number(),
    stats: z.record(z.string(), z.number()),
  }),
  consortContext: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    rank: z.string().min(1),
    residence: z.string().min(1),
    stateLabel: z.string().min(1),
    personality: z.string().min(1),
    summary: z.string().min(1),
    currentGoodwill: z.number(),
    currentAffection: z.number(),
    emperorFavor: z.number(),
    stress: z.number(),
    allies: z.array(z.string().min(1)),
    rivals: z.array(z.string().min(1)),
  }),
  timeContext: z.object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    xun: z.number().int().min(1).max(3),
    slotIndex: z.number().int().min(0).max(6),
    slot: z.string().min(1),
    slotProgress: z.number().min(0).max(1).optional(),
  }),
});

const consortDialogueOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  effectHint: z.string().min(1),
  fallbackToneTag: relationshipToneTagSchema,
  nextTopic: z.string().min(1).optional(),
});

export const consortDialogueResponseSchema = z.object({
  mode: z.enum(['line', 'branch']),
  phase: z.enum(['continue', 'finish']),
  speakerIdentity: z.string().min(1),
  speakerName: z.string().min(1),
  text: z.string().min(1),
  nextActionLabel: z.string().min(1),
  sceneHint: z.string().min(1).optional(),
  options: z.array(consortDialogueOptionSchema).max(3),
  memoryCandidates: z.array(z.unknown()).max(5).optional(),
  relationCandidates: z.array(dialogueRelationCandidateSchema).max(6).optional(),
  affectHints: z.array(z.unknown()).max(3).optional(),
  sessionMemory: dialogueSessionMemoryInfoSchema.optional(),
  relationMemory: dialogueRelationMemoryInfoSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.phase === 'continue' && value.mode === 'branch' && value.options.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'branch 模式至少需要 1 个推进选项。',
    });
  }

  if (value.phase === 'continue' && value.mode === 'line' && value.options.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'line 模式不应附带分支选项。',
    });
  }
});

export const relationshipJudgeRequestSchema = z.object({
  routeId: z.string().min(1),
  npcId: z.string().min(1),
  sceneType: z.string().min(1),
  optionText: z.string().min(1),
  npcProfile: z.string().min(1),
  currentFavor: z.number(),
  currentAffection: z.number(),
  recentContext: z.array(z.string().min(1)),
});

export const relationshipJudgeResponseSchema = z.object({
  toneTag: relationshipToneTagSchema,
  favorDelta: z.number().int().min(-1).max(1),
  affectionDelta: z.number().int().min(-1).max(1),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const templeAmbientRequestSchema = z.object({
  routeId: z.string().min(1),
  playerName: z.string().min(1),
  playerRank: z.string().min(1),
  location: z.string().min(1),
  action: z.enum(['worship', 'pray', 'stroll-idle']),
  stateHint: z.string().min(1).optional(),
  timeContext: z.object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    xun: z.number().int().min(1).max(3),
    slotIndex: z.number().int().min(0).max(6),
    slot: z.string().min(1),
    slotProgress: z.number().min(0).max(1).optional(),
  }),
});

export const templeAmbientResponseSchema = z.object({
  text: z.string().min(1),
});

export const taiyiAmbientRequestSchema = z.object({
  routeId: z.string().min(1),
  playerName: z.string().min(1),
  playerRank: z.string().min(1),
  location: z.string().min(1),
  action: z.enum(['stroll-idle', 'consult']),
  stateHint: z.string().min(1).optional(),
  timeContext: z.object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    xun: z.number().int().min(1).max(3),
    slotIndex: z.number().int().min(0).max(6),
    slot: z.string().min(1),
    slotProgress: z.number().min(0).max(1).optional(),
  }),
});

export const taiyiAmbientResponseSchema = z.object({
  text: z.string().min(1),
});

export const miaoyinAmbientRequestSchema = z.object({
  routeId: z.string().min(1),
  playerName: z.string().min(1),
  playerRank: z.string().min(1),
  location: z.string().min(1),
  action: z.enum(['listen', 'stroll-idle', 'sign-up']),
  stateHint: z.string().min(1).optional(),
  timeContext: z.object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    xun: z.number().int().min(1).max(3),
    slotIndex: z.number().int().min(0).max(6),
    slot: z.string().min(1),
    slotProgress: z.number().min(0).max(1).optional(),
  }),
});

export const miaoyinAmbientResponseSchema = z.object({
  text: z.string().min(1),
});
