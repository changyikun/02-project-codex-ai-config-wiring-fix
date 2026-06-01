import { describe, expect, it } from 'vitest';

import { buildInitialConcubineRoster } from '../data/concubineRoster';
import { resolveNightlyService, resolvePlayerNightlyServiceEvent } from './nightlyServiceRuntime';

describe('nightly service runtime', () => {
  it('prioritizes the player with the service gauge and resets the gauge after serving', () => {
    const result = resolveNightlyService({
      routeId: 'lanyinxuguo',
      timeKey: '1-1-1',
      player: {
        name: '谢令仪',
        favor: 50,
        trueHeart: 35,
        rankLabel: '皇后',
        pregnant: false,
      },
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      emperorMood: 40,
      playerNightFavorGauge: 100,
      rolls: {
        alone: 100,
        player: 1,
        pool: 1,
        interest: 80,
        pregnancy: 100,
      },
    });

    expect(result.outcome).toBe('player-service');
    expect(result.nextPlayerNightFavorGauge).toBe(0);
    expect(result.effects.playerFavorDelta).toBeGreaterThan(0);
    expect(result.effects.playerTrueHeartDelta).toBeGreaterThan(0);
    expect(result.lines.join(' ')).toContain('养心殿召娘娘侍寝');
  });

  it('raises the player service gauge when the emperor sleeps alone', () => {
    const result = resolveNightlyService({
      routeId: 'lanyinxuguo',
      timeKey: '1-1-1',
      player: {
        name: '谢令仪',
        favor: 50,
        trueHeart: 35,
        rankLabel: '皇后',
        pregnant: false,
      },
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      emperorMood: -60,
      playerNightFavorGauge: 8,
      rolls: {
        alone: 1,
        player: 1,
        pool: 1,
        interest: 20,
        pregnancy: 100,
      },
    });

    expect(result.outcome).toBe('emperor-alone');
    expect(result.nextPlayerNightFavorGauge).toBe(10);
    expect(result.effects.playerFavorDelta).toBe(0);
    expect(result.lines.join(' ')).toContain('皇帝独寝');
  });

  it('defers player service into a pending Yangxin event without applying settlement effects', () => {
    const result = resolveNightlyService({
      routeId: 'lanyinxuguo',
      timeKey: '1-1-1',
      player: {
        name: '谢令仪',
        favor: 50,
        trueHeart: 35,
        rankLabel: '嫔',
        pregnant: false,
      },
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      emperorMood: 40,
      playerNightFavorGauge: 100,
      deferPlayerService: true,
      rolls: {
        alone: 100,
        player: 1,
        pool: 1,
        interest: 20,
        pregnancy: 100,
      },
    });

    expect(result.outcome).toBe('player-service');
    expect(result.pendingEvent?.stage).toBe('notice');
    expect(result.pendingEvent?.initialInterest).toBe(20);
    expect(result.effects.playerFavorDelta).toBe(0);
    expect(result.effects.playerTrueHeartDelta).toBe(0);
    expect(result.nextPlayerNightFavorGauge).toBe(100);
    expect(result.lines.join(' ')).toContain('养心殿传召');
  });

  it('settles the player service after three documented interactions', () => {
    const result = resolvePlayerNightlyServiceEvent({
      routeId: 'lanyinxuguo',
      pendingEvent: {
        id: 'nightly-lanyinxuguo-1-1-1-player-service-pending',
        timeKey: '1-1-1',
        year: 1,
        month: 1,
        xun: 1,
        outcome: 'player-service',
        playerName: '谢令仪',
        rankLabel: '嫔',
        initialInterest: 20,
        currentInterest: 20,
        interactionCount: 0,
        maxInteractions: 3,
        selectedActionIds: [],
        stage: 'notice',
        pregnancyRoll: 100,
      },
      player: {
        name: '谢令仪',
        favor: 50,
        trueHeart: 35,
        rankLabel: '嫔',
        stats: {
          talent: 9,
          poetry: 9,
          temperament: 8,
          appearance: 4,
          fortune: 3,
        },
      },
      emperorMood: 40,
      actionIds: ['music', 'poetry', 'gentle'],
    });

    expect(result.finalInterest).toBe(70);
    expect(result.effects.playerFavorDelta).toBe(4);
    expect(result.effects.playerTrueHeartDelta).toBe(2);
    expect(result.report.outcome).toBe('player-service');
    expect(result.lines.join(' ')).toContain('侍寝保底值归零');
  });

  it('checks pregnancy after player service using converted fortune value', () => {
    const result = resolvePlayerNightlyServiceEvent({
      routeId: 'lanyinxuguo',
      pendingEvent: {
        id: 'nightly-lanyinxuguo-1-1-1-player-service-pending',
        timeKey: '1-1-1',
        year: 1,
        month: 1,
        xun: 1,
        outcome: 'player-service',
        playerName: '谢令仪',
        rankLabel: '嫔',
        initialInterest: 20,
        currentInterest: 20,
        interactionCount: 0,
        maxInteractions: 3,
        selectedActionIds: [],
        stage: 'notice',
        pregnancyRoll: 30,
      },
      player: {
        name: '谢令仪',
        favor: 50,
        trueHeart: 35,
        rankLabel: '嫔',
        stats: {
          talent: 9,
          poetry: 9,
          temperament: 8,
          appearance: 4,
          fortune: 3,
        },
      },
      emperorMood: 40,
      actionIds: ['music', 'poetry', 'gentle'],
    });

    expect(result.pregnancy).toEqual({
      succeeded: true,
      rate: 30,
      roll: 30,
    });
    expect(result.lines.join(' ')).toContain('太医请脉');
  });

  it('keeps gentle praise and smear from raising interest and applies only one third-party favor effect', () => {
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const ally = concubines.find((consort) => consort.stats.relationToPlayer > 0)!;
    const rival = concubines.find((consort) => consort.stats.relationToPlayer < 0)!;

    const result = resolvePlayerNightlyServiceEvent({
      routeId: 'lanyinxuguo',
      pendingEvent: {
        id: 'nightly-lanyinxuguo-1-1-1-player-service-pending',
        timeKey: '1-1-1',
        year: 1,
        month: 1,
        xun: 1,
        outcome: 'player-service',
        playerName: '谢令仪',
        rankLabel: '嫔',
        initialInterest: 20,
        currentInterest: 20,
        interactionCount: 0,
        maxInteractions: 3,
        selectedActionIds: [],
        stage: 'notice',
        pregnancyRoll: 100,
      },
      player: {
        name: '谢令仪',
        favor: 50,
        trueHeart: 35,
        rankLabel: '嫔',
        stats: {
          talent: 9,
          poetry: 9,
          temperament: 8,
          appearance: 4,
          fortune: 3,
        },
      },
      emperorMood: 40,
      concubines,
      actionIds: ['gentle', 'gentle', 'music'],
      actionChoices: [
        { actionId: 'gentle', gentleBranchId: 'praise', targetConsortId: ally.id },
        { actionId: 'gentle', gentleBranchId: 'smear', targetConsortId: rival.id },
        { actionId: 'music' },
      ],
    });

    expect(result.finalInterest).toBe(35);
    expect(result.thirdPartyEffect).toMatchObject({
      targetConsortId: ally.id,
      targetName: `${ally.rankLabel}${ally.name}`,
      favorDelta: expect.any(Number),
      branchId: 'praise',
    });
    expect(result.thirdPartyEffect?.favorDelta).toBeGreaterThanOrEqual(3);
    expect(result.thirdPartyEffect?.favorDelta).toBeLessThanOrEqual(5);
    expect(result.lines.join(' ')).toContain(`${ally.rankLabel}${ally.name}宠爱`);
  });
  it('lets an allied consort praise the player after her own service', () => {
    const ally = buildInitialConcubineRoster('lanyinxuguo').find((consort) => consort.stats.relationToPlayer > 0)!;
    const result = resolveNightlyService({
      routeId: 'lanyinxuguo',
      timeKey: '1-1-1',
      player: {
        name: '谢令仪',
        favor: 1,
        trueHeart: 35,
        rankLabel: '嫔',
        pregnant: false,
      },
      concubines: [
        {
          ...ally,
          stats: {
            ...ally.stats,
            favor: 90,
            relationToPlayer: 60,
          },
        },
      ],
      emperorMood: 40,
      playerNightFavorGauge: 0,
      rolls: {
        alone: 100,
        player: 100,
        pool: 1,
        interest: 60,
        thirdParty: 80,
      },
    });

    expect(result.outcome).toBe('other-consort-service');
    expect(result.effects.playerFavorDelta).toBeGreaterThanOrEqual(3);
    expect(result.effects.playerFavorDelta).toBeLessThanOrEqual(5);
    expect(result.lines.join(' ')).toContain('替玩家美言');
  });

  it('lets a hostile consort smear the player after her own service', () => {
    const rival = buildInitialConcubineRoster('lanyinxuguo').find((consort) => consort.stats.relationToPlayer < 0)!;
    const result = resolveNightlyService({
      routeId: 'lanyinxuguo',
      timeKey: '1-1-1',
      player: {
        name: '谢令仪',
        favor: 1,
        trueHeart: 35,
        rankLabel: '嫔',
        pregnant: false,
      },
      concubines: [
        {
          ...rival,
          stats: {
            ...rival.stats,
            favor: 90,
            relationToPlayer: -60,
          },
        },
      ],
      emperorMood: 40,
      playerNightFavorGauge: 0,
      rolls: {
        alone: 100,
        player: 100,
        pool: 1,
        interest: 60,
        thirdParty: 20,
      },
    });

    expect(result.outcome).toBe('other-consort-service');
    expect(result.effects.playerFavorDelta).toBeLessThanOrEqual(-3);
    expect(result.effects.playerFavorDelta).toBeGreaterThanOrEqual(-5);
    expect(result.lines.join(' ')).toContain('向皇帝抹黑玩家');
  });
});
