import { describe, expect, it } from 'vitest';

import {
  createEmperorInteractionProgress,
  isEmperorPublicEncounterAvailable,
  resolveEmperorAudienceRequest,
  resolveEmperorScheduledLocation,
  resolveZhengyangGateEncounter,
} from './emperorActivityRuntime';
import { resolveEmperorDayAudienceInteraction } from './emperorDayAudienceRuntime';
import type { GameNumericsState, PalaceTimeState } from '../types';

const buildTime = (slot: PalaceTimeState['slot'], slotIndex: number): PalaceTimeState => ({
  year: 1,
  month: 1,
  xun: 1,
  slot,
  slotIndex,
  slotProgress: 0,
});

const playerState: GameNumericsState = {
  name: '谢令仪',
  age: 16,
  family: '镇国公嫡女',
  residenceName: '储秀宫东偏殿',
  pointsTotal: 56,
  pointsLeft: 0,
  routeId: 'lanyinxuguo',
  stamina: 9,
  silver: 120,
  prestige: 900,
  stress: 10,
  favor: 60,
  trueHeart: 45,
  stats: {
    politics: 80,
    medicine: 50,
    temperament: 850,
    talent: 70,
    poetry: 60,
    appearance: 880,
    intrigue: 900,
  },
  flags: {},
};

describe('emperorActivityRuntime', () => {
  it('places the emperor by time slot deterministically', () => {
    expect(resolveEmperorScheduledLocation('lanyinxuguo', buildTime('清晨', 0))).toBe('正阳门');
    expect(resolveEmperorScheduledLocation('lanyinxuguo', buildTime('上午', 1))).toBe('养心殿');
    expect(resolveEmperorScheduledLocation('lanyinxuguo', buildTime('夜晚', 5))).toBe('养心殿');
    expect(resolveEmperorScheduledLocation('lanyinxuguo', buildTime('下午', 3))).toBe(
      resolveEmperorScheduledLocation('lanyinxuguo', buildTime('下午', 3)),
    );
  });

  it('stores the xun schedule in emperor interaction progress', () => {
    const progress = createEmperorInteractionProgress('lanyinxuguo', buildTime('清晨', 0), 40);

    expect(progress.xunKey).toBe('1-1-1');
    expect(progress.mood).toBe(40);
    expect(progress.schedule.slots['清晨'].location).toBe('正阳门');
    expect(progress.schedule.slots['上午'].location).toBe('养心殿');
  });

  it('allows morning Yangxin requests with lower but non-zero chance', () => {
    const morning = resolveEmperorAudienceRequest({
      routeId: 'lanyinxuguo',
      time: buildTime('上午', 1),
      playerFavor: 50,
      playerTrueHeart: 30,
      emperorMood: 40,
    });
    const afternoon = resolveEmperorAudienceRequest({
      routeId: 'lanyinxuguo',
      time: buildTime('下午', 3),
      playerFavor: 50,
      playerTrueHeart: 30,
      emperorMood: 40,
    });

    expect(morning.chance).toBeGreaterThan(0);
    expect(morning.chance).toBeLessThan(afternoon.chance);
  });

  it('raises Yangxin request chance when the gatekeeper has higher affinity', () => {
    const cold = resolveEmperorAudienceRequest({
      routeId: 'lanyinxuguo',
      time: buildTime('下午', 3),
      playerFavor: 30,
      playerTrueHeart: 20,
      emperorMood: 40,
      gatekeeperAffinity: 0,
    });
    const familiar = resolveEmperorAudienceRequest({
      routeId: 'lanyinxuguo',
      time: buildTime('下午', 3),
      playerFavor: 30,
      playerTrueHeart: 20,
      emperorMood: 40,
      gatekeeperAffinity: 80,
    });

    expect(familiar.chance).toBeGreaterThan(cold.chance);
  });

  it('resolves Zhengyang court-dismissal encounters only in dawn slot', () => {
    const dawn = resolveZhengyangGateEncounter({
      routeId: 'lanyinxuguo',
      time: buildTime('清晨', 0),
      playerFavor: 40,
      emperorMood: 60,
    });
    const noon = resolveZhengyangGateEncounter({
      routeId: 'lanyinxuguo',
      time: buildTime('中午', 2),
      playerFavor: 40,
      emperorMood: 60,
    });

    expect(dawn.chance).toBeGreaterThan(0);
    expect(noon.chance).toBe(0);
  });

  it('uses scheduled public locations for public emperor encounters', () => {
    const time = buildTime('中午', 2);
    const progress = createEmperorInteractionProgress('lanyinxuguo', time, 55);
    const scheduledLocation = progress.schedule.slots[time.slot].location;

    expect(isEmperorPublicEncounterAvailable(progress, time, scheduledLocation)).toBe(
      scheduledLocation === '御花园' || scheduledLocation === '建章宫',
    );
  });

  it('resolves one day audience interaction into flat, small or big effects', () => {
    const result = resolveEmperorDayAudienceInteraction({
      routeId: 'lanyinxuguo',
      time: buildTime('下午', 3),
      location: '养心殿',
      source: 'yangxin-request',
      actionId: 'chess',
      state: playerState,
      emperorMood: 55,
    });

    expect(result.success).toBe(true);
    expect(['flat', 'small', 'big']).toContain(result.tier);
    expect(result.effects.prestigeDelta).toBeGreaterThanOrEqual(0);
  });
});
