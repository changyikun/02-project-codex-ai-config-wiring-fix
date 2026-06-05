import { describe, expect, it } from 'vitest';

import {
  advancePalaceStrifeInvestigations,
  applyPalaceStrifeBribe,
  generateNpcPalaceStrifeCase,
  PLAYER_PALACE_STRIFE_TARGET_ID,
  resolvePalaceStrifeAttempt,
  resolvePalaceStrifeSeverity,
  resolvePalaceStrifeConvictionPenalty,
} from './palaceStrifeRuntime';
import type { ConcubineProfile, GameNumericsState, PalaceStrifeCaseState } from '../types';

const playerState = {
  name: '谢令仪',
  age: 16,
  family: '镇国公嫡女',
  residenceName: '椒房殿',
  pointsTotal: 56,
  pointsLeft: 0,
  routeId: 'lanyinxuguo',
  stamina: 8,
  silver: 1120,
  prestige: 2600,
  stress: 25,
  favor: 60,
  trueHeart: 35,
  stats: {
    intrigue: 7,
    medicine: 5,
  },
  flags: {},
} satisfies GameNumericsState;

const target = {
  id: 'consort-cui',
  portraitId: '崔令蓉',
  name: '崔令蓉',
  rankLabel: '贵人',
  status: 'live',
  residence: '长春宫',
  stateLabel: '安',
  age: 18,
  familyBackground: '清流世家',
  personality: '沉稳',
  summary: '谨慎而敏锐。',
  source: 'fixed',
  stats: {
    prestige: 900,
    favor: 20,
    familyInfluence: 40,
    health: 70,
    appearance: 60,
    relationToPlayer: -10,
    childrenCount: 0,
    ambition: 50,
    stress: 20,
    intrigue: 40,
    temperament: 55,
    affection: 0,
    fortune: 30,
    medicine: 20,
  },
  allies: [],
  rivals: [],
} satisfies ConcubineProfile;

