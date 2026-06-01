import { describe, expect, it } from 'vitest';
import { resolvePersonaGuard } from '../../src/modules/ai/personaGuard';
import { reviewRelationCandidatesForPromotion } from '../../src/modules/ai/relationPromotion';
import { RelationMemoryService } from '../../src/modules/memory/relationMemoryService';
import type { SessionMemorySnapshot } from '../../src/modules/memory/sessionMemoryTypes';
import type { ConsortDialogueRequest, DialogueRelationCandidate } from '../../src/types/contracts';

const basePayload: ConsortDialogueRequest = {
  saveId: 'test-save',
  sessionId: 'test-session',
  requestId: 'test-request',
  sceneId: 'consort-audience:fixed-yao',
  routeId: 'lanyinxuguo',
  playerName: '谢令仪',
  playerRank: '皇后',
  playerResidence: '椒房殿',
  playerOpeningTendency: '韬光养晦',
  canPunish: true,
  topic: 'follow-up',
  actionId: 'greet',
  actionLabel: '问好',
  actionResult: '你先以日常问好开了口。',
  history: [],
  recentContext: [],
  playerContext: {
    favor: 50,
    stress: 30,
    prestige: 2500,
    trueHeart: 35,
    silver: 1000,
    stamina: 10,
    stats: { health: 2, intrigue: 2, politics: 0 },
  },
  consortContext: {
    id: 'fixed-yao',
    name: '姚铃儿',
    rank: '贵妃',
    residence: '长春宫主殿',
    stateLabel: '寻常',
    personality: '骄矜、好胜、重脸面、嫉妒、权位',
    summary: '贵妃，十九岁，得宠而高傲，极重体面。',
    currentGoodwill: -20,
    currentAffection: 0,
    emperorFavor: 72,
    stress: 32,
    allies: [],
    rivals: ['玩家'],
  },
  timeContext: { year: 1, month: 1, xun: 1, slotIndex: 1, slot: '上午', slotProgress: 0 },
};

const buildCandidate = (
  overrides?: Partial<DialogueRelationCandidate>,
): DialogueRelationCandidate => ({
  candidateType: 'preference',
  scope: 'relation',
  summary: '她会记住能给自己留体面的礼物。',
  importance: 'medium',
  confidence: 0.8,
  source: 'ai',
  status: 'candidate',
  sourceEventId: 'test-request',
  promotable: true,
  dedupeKey: 'fixed-yao:preference:gift',
  reason: 'AI 提取出的关系候选，待后续审批决定是否升格。',
  ...overrides,
});

const buildSessionMemory = (
  candidates: DialogueRelationCandidate[],
): SessionMemorySnapshot => ({
  saveId: 'test-save',
  sessionId: 'test-session',
  sceneId: 'consort-audience:fixed-yao',
  npcId: 'fixed-yao',
  recentTurns: [],
  recentMemoryCandidates: [],
  recentRelationCandidates: candidates.map((candidate) => ({
    ...candidate,
    createdAt: '2026-05-09T00:00:00.000Z',
  })),
  totalTurnCount: 0,
  totalExchangeCount: 1,
  updatedAt: '2026-05-09T00:00:00.000Z',
});

