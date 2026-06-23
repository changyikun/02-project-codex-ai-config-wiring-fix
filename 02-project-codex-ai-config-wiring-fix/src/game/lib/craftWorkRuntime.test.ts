import { describe, expect, it } from 'vitest';

import {
  buildCraftWorkInstance,
  listEligibleCraftWorkConfigsByType,
  listCraftWorkConfigsByType,
  pickCraftWorkInspiration,
  resolveCraftWorkAdvance,
  resolveCraftWorkQuality,
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

  it('only draws craft inspiration from works unlocked by current skill', () => {
    const lowSkill = buildState({ painting: 20, poetry: 50 });
    const highSkill = buildState({ painting: 90, poetry: 80 });

    expect(listEligibleCraftWorkConfigsByType({ type: 'painting', state: lowSkill }).map((work) => work.workId)).not.toContain(
      'luoshen-riverside',
    );
    expect(listEligibleCraftWorkConfigsByType({ type: 'painting', state: highSkill }).map((work) => work.workId)).toContain(
      'luoshen-riverside',
    );
    expect(
      pickCraftWorkInspiration({
        type: 'painting',
        state: highSkill,
        seed: 'same-seed',
      })?.type,
    ).toBe('painting');
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

  it('uses stricter quality tiers so fine work is not easy to obtain', () => {
    expect(resolveCraftWorkQuality(64)).toBe('rough');
    expect(resolveCraftWorkQuality(65)).toBe('steady');
    expect(resolveCraftWorkQuality(89)).toBe('steady');
    expect(resolveCraftWorkQuality(90)).toBe('fine');

    const easyInstance = buildCraftWorkInstance({
      workId: 'clear-heart-incense',
      instanceId: 'craft:test:quality-easy',
      time,
    });
    const easyNearDone = {
      ...easyInstance,
      progressPercent: 98,
      actionCount: 2,
    };
    const result = resolveCraftWorkAdvance({
      instance: easyNearDone,
      state: buildState({ medicine: 90, temperament: 80 }),
      time,
      seed: 'quality-seed',
    });

    expect(result.completed).toBe(true);
    expect(result.quality).not.toBe('fine');
  });

  it('keeps quality sale spread modest', () => {
    const roughInstance = {
      ...buildCraftWorkInstance({
        workId: 'clear-heart-incense',
        instanceId: 'craft:test:rough-price',
        time,
      }),
      progressPercent: 99,
      actionCount: 5,
    };
    const steadyInstance = {
      ...buildCraftWorkInstance({
        workId: 'clear-heart-incense',
        instanceId: 'craft:test:steady-price',
        time,
      }),
      progressPercent: 99,
      actionCount: 1,
    };

    const rough = resolveCraftWorkAdvance({
      instance: roughInstance,
      state: buildState({ medicine: 10, temperament: 10 }),
      time,
      seed: 'price-seed',
    });
    const steady = resolveCraftWorkAdvance({
      instance: steadyInstance,
      state: buildState({ medicine: 90, temperament: 90 }),
      time,
      seed: 'price-seed',
    });

    expect(rough.completed).toBe(true);
    expect(steady.completed).toBe(true);
    expect(steady.salePrice ?? 0).toBeLessThanOrEqual(Math.ceil((rough.salePrice ?? 1) * 1.12));
  });

  it('normalizes difficulty for sale price instead of treating it as a direct multiplier', () => {
    const instance = {
      ...buildCraftWorkInstance({
        workId: 'moon-kylin-incense',
        instanceId: 'craft:test:hard-sale-price',
        time,
      }),
      progressPercent: 99,
      actionCount: 1,
    };

    const result = resolveCraftWorkAdvance({
      instance,
      state: buildState({ medicine: 100, poetry: 100 }),
      time,
      seed: 'hard-sale-price-seed',
    });

    expect(result.completed).toBe(true);
    expect(result.completedItem?.price ?? 0).toBeLessThan(600);
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
