import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MONTHLY_EXPENSE_STRATEGY_ID,
  getInventoryItemsByPool,
  getGeneratedConsortRuleValue,
  getNightlyRuleValue,
  getNumericRuleRange,
  getNumericRuleValue,
  getPalaceStrifeSeverityRule,
  getRouteInitialProfileConfig,
  getRouteInitialStatDefaults,
  getYangxinVerdictChoiceRule,
  numericAttributeFields,
  numericChamberActions,
  numericCraftWorks,
  numericFavorTiers,
  numericFixedConsortSeeds,
  numericGeneratedConsortTemplates,
  numericMonthlyExpenseStrategies,
  numericNightlyInterestEffects,
  numericPalaceStrifeRumorItems,
  numericPrestigeRankTable,
  numericSpecialPrestigeRankTable,
  resolveRouteInitialPointsTotal,
} from './numericCatalog';
import { parseNumericCsv, parseStatDeltas } from './csvNumericLoader';

describe('numericCatalog', () => {
  it('parses quoted csv fields and action stat deltas', () => {
    const rows = parseNumericCsv('id,text\nsample,"一段,带逗号的文本"', 'inline.csv', ['id', 'text']);
    expect(rows[0]).toEqual({ id: 'sample', text: '一段,带逗号的文本' });
    expect(parseStatDeltas('talent:2|temperament:-3')).toEqual({ talent: 2, temperament: -3 });
  });

  it('loads core numeric tables with usable ranges and ids', () => {
    expect(getNumericRuleRange('age_range')).toEqual([15, 23]);
    expect(getNumericRuleValue('stamina_initial_per_xun')).toBe(10);
    expect(numericAttributeFields.find((field) => field.key === 'talent')?.label).toBe('乐理');
    expect(numericChamberActions.find((action) => action.id === 'explore')?.staminaCost).toBe(0);
    expect(DEFAULT_MONTHLY_EXPENSE_STRATEGY_ID).toBe('balanced');
    expect(numericMonthlyExpenseStrategies).toHaveLength(3);
  });

  it('loads route profiles and route stats from csv', () => {
    const yingluo = getRouteInitialProfileConfig('yingluoyeting');
    expect(yingluo.residenceDisplay).toBe('储秀宫西偏殿');
    expect(resolveRouteInitialPointsTotal('chenyuansucuo', '和亲公主')).toBe(0);
    expect(resolveRouteInitialPointsTotal('fushengrumeng', '商贾之女')).toBe(54);
    expect(getRouteInitialStatDefaults('chenyuansucuo').politics).toBe(4);
  });

  it('loads tier, rank, inventory and fixed consort seed tables', () => {
    expect(numericFavorTiers.find((tier) => tier.label === '独宠')?.maxCount).toBe(1);
    expect(numericPrestigeRankTable[0]?.位分名称).toBe('皇后');
    expect(numericSpecialPrestigeRankTable[0]?.位分名称).toBe('皇贵妃');
    expect(getInventoryItemsByPool('yeting-poison').map((item) => item.itemId)).toContain('hedandinghong');
    expect(getInventoryItemsByPool('music-score').length).toBeGreaterThanOrEqual(1);
    expect(numericCraftWorks.find((work) => work.workId === 'chanmeng-incense')?.type).toBe('incense');
    expect(numericFixedConsortSeeds.find((seed) => seed.name === '姚铃儿')?.stats.prestige).toBe(2180);
  });

  it('loads palace strife, nightly service and generated consort tables', () => {
    expect(getPalaceStrifeSeverityRule('heavy').prestigePenalty).toBe(-750);
    expect(numericPalaceStrifeRumorItems.find((item) => item.itemLabel === '与人偷情')?.severity).toBe('medium');
    expect(getYangxinVerdictChoiceRule('self-defend').multipliers.heavy).toBe(0.86);

    expect(getNightlyRuleValue('pending_player_max_interactions')).toBe(3);
    expect(numericNightlyInterestEffects.find((effect) => effect.minInterest === 100)?.prestigeDelta).toBe(10);

    expect(getGeneratedConsortRuleValue('target_live_consort_count')).toBe(12);
    expect(numericGeneratedConsortTemplates).toHaveLength(14);
    expect(numericGeneratedConsortTemplates.find((template) => template.name === '花棠')?.stats.appearance).toBe(91);
  });
});
