import { describe, expect, it } from 'vitest';
import { buildKnowledgeAccessPolicy, buildRelationSnapshot } from '../../src/modules/ai/knowledgeAccessPolicy';
import { resolvePersonaGuard } from '../../src/modules/ai/personaGuard';
import type { ConsortDialogueRequest } from '../../src/types/contracts';

const buildPayload = (overrides?: Partial<ConsortDialogueRequest['consortContext']>): ConsortDialogueRequest => ({
  saveId: 'test-save',
  sessionId: 'test-session',
  requestId: 'test-request',
  sceneId: 'test-scene',
  routeId: 'lanyinxuguo',
  playerName: '谢令仪',
  playerRank: '皇后',
  playerResidence: '椒房殿',
  playerOpeningTendency: '韬光养晦',
  canPunish: false,
  topic: 'follow-up',
  actionId: 'small-talk',
  actionLabel: '闲谈',
  history: [],
  recentContext: [],
  playerContext: {
    favor: 50,
    stress: 30,
    prestige: 2500,
    trueHeart: 35,
    silver: 1000,
    stamina: 8,
    stats: { health: 2, intrigue: 2, politics: 0 },
  },
  consortContext: {
    id: 'tool_du_niang',
    name: '杜娘',
    rank: '宫门商贩',
    residence: '宫门',
    stateLabel: '照常在宫门做买卖',
    personality: '中立、精明、市井、守口如瓶、买卖分明、不入情缘',
    summary: '固定商贩 NPC。',
    currentGoodwill: 10,
    currentAffection: 0,
    emperorFavor: 0,
    stress: 0,
    allies: [],
    rivals: [],
    ...overrides,
  },
  timeContext: { year: 1, month: 1, xun: 1, slotIndex: 1, slot: '上午', slotProgress: 0 },
});

describe('dialogue policy helpers', () => {
  it('会把杜娘识别为 tool persona guard', () => {
    const payload = buildPayload();
    const guard = resolvePersonaGuard(payload.consortContext);

    expect(guard.npcKind).toBe('tool');
    expect(guard.romanceStyle).toBe('none');
    expect(guard.tabooTopics).toContain('深度情缘承诺');
  });

  it('tool NPC 的 knowledge access 只给最小关系访问级别', () => {
    const payload = buildPayload();
    const guard = resolvePersonaGuard(payload.consortContext);
    const relationSnapshot = buildRelationSnapshot(payload);
    const policy = buildKnowledgeAccessPolicy(payload, guard);

    expect(relationSnapshot.relationStage).toBe('关系平稳');
    expect(policy.npcKind).toBe('tool');
    expect(policy.relationAccess).toBe('minimal');
    expect(policy.forbiddenFactTypes).toContain('trade_inventory_truth');
    expect(policy.allowedBuckets).toEqual(['public_facts', 'session_slice', 'relation_snapshot']);
  });
});