describe('palaceStrifeRuntime', () => {
  it('resolves rumor attempts with action and concealment checks', () => {
    const result = resolvePalaceStrifeAttempt({
      playerState,
      target,
      actionKind: 'rumor',
      methodLabel: '散布流言',
      itemLabel: '不使用',
      allyLabel: '贵人 姚铃儿',
      time: { year: 1, month: 2, xun: 1 },
      rolls: { action: 12, concealment: 88 },
    });

    expect(result.caseState.actionSuccessRate).toBe(52);
    expect(result.caseState.concealmentSuccessRate).toBe(61);
    expect(result.caseState.actionSucceeded).toBe(true);
    expect(result.caseState.concealmentSucceeded).toBe(false);
    expect(result.caseState.status).toBe('investigating');
    expect(result.caseState.investigationXunsElapsed).toBe(0);
    expect(result.caseState.outcome).toBe('pending');
    expect(result.caseState.convictionRate).toBeGreaterThan(0);
  });

  it('maps poison severity from the selected poison item', () => {
    const result = resolvePalaceStrifeAttempt({
      playerState,
      target,
      actionKind: 'poison',
      methodLabel: '下毒',
      itemLabel: '鹤顶红',
      allyLabel: '无',
      time: { year: 1, month: 2, xun: 1 },
      rolls: { action: 5, concealment: 4 },
    });

    expect(result.caseState.severity).toBe('heavy');
    expect(result.caseState.actionSuccessRate).toBe(90);
    expect(result.caseState.concealmentSucceeded).toBe(true);
    expect(result.shouldPersistCase).toBe(false);
  });

  it('maps fixed rumor labels to light, medium, and heavy severity', () => {
    expect(resolvePalaceStrifeSeverity('rumor', '欺凌宫人')).toBe('light');
    expect(resolvePalaceStrifeSeverity('rumor', '奢侈浪费')).toBe('light');
    expect(resolvePalaceStrifeSeverity('rumor', '与人偷情')).toBe('medium');
    expect(resolvePalaceStrifeSeverity('rumor', '意图谋逆')).toBe('heavy');
    expect(resolvePalaceStrifeSeverity('rumor', '不敬先祖')).toBe('heavy');
  });

  it('makes framed strife harder to execute, harder to hide, and riskier if exposed', () => {
    const plain = resolvePalaceStrifeAttempt({
      playerState,
      target,
      actionKind: 'rumor',
      methodLabel: '散布流言',
      itemLabel: '与人偷情',
      allyLabel: '无',
      time: { year: 1, month: 2, xun: 1 },
      rolls: { action: 1, concealment: 99 },
    });
    const framed = resolvePalaceStrifeAttempt({
      playerState,
      target,
      actionKind: 'rumor',
      methodLabel: '散布流言',
      itemLabel: '与人偷情',
      allyLabel: '无',
      framedTargetName: '贵人 姚铃儿',
      time: { year: 1, month: 2, xun: 1 },
      rolls: { action: 1, concealment: 99 },
    });

    expect(framed.caseState.actionSuccessRate).toBe(plain.caseState.actionSuccessRate - 12);
    expect(framed.caseState.concealmentSuccessRate).toBe(plain.caseState.concealmentSuccessRate - 15);
    expect(framed.caseState.convictionRate).toBeGreaterThan(plain.caseState.convictionRate);
    expect(framed.caseState.framedTargetName).toBe('贵人 姚铃儿');
  });

  it('advances investigating cases by severity each xun', () => {
    const [nextCase] = advancePalaceStrifeInvestigations([
      buildCase({ severity: 'light', convictionRate: 35 }),
    ]);

    expect(nextCase.convictionRate).toBe(43);
    expect(nextCase.investigationXunsElapsed).toBe(1);
    expect(nextCase.status).toBe('investigating');
    expect(nextCase.outcome).toBe('pending');
  });

  it('resolves investigations after three xun or when conviction reaches 100', () => {
    const [coldCase] = advancePalaceStrifeInvestigations([
      buildCase({ severity: 'light', convictionRate: 50, investigationXunsElapsed: 2 }),
    ]);
    const [convictedCase] = advancePalaceStrifeInvestigations([
      buildCase({ severity: 'heavy', convictionRate: 90, investigationXunsElapsed: 1 }),
    ]);

    expect(coldCase.status).toBe('resolved');
    expect(coldCase.outcome).toBe('cold_case');
    expect(coldCase.convictionRate).toBe(58);
    expect(convictedCase.status).toBe('resolved');
    expect(convictedCase.outcome).toBe('convicted');
    expect(convictedCase.convictionRate).toBe(100);
  });

  it('reduces conviction rate through bribes without going below zero', () => {
    expect(applyPalaceStrifeBribe(buildCase({ convictionRate: 43 }), 20).convictionRate).toBe(38);
    expect(applyPalaceStrifeBribe(buildCase({ convictionRate: 4 }), 40).convictionRate).toBe(0);
  });

  it('resolves conviction penalties by severity', () => {
    expect(resolvePalaceStrifeConvictionPenalty(buildCase({ severity: 'light' }))).toMatchObject({
      prestigeDelta: -150,
      favorDelta: -3,
      stressDelta: 0,
    });
    expect(resolvePalaceStrifeConvictionPenalty(buildCase({ severity: 'heavy' }))).toMatchObject({
      prestigeDelta: -750,
      favorDelta: -10,
      stressDelta: 10,
    });
  });

  it('generates at most one pending npc palace strife case from high-risk concubines', () => {
    const aggressor = {
      ...target,
      id: 'consort-aggressor',
      name: '姚铃儿',
      rankLabel: '贵妃',
      stats: {
        ...target.stats,
        ambition: 100,
        stress: 95,
        intrigue: 820,
      },
      rivals: ['consort-cui'],
    } satisfies ConcubineProfile;

    const result = generateNpcPalaceStrifeCase({
      concubines: [aggressor, target],
      existingCases: [],
      time: { year: 1, month: 2, xun: 1 },
    });

    expect(result).toMatchObject({
      actorId: 'npc',
      actorConsortId: 'consort-aggressor',
      targetConsortId: 'consort-cui',
      status: 'pending_resolution',
      actionKind: 'rumor',
    });
    expect(result?.summary).toContain('暗流');
  });

  it('allows npc palace strife to target or frame the player', () => {
    const hostileAggressor = {
      ...target,
      id: 'consort-hostile',
      name: '姚铃儿',
      rankLabel: '贵妃',
      stats: {
        ...target.stats,
        ambition: 100,
        stress: 96,
        intrigue: 820,
        relationToPlayer: -80,
      },
      rivals: [],
    } satisfies ConcubineProfile;

    const targeted = generateNpcPalaceStrifeCase({
      concubines: [hostileAggressor, target],
      existingCases: [],
      playerState,
      playerRankLabel: '皇后',
      preferredActorConsortId: hostileAggressor.id,
      preferredTargetConsortId: PLAYER_PALACE_STRIFE_TARGET_ID,
      time: { year: 1, month: 2, xun: 1 },
    });
    const framed = generateNpcPalaceStrifeCase({
      concubines: [hostileAggressor, target],
      existingCases: [],
      playerState,
      playerRankLabel: '皇后',
      preferredActorConsortId: hostileAggressor.id,
      preferredTargetConsortId: target.id,
      time: { year: 1, month: 2, xun: 2 },
    });

    expect(targeted).toMatchObject({
      actorId: 'npc',
      actorConsortId: hostileAggressor.id,
      targetConsortId: PLAYER_PALACE_STRIFE_TARGET_ID,
      targetName: '皇后 谢令仪',
    });
    expect(framed).toMatchObject({
      actorId: 'npc',
      actorConsortId: hostileAggressor.id,
      targetConsortId: target.id,
      framedTargetConsortId: PLAYER_PALACE_STRIFE_TARGET_ID,
      framedTargetName: '皇后 谢令仪',
    });
  });
});

const buildCase = (patch: Partial<PalaceStrifeCaseState> = {}): PalaceStrifeCaseState => ({
  id: 'palace-strife-1',
  xunKey: '1-2-1',
  year: 1,
  month: 2,
  xun: 1,
  actorId: 'player',
  targetConsortId: 'consort-cui',
  targetName: '贵人 崔令蓉',
  actionKind: 'rumor',
  methodLabel: '散布流言',
  itemLabel: '不使用',
  allyLabel: '无',
  severity: 'light',
  actionSuccessRate: 52,
  concealmentSuccessRate: 61,
  actionRoll: 12,
  concealmentRoll: 88,
  actionSucceeded: true,
  concealmentSucceeded: false,
  status: 'investigating',
  outcome: 'pending',
  investigationXunsElapsed: 0,
  convictionRate: 35,
  summary: '流言已起，内廷开始追查源头。',
  ...patch,
});
