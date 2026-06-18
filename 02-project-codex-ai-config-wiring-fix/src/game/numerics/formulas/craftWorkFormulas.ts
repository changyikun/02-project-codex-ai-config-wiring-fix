import { craftWorkFormulaPage, type CraftWorkFormulaId } from '../formula-pages/craftWorkFormulaPage';
import { evaluateNumericFormula, type FormulaVariables } from './formulaRuntime';

export const evaluateCraftWorkFormula = (id: CraftWorkFormulaId, variables: FormulaVariables = {}): number =>
  evaluateNumericFormula(craftWorkFormulaPage[id].expression, variables);