describe('relation promotion review', () => {
  it('promotable=false 的候选不会升格', () => {
    const relationMemoryService = new RelationMemoryService();
    const payload = basePayload;
    const result = reviewRelationCandidatesForPromotion({
      payload,
      personaGuard: resolvePersonaGuard(payload.consortContext),
      sessionMemory: buildSessionMemory([
        buildCandidate({
          promotable: false,
          dedupeKey: 'fixed-yao:not-promotable',
        }),
      ]),
      relationMemoryService,
    });

    expect(result.promotedCount).toBe(0);
    expect(result.rejectedCandidates).toEqual([
      expect.objectContaining({
        dedupeKey: 'fixed-yao:not-promotable',
        reason: 'not_promotable',
      }),
    ]);
    expect(result.totalEntryCount).toBe(0);
  });

  it('低 confidence / 低 importance 的候选不会升格', () => {
    const relationMemoryService = new RelationMemoryService();
    const payload = basePayload;
    const result = reviewRelationCandidatesForPromotion({
      payload,
      personaGuard: resolvePersonaGuard(payload.consortContext),
      sessionMemory: buildSessionMemory([
        buildCandidate({
          confidence: 0.4,
          dedupeKey: 'fixed-yao:low-confidence',
        }),
        buildCandidate({
          importance: 'low',
          promotable: true,
          dedupeKey: 'fixed-yao:low-importance',
        }),
      ]),
      relationMemoryService,
    });

    expect(result.promotedCount).toBe(0);
    expect(result.rejectedCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dedupeKey: 'fixed-yao:low-confidence', reason: 'confidence_below_threshold' }),
        expect.objectContaining({ dedupeKey: 'fixed-yao:low-importance', reason: 'importance_below_threshold' }),
      ]),
    );
  });

  it('相同 dedupeKey 不会重复写入长期 relation memory', () => {
    const relationMemoryService = new RelationMemoryService();
    const payload = basePayload;
    const sessionMemory = buildSessionMemory([buildCandidate()]);

    const first = reviewRelationCandidatesForPromotion({
      payload,
      personaGuard: resolvePersonaGuard(payload.consortContext),
      sessionMemory,
      relationMemoryService,
    });
    const second = reviewRelationCandidatesForPromotion({
      payload,
      personaGuard: resolvePersonaGuard(payload.consortContext),
      sessionMemory,
      relationMemoryService,
    });

    expect(first.promotedCount).toBe(1);
    expect(second.promotedCount).toBe(0);
    expect(second.duplicateCount).toBe(1);
    expect(second.rejectedCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dedupeKey: 'fixed-yao:preference:gift', reason: 'duplicate_dedupe_key' }),
      ]),
    );
    expect(second.totalEntryCount).toBe(1);
  });

  it('tool NPC 会禁止升格深关系候选', () => {
    const relationMemoryService = new RelationMemoryService();
    const payload: ConsortDialogueRequest = {
      ...basePayload,
      requestId: 'tool-request',
      sceneId: 'gongmen:tool_du_niang',
      consortContext: {
        ...basePayload.consortContext,
        id: 'tool_du_niang',
        name: '杜娘',
        rank: '宫门商贩',
        residence: '宫门',
        personality: '中立、精明、市井、守口如瓶、买卖分明、不入情缘',
        summary: '固定商贩 NPC。',
      },
    };
    const result = reviewRelationCandidatesForPromotion({
      payload,
      personaGuard: resolvePersonaGuard(payload.consortContext),
      sessionMemory: {
        ...buildSessionMemory([
          buildCandidate({
            candidateType: 'promise',
            sourceEventId: 'tool-request',
            dedupeKey: 'tool_du_niang:promise',
          }),
        ]),
        npcId: 'tool_du_niang',
        sceneId: 'gongmen:tool_du_niang',
      },
      relationMemoryService,
    });

    expect(result.promotedCount).toBe(0);
    expect(result.rejectedCandidates).toEqual([
      expect.objectContaining({
        dedupeKey: 'tool_du_niang:promise',
        reason: 'tool_npc_rejects_deep_relation',
      }),
    ]);
  });

  it('符合条件的 candidate 会升格并返回 promotion debug', () => {
    const relationMemoryService = new RelationMemoryService();
    const payload = basePayload;
    const result = reviewRelationCandidatesForPromotion({
      payload,
      personaGuard: resolvePersonaGuard(payload.consortContext),
      sessionMemory: buildSessionMemory([
        buildCandidate({
          candidateType: 'gift',
          dedupeKey: 'fixed-yao:gift:xiangnang',
          summary: '姚铃儿会记得这只香囊是你亲手送的。',
        }),
      ]),
      relationMemoryService,
    });

    expect(result.reviewedCount).toBe(1);
    expect(result.promotedCount).toBe(1);
    expect(result.rejectedCount).toBe(0);
    expect(result.promotedEntries).toEqual([
      expect.objectContaining({
        relationType: 'affinity',
        dedupeKey: 'fixed-yao:gift:xiangnang',
      }),
    ]);
    expect(result.snapshotHighlights).toEqual([
      expect.objectContaining({
        relationType: 'affinity',
        summary: '姚铃儿会记得这只香囊是你亲手送的。',
      }),
    ]);
  });
});
