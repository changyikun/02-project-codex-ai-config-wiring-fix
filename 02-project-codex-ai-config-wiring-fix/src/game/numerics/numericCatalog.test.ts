import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MONTHLY_EXPENSE_STRATEGY_ID,
  getInventoryItemsByPool,
  getInventoryItemsByTag,
  getGeneratedConsortRuleValue,
  getNightlyRuleValue,
  getNumericRuleRange,
  getNumericRuleValue,
  getPalaceStrifeSeverityRule,
  getRouteInitialProfileConfig,
  getRouteInitialStatDefaults,
  getYangxinVerdictChoiceRule,
  numericFamilyInitialTraits,
  numericAttributeFields,
  numericChamberActions,
  numericConsortAttributeFields,
  numericCraftWorks,
  numericFavorTiers,
  numericFixedConsortSeeds,
  numericGeneratedConsortTemplates,
  numericInventoryItems,
  numericMonthlyExpenseStrategies,
  numericNightlyInterestEffects,
  numericPalaceStrifeRumorItems,
  numericPlayerStatusFields,
  numericPrestigeRankTable,
  numericSpecialPrestigeRankTable,
  resolveFamilyInitialPointModifier,
  resolveFamilyInitialTraits,
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
    expect(numericAttributeFields.every((field) => field.note.includes('影响'))).toBe(true);
    expect(numericPlayerStatusFields.find((field) => field.key === 'prestige')?.note).toContain('位分');
    expect(numericPlayerStatusFields.every((field) => field.note.includes('影响'))).toBe(true);
    expect(numericConsortAttributeFields.find((field) => field.key === 'relationToPlayer')?.note).toContain('替你说话');
    expect(numericConsortAttributeFields.every((field) => field.note.includes('影响'))).toBe(true);
    expect(numericChamberActions.find((action) => action.id === 'explore')?.staminaCost).toBe(0);
    expect(DEFAULT_MONTHLY_EXPENSE_STRATEGY_ID).toBe('balanced');
    expect(numericMonthlyExpenseStrategies).toHaveLength(3);
  });

  it('loads route profiles and route stats from csv', () => {
    const yingluo = getRouteInitialProfileConfig('yingluoyeting');
    expect(yingluo.residenceDisplay).toBe('储秀宫西偏殿');
    expect(yingluo.prestigeRange).toEqual([0, 0]);
    expect(yingluo.initialRankOptions).toEqual(['官女子']);
    expect(resolveRouteInitialPointsTotal('chenyuansucuo', '和亲公主')).toBe(0);
    expect(resolveRouteInitialPointsTotal('lanyinxuguo', '镇国公嫡女')).toBe(16);
    expect(resolveRouteInitialPointsTotal('lanyinxuguo', '正二品武官庶女')).toBe(23);
    expect(resolveRouteInitialPointsTotal('fushengrumeng', '商贾之女')).toBe(25);
    expect(resolveRouteInitialPointsTotal('fushengrumeng', '六品武官嫡女')).toBe(27);
    expect(resolveRouteInitialPointsTotal('yingluoyeting', '罪臣之后')).toBe(26);
    expect(getRouteInitialStatDefaults('chenyuansucuo').politics).toBe(4);
  });

  it('loads family trait modifiers for initial points and monthly prestige', () => {
    expect(numericFamilyInitialTraits.find((trait) => trait.traitKey === 'merchant')?.monthlyBackgroundPrestige).toBe(-3);
    expect(resolveFamilyInitialTraits('正三品文官嫡女').map((trait) => trait.traitKey)).toEqual([
      'rank_3',
      'civil_official',
      'legitimate_daughter',
    ]);
    expect(resolveFamilyInitialPointModifier('正三品文官嫡女')).toBe(3);
    expect(resolveFamilyInitialPointModifier('正二品武官庶女')).toBe(5);
  });

  it('loads tier, rank, inventory and fixed consort seed tables', () => {
    expect(numericFavorTiers.find((tier) => tier.label === '独宠')?.maxCount).toBe(1);
    expect(numericPrestigeRankTable[0]?.位分名称).toBe('皇后');
    expect(numericSpecialPrestigeRankTable[0]?.位分名称).toBe('皇贵妃');
    expect(getInventoryItemsByPool('initial')).toEqual([]);
    expect(getInventoryItemsByPool('yeting-poison').map((item) => item.itemId)).toContain('hedandinghong');
    expect(getInventoryItemsByPool('music-score').length).toBeGreaterThanOrEqual(1);
    expect(getInventoryItemsByPool('dance-score').length).toBeGreaterThanOrEqual(1);
    expect(getInventoryItemsByPool('music-score').every((item) => item.isQuestItem && item.category === 'music-score')).toBe(true);
    expect(getInventoryItemsByPool('dance-score').every((item) => item.isQuestItem && item.category === 'dance-score')).toBe(true);
    expect(getInventoryItemsByPool('duniang-always').every((item) => item.rarity === 'green' || item.rarity === 'blue')).toBe(true);
    expect(getInventoryItemsByPool('duniang-always').every((item) => !item.isQuestItem)).toBe(true);
    expect(getInventoryItemsByPool('yeting-poison').every((item) => item.isQuestItem)).toBe(true);
    const pipaPick = numericInventoryItems.find((item) => item.itemId === 'miaoyin-pipa-pick');
    expect(pipaPick?.isQuestItem).toBe(true);
    expect(pipaPick?.canSell).toBe(false);
    expect(pipaPick?.canRecycle).toBe(false);
    expect(getInventoryItemsByTag('low-quality-food').map((item) => item.itemId)).toContain('sesame-flatbread');
    expect(getInventoryItemsByTag('tree-fruit').map((item) => item.itemId)).toContain('fresh-jubube');
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
    expect(numericGeneratedConsortTemplates).toHaveLength(13);
    expect(numericGeneratedConsortTemplates.map((template) => template.name)).not.toContain('连翘');
    expect(numericGeneratedConsortTemplates.find((template) => template.name === '花棠')?.stats.appearance).toBe(91);
  });
});
