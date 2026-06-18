import { describe, expect, it } from 'vitest';

import {
  buildCraftWorkInstance,
  listCraftWorkConfigsByType,
  resolveCraftWorkAdvance,
} from './craftWorkRuntime';
import type { GameNumericsState, PalaceTimeState } from '../types';

const time: PalaceTimeState = {
  year: 1,
  month: 1,
  xun: 1,
  slotIndex: 1,
  slot: '上午',
  slotProgress: 0,
};

const buildState = (stats: Record<string, number>): GameNumericsState => ({
  name: '谢令仪',
  age: 16,
  family: '镇国公嫡女',
  residenceName: '储秀宫西偏殿',
  openingTendency: '量入为出',
  pointsTotal: 56,
  pointsLeft: 0,
  routeId: 'lanyinxuguo',
  stamina: 8,
  silver: 100,
  prestige: 0,
  stress: 0,
  favor: 0,
  trueHeart: 0,
  stats,
  flags: {
    attributeStatsFinalized: true,
  },
});

describe('craftWorkRuntime', () => {
  it('loads craft work configs by work type', () => {
    const paintings = listCraftWorkConfigsByType('painting');

    expect(paintings.map((work) => work.workId)).toContain('plum-blossom-scroll');
    expect(paintings.every((work) => work.type === 'painting')).toBe(true);
  });

  it('lets higher matching skill advance the same work faster', () => {
    const instance = buildCraftWorkInstance({
      workId: 'brocade-handkerchief',
      instanceId: 'craft:test:low',
      time,
    });

    const lowSkill = resolveCraftWorkAdvance({
      instance,
      state: buildState({ embroidery: 20, temperament: 20 }),
      time,
      seed: 'same-seed',
    });
    const highSkill = resolveCraftWorkAdvance({
      instance,
      state: buildState({ embroidery: 90, temperament: 80 }),
      time,
      seed: 'same-seed',
    });

    expect(highSkill.gain).toBeGreaterThan(lowSkill.gain);
    expect(highSkill.qualityLabel).toBeDefined();
  });

  it('uses work difficulty instead of a fixed average action count to pace progress', () => {
    const easyInstance = buildCraftWorkInstance({
      workId: 'clear-heart-incense',
      instanceId: 'craft:test:easy',
      time,
    });
    const hardInstance = buildCraftWorkInstance({
      workId: 'chanmeng-incense',
      instanceId: 'craft:test:hard',
      time,
    });
    const state = buildState({ medicine: 60, temperament: 60 });

    const easy = resolveCraftWorkAdvance({
      instance: easyInstance,
      state,
      time,
      seed: 'difficulty-seed',
    });
    const hard = resolveCraftWorkAdvance({
      instance: hardInstance,
      state,
      time,
      seed: 'difficulty-seed',
    });

    expect(easy.gain).toBeGreaterThan(hard.gain);
  });

  it('turns completed work into a sellable gift item', () => {
    const instance = buildCraftWorkInstance({
      workId: 'clear-heart-incense',
      instanceId: 'craft:test:complete',
      time,
    });
    const nearDone = {
      ...instance,
      progressPercent: 96,
      actionCount: 2,
    };

    const result = resolveCraftWorkAdvance({
      instance: nearDone,
      state: buildState({ medicine: 90, temperament: 70 }),
      time,
      seed: 'complete-seed',
    });

    expect(result.completed).toBe(true);
    expect(result.completedItem).toMatchObject({
      category: 'gift',
      canRecycle: true,
      quantity: 1,
    });
    expect(result.salePrice).toBeGreaterThan(0);
    expect(result.favorDelta).toBeGreaterThan(0);
  });
});
