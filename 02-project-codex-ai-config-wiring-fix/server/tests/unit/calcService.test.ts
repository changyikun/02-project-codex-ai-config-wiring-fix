import { describe, expect, it } from 'vitest';
import { buildFallbackCalcResult } from '../../src/modules/ai/shared';
import type { CalcAgentRequest } from '../../src/types/contracts';

const payload: CalcAgentRequest = {
  traceId: 'trace-unit-1',
  action: '请安',
  player: {
    routeId: 'xiunv',
    name: '沈容华',
    silver: 100,
    stamina: 80,
    currentRankId: 'xuanhui',
    baseStats: { charm: 70, intellect: 60, intrigue: 50, prestige: 40, favor: 30, resilience: 65 },
    skills: { intrigue: 44, insight: 40 },
    persona: { title: '测试', summary: '测试', strengths: [], weaknesses: [] },
  },
  emperor: { mood: '审视', sincerity: 42, nightlyInterest: 30 },
  location: '寝宫',
  time: { year: 1, month: 1, xun: 1, slotIndex: 0, slot: '晨起' },
  weights: { risk: 0.5, reward: 0.7 },
};

describe('buildFallbackCalcResult', () => {
  it('保留四位小数并生成 3 个数值节点', () => {
    const result = buildFallbackCalcResult(payload);
    expect(result.probability.toString()).toMatch(/\d+(\.\d{1,4})?$/);
    expect(result.metrics).toHaveLength(3);
    expect(result.generatedAt).toBeTruthy();
  });
});
