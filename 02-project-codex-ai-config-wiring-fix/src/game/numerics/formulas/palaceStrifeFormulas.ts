import { evaluateNumericFormula, type FormulaVariables } from './formulaRuntime';
import { palaceStrifeFormulaPage, type PalaceStrifeFormulaId } from '../formula-pages/palaceStrifeFormulaPage';

export const evaluatePalaceStrifeFormula = (id: PalaceStrifeFormulaId, variables: FormulaVariables = {}): number =>
  evaluateNumericFormula(palaceStrifeFormulaPage[id].expression, variables);
