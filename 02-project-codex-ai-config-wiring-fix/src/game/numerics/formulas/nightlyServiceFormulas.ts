import type { NightlyServiceGentleBranchId, NightlyServiceInteractionActionId } from '../../types';
import { evaluateNumericFormula, type FormulaVariables } from './formulaRuntime';
import { nightlyServiceFormulaPage, type NightlyFormulaId } from '../formula-pages/nightlyServiceFormulaPage';

export const evaluateNightlyServiceFormula = (id: NightlyFormulaId, variables: FormulaVariables = {}): number =>
  evaluateNumericFormula(nightlyServiceFormulaPage[id].expression, variables);

export const resolveNightlyFormulaIdForAction = (actionId: NightlyServiceInteractionActionId): NightlyFormulaId => {
  const formulaByAction: Record<NightlyServiceInteractionActionId, NightlyFormulaId> = {
    music: 'musicDelta',
    poetry: 'poetryDelta',
    shy: 'shyDelta',
    curtain: 'curtainDelta',
    gentle: 'gentleDelta',
  };
  return formulaByAction[actionId];
};

export const resolveGentleBranchFormulaVariables = (
  branchId: NightlyServiceGentleBranchId | undefined,
): FormulaVariables => ({
  branchIsComfort: !branchId || branchId === 'comfort' ? 1 : 0,
});
