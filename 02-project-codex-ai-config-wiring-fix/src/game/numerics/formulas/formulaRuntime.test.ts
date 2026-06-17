import { describe, expect, it } from 'vitest';
import { evaluateNumericFormula } from './formulaRuntime';
import { evaluateNightlyServiceFormula } from './nightlyServiceFormulas';
import { evaluatePalaceStrifeFormula } from './palaceStrifeFormulas';
import { palaceStrifeFormulaPage } from '../formula-pages/palaceStrifeFormulaPage';

describe('numeric formula runtime', () => {
  it('evaluates arithmetic, functions and ternary expressions without eval', () => {
    expect(evaluateNumericFormula('round(clamp(50 + attack - defense, 10, 90))', { attack: 12.4, defense: 3 })).toBe(59);
    expect(evaluateNumericFormula('music > 8 ? 15 : music > 5 ? 5 : 0', { music: 7 })).toBe(5);
    expect(evaluateNumericFormula('max(0, roll - rate) / 2', { roll: 80, rate: 70 })).toBe(5);
  });

  it('evaluates palace strife formulas as complete formula definitions', () => {
    expect(
      evaluatePalaceStrifeFormula('actionSuccessRate', {
        attack: 20,
        defense: 5,
        severityActionModifier: 5,
        frameActionModifier: 0,
      }),
    ).toBe(60);
    expect(evaluatePalaceStrifeFormula('framedSuspectSuspicion', { baseConvictionRate: 40 })).toBe(70);
    expect(Object.keys(palaceStrifeFormulaPage).some((id) => id.toLowerCase().includes('hearing'))).toBe(false);
    expect(Object.keys(palaceStrifeFormulaPage).some((id) => id.toLowerCase().includes('yangxin'))).toBe(false);
  });

  it('evaluates nightly service action formulas', () => {
    expect(evaluateNightlyServiceFormula('musicDelta', { music: 9 })).toBe(15);
    expect(evaluateNightlyServiceFormula('poetryDelta', { poetry: 6 })).toBe(-10);
    expect(evaluateNightlyServiceFormula('gentleDelta', { branchIsComfort: 0 })).toBe(0);
  });
});
