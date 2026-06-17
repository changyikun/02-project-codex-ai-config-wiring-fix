import { describe, expect, it } from 'vitest';
import type { EponeClient } from '../../src/clients/eponeClient';
import { readEnv } from '../../src/config/env';
import { ConsortDialogueService } from '../../src/modules/ai/consortDialogueService';
import { RelationMemoryService } from '../../src/modules/memory/relationMemoryService';
import { SessionMemoryService } from '../../src/modules/memory/sessionMemoryService';
import type { ConsortDialogueRequest, ConsortDialogueResponse } from '../../src/types/contracts';

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
  topic: 'action',
  actionId: 'greet',
  actionLabel: '问好',
  actionResult: '你先以日常问好开了口，局面仍留有缓和余地。',
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

const buildService = (
  completeJson: () => Promise<ConsortDialogueResponse>,
  relationMemoryService?: RelationMemoryService,
): ConsortDialogueService => {
  const fakeClient = {
    completeJson: async <T>() => completeJson() as Promise<T>,
  } as unknown as EponeClient;

  return new ConsortDialogueService(
    { ...readEnv(), narrativeModel: 'fake-dialogue-model' },
    fakeClient,
    new SessionMemoryService(),
    relationMemoryService,
  );
};

describe('ConsortDialogueService', () => {
  it('把 AI 生成的无选项问句兜底转成可回应分支', async () => {
    const service = buildService(async () => ({
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '贵妃',
      speakerName: '姚铃儿',
      text: '姚铃儿将茶盏一转，忽而抬眼问：“娘娘今日这样问我，是想听真话，还是想看我如何回避？”',
      sceneHint: '她把话递了回来。',
      options: [],
      memoryCandidates: [],
      affectHints: [],
    }));

    const response = await service.generate(basePayload);

    expect(response.mode).toBe('branch');
    expect(response.options.length).toBeGreaterThan(0);
  });

  it('把没有问号但明显索要表态的台词也兜底转成分支', async () => {
    const service = buildService(async () => ({
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '贵妃',
      speakerName: '姚铃儿',
      text: '姚铃儿将杯沿轻轻一按，只抬眼望着你道：“娘娘若真有心来试我，便给妾一句准话。”',
      sceneHint: '她把话压到了你面前。',
      options: [],
      memoryCandidates: [],
      affectHints: [],
    }));

    const response = await service.generate({
      ...basePayload,
      requestId: 'test-request-indirect-question',
    });

    expect(response.mode).toBe('branch');
    expect(response.options.length).toBeGreaterThan(0);
  });

  it('会把送礼与 AI 候选整理成结构化 relationCandidates', async () => {
    const relationMemoryService = new RelationMemoryService();
    const service = buildService(async () => ({
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '贵妃',
      speakerName: '姚铃儿',
      text: '姚铃儿接过香囊，指尖在穗线上轻轻一拂，像是把那一点惊讶也按了下去：“娘娘这份心，妾会记着。”',
      sceneHint: '她把情绪压得很轻。',
      options: [],
      memoryCandidates: [
        {
          scope: 'relation',
          type: 'preference',
          summary: '姚铃儿对能显体面的礼物会格外记在心上。',
          importance: 'medium',
          confidence: 0.72,
          source: 'ai',
          status: 'candidate',
        },
      ],
      affectHints: [],
    }), relationMemoryService);

    const response = await service.generate({
      ...basePayload,
      requestId: 'test-request-gift-candidate',
      actionId: 'gift',
      actionLabel: '送礼',
      giftItemName: '香囊',
      actionResult: '香囊已送出。',
    });

    expect(response.relationCandidates?.length).toBeGreaterThan(0);
    expect(response.relationCandidates?.some((candidate) => candidate.candidateType === 'gift')).toBe(true);
    expect(response.relationCandidates?.some((candidate) => candidate.candidateType === 'preference')).toBe(true);
    expect(response.relationCandidates?.every((candidate) => candidate.scope === 'relation')).toBe(true);
    expect(response.relationCandidates?.every((candidate) => typeof candidate.dedupeKey === 'string' && candidate.dedupeKey.length > 0)).toBe(true);
    expect(response.sessionMemory?.writtenRelationCandidateCount).toBe(response.relationCandidates?.length ?? 0);
    expect(response.relationMemory?.promotedCount).toBe(2);
    expect(response.relationMemory?.promotedEntries.every((entry) => entry.acceptedRule.includes('promote:'))).toBe(true);
    expect(response.relationMemory?.snapshotHighlights.some((entry) => entry.relationType === 'affinity')).toBe(true);

    const snapshot = relationMemoryService.readSnapshot({
      saveId: 'test-save',
      npcId: 'fixed-yao',
      playerId: '谢令仪',
      sceneId: 'consort-audience:fixed-yao',
    });
    expect(snapshot.totalEntryCount).toBe(2);
  });

  it('工具 NPC 不会接受深关系 promise 候选', async () => {
    const service = buildService(async () => ({
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '宫门商贩',
      speakerName: '杜娘',
      text: '杜娘只把账册合拢，笑意仍旧稳当：“闲话可以听，只别把奴家也往深处牵。”',
      sceneHint: '她先把边界说在前头。',
      options: [],
      memoryCandidates: [
        {
          scope: 'relation',
          type: 'promise',
          summary: '杜娘愿意长期为玩家站队。',
          importance: 'high',
          confidence: 0.9,
          source: 'ai',
          status: 'candidate',
        },
        {
          scope: 'relation',
          type: 'boundary',
          summary: '杜娘对闲谈与买卖的边界感很强。',
          importance: 'medium',
          confidence: 0.8,
          source: 'ai',
          status: 'candidate',
        },
      ],
      affectHints: [],
    }));

    const response = await service.generate({
      ...basePayload,
      requestId: 'test-request-tool-npc',
      actionId: 'small-talk',
      actionLabel: '宫门闲谈',
      topic: 'follow-up',
      consortContext: {
        ...basePayload.consortContext,
        id: 'tool_du_niang',
        name: '杜娘',
        rank: '宫门商贩',
        residence: '宫门',
        personality: '中立、精明、市井、守口如瓶、买卖分明、不入情缘',
        summary: '固定商贩 NPC。',
      },
    });

    expect(response.relationCandidates?.some((candidate) => candidate.candidateType === 'promise')).toBe(false);
    expect(response.relationCandidates?.some((candidate) => candidate.candidateType === 'boundary')).toBe(true);
  });

  it('允许 AI 主动终结话题，并统一转成收起动作', async () => {
    const service = buildService(async () => ({
      mode: 'branch',
      phase: 'finish',
      speakerIdentity: '贵妃',
      speakerName: '姚铃儿',
      text: '姚铃儿把茶盏轻轻搁回案上，语气仍旧端得极稳：“娘娘今日问到这里，妾该回的也都回了。再往下说，倒像是彼此都失了分寸，今日便先到这里吧。”',
      sceneHint: '她主动把话题收住。',
      options: [],
      memoryCandidates: [],
      affectHints: [],
    }));

    const response = await service.generate({
      ...basePayload,
      requestId: 'test-request-finish',
    });

    expect(response.mode).toBe('line');
    expect(response.phase).toBe('finish');
    expect(response.options).toEqual([]);
  });

  it('同一 session 接近二十轮后会自动收束话题', async () => {
    let aiCallCount = 0;
    const service = buildService(async () => {
      aiCallCount += 1;
      return {
        mode: 'line',
        phase: 'continue',
        speakerIdentity: '贵妃',
        speakerName: '姚铃儿',
        text: '姚铃儿把话音压得很稳：“娘娘这句话，妾听明白了，只是眼下还不宜说得更深。”',
        sceneHint: '话头仍在延续。',
        options: [],
        memoryCandidates: [],
        affectHints: [],
      } satisfies ConsortDialogueResponse;
    });

    let latest: ConsortDialogueResponse | undefined;
    for (let index = 0; index < 20; index += 1) {
      latest = await service.generate({
        ...basePayload,
        requestId: `test-request-${index}`,
        actionResult: `第 ${index + 1} 轮继续说话。`,
      });
    }

    expect(latest?.phase).toBe('finish');
    expect(latest?.options).toEqual([]);
    expect(latest?.sessionMemory?.totalExchangeCount).toBe(20);
    expect(aiCallCount).toBe(19);
  });

  it('同一 NPC 在不同场景下会共享短期对话记忆', async () => {
    const service = buildService(async () => ({
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '贵妃',
      speakerName: '姚铃儿',
      text: '姚铃儿把话音压得很轻，像是还记得你上一回把话递到哪里。',
      sceneHint: '她接得上前话。',
      options: [],
      memoryCandidates: [],
      affectHints: [],
    }));

    const first = await service.generate({
      ...basePayload,
      requestId: 'cross-scene-first',
      sessionId: 'session-in-palace',
      sceneId: 'consort-audience:fixed-yao',
      actionLabel: '长春宫相见',
      actionResult: '你先在长春宫与她寒暄了两句。',
    });

    const second = await service.generate({
      ...basePayload,
      requestId: 'cross-scene-second',
      sessionId: 'session-in-taiyi',
      sceneId: 'taiyi:fixed-yao',
      actionLabel: '太医院偶遇',
      actionResult: '你又在太医院药廊下撞见了她。',
    });

    expect(first.sessionMemory?.totalExchangeCount).toBe(1);
    expect(second.sessionMemory?.totalExchangeCount).toBe(2);
    expect(second.sessionMemory?.readTurnCount).toBeGreaterThan(0);
    expect(second.sessionMemory?.retrievedRefs.some((ref) => ref.includes('session-memory:turns=2'))).toBe(true);
  });

  it('相同 dedupeKey 的长期关系不会重复写入', async () => {
    const relationMemoryService = new RelationMemoryService();
    const service = buildService(async () => ({
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '贵妃',
      speakerName: '姚铃儿',
      text: '姚铃儿把香囊收进袖中，语气仍旧端着：“既是娘娘的心意，妾自然记得。”',
      sceneHint: '她把这份心意记下了。',
      options: [],
      memoryCandidates: [
        {
          scope: 'relation',
          type: 'preference',
          summary: '姚铃儿会记住这类体面礼物。',
          importance: 'medium',
          confidence: 0.74,
          source: 'ai',
          status: 'candidate',
        },
      ],
      affectHints: [],
    }), relationMemoryService);

    const first = await service.generate({
      ...basePayload,
      requestId: 'duplicate-request',
      actionId: 'gift',
      actionLabel: '送礼',
      giftItemName: '香囊',
      actionResult: '香囊已送出。',
    });

    const second = await service.generate({
      ...basePayload,
      requestId: 'duplicate-request',
      actionId: 'gift',
      actionLabel: '送礼',
      giftItemName: '香囊',
      actionResult: '香囊已送出。',
    });

    expect(first.relationMemory?.promotedCount).toBe(2);
    expect(second.relationMemory?.promotedCount).toBe(0);
    expect(second.relationMemory?.duplicateCount).toBeGreaterThan(0);
    expect(second.relationMemory?.rejectedCandidates.some((candidate) => candidate.reason === 'duplicate_dedupe_key')).toBe(
      true,
    );
    expect(
      relationMemoryService.readSnapshot({
        saveId: 'test-save',
        npcId: 'fixed-yao',
        playerId: '谢令仪',
        sceneId: 'consort-audience:fixed-yao',
      }).totalEntryCount,
    ).toBe(2);
  });
});
