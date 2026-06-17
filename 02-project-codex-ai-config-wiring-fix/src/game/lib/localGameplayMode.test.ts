import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildInitialConcubineRoster } from '../data/concubineRoster';
import { requestConsortLocalDialogue } from './consortDialogueRuntime';
import { requestOpeningLocalDialogue } from './openingDialogueRuntime';
import { requestRelationshipJudgementLocal } from './relationshipJudgeRuntime';
import { requestTempleAmbientLocal } from './templeAmbientRuntime';
import type { ConsortDialogueRequestPayload } from '../../ai/consortDialogueAgent';
import type { OpeningDialogueRequestPayload } from '../../ai/openingDialogueAgent';
import type { RelationshipJudgeRequestPayload } from '../../ai/relationshipJudgeAgent';
import type { PalaceTimeState } from '../types';

const timeContext: PalaceTimeState = {
  year: 1,
  month: 1,
  xun: 1,
  slotIndex: 0,
  slot: '清晨',
  slotProgress: 0,
};

const playerContext = {
  favor: 50,
  stress: 20,
  prestige: 900,
  trueHeart: 30,
  silver: 1000,
  stamina: 10,
  stats: {
    health: 500,
    intrigue: 500,
    appearance: 500,
    temperament: 500,
  },
};

describe('local-only gameplay mode', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('AI should not be called during local-only gameplay');
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('uses local opening dialogue without calling AI', async () => {
    const payload: OpeningDialogueRequestPayload = {
      routeId: 'lanyinxuguo',
      playerName: '谢令仪',
      family: '镇国公嫡女',
      playerTitle: '皇后娘娘',
      residenceName: '椒房殿',
      npcName: '娇娇',
      topic: 'opening-guide',
      turn: 1,
      history: [],
      playerContext: {
        currentRank: '皇后',
        personality: '稳重',
        routeLabel: '兰因絮果',
        ...playerContext,
      },
      npcContext: {
        npcId: 'jiaojiao',
        identity: '贴身宫女',
        publicFace: '谨慎',
        hiddenCore: '护主',
        speechStyle: ['克制'],
        sceneDuty: ['引导'],
      },
      routeContext: {
        playerRoleSummary: '中宫初定。',
        routePressure: '后宫观望。',
        mapFeatureSummary: '先认地图。',
        choiceFocus: '先定章法。',
      },
      timeContext,
    };

    const result = await requestOpeningLocalDialogue(payload);

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.text).toContain('娇娇');
    expect(result.mode).toBe('line');
  });

  it('uses local consort dialogue without calling AI', async () => {
    const consort = buildInitialConcubineRoster('lanyinxuguo')[0];
    const payload: ConsortDialogueRequestPayload = {
      routeId: 'lanyinxuguo',
      playerName: '谢令仪',
      playerRank: '皇后',
      playerResidence: '椒房殿',
      canPunish: true,
      topic: 'action',
      actionId: 'greet',
      actionLabel: '问安',
      history: [],
      recentContext: [],
      playerContext,
      consortContext: {
        id: consort.id,
        name: consort.name,
        rank: consort.rankLabel,
        residence: consort.residence,
        stateLabel: consort.stateLabel,
        personality: consort.personality,
        summary: consort.summary,
        currentGoodwill: consort.stats.relationToPlayer,
        currentAffection: consort.stats.affection,
        emperorFavor: consort.stats.favor,
        stress: consort.stats.stress,
        allies: [],
        rivals: [],
      },
      timeContext,
    };

    const result = await requestConsortLocalDialogue(payload, consort);

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.options).toEqual([]);
  });

  it('uses local relationship judgement without calling AI', async () => {
    const payload: RelationshipJudgeRequestPayload = {
      routeId: 'lanyinxuguo',
      npcId: 'consort-yao',
      sceneType: 'consort-dialogue',
      optionText: '温声再问一句',
      npcProfile: '贵妃，谨慎自持。',
      currentFavor: 20,
      currentAffection: 0,
      recentContext: [],
    };

    const result = await requestRelationshipJudgementLocal(payload, 'friendly');

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.source).toBe('local');
    expect(result.favorDelta).toBe(1);
  });

  it('uses local ambient text without calling AI', async () => {
    const result = await requestTempleAmbientLocal({
      routeId: 'lanyinxuguo',
      playerName: '谢令仪',
      playerRank: '皇后',
      location: '宝华殿',
      action: 'worship',
      timeContext,
      stateHint: 'normal',
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
  });
});
