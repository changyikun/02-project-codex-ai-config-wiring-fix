import type { MonthlyExpenseStrategyId } from '../game/types';
import {
  DEFAULT_MONTHLY_EXPENSE_STRATEGY_ID,
  numericMonthlyExpenseStrategies,
} from '../game/numerics/numericCatalog';

export interface MonthlyExpenseStrategyConfig {
  id: MonthlyExpenseStrategyId;
  label: string;
  expenseRate: number;
  prestigeDelta: number;
  healthDelta: number;
  summary: string;
}

export const DEFAULT_MONTHLY_EXPENSE_STRATEGY: MonthlyExpenseStrategyId = DEFAULT_MONTHLY_EXPENSE_STRATEGY_ID;

export const MONTHLY_EXPENSE_STRATEGIES: readonly MonthlyExpenseStrategyConfig[] = numericMonthlyExpenseStrategies.map(
  ({ isDefault: _isDefault, ...strategy }) => strategy,
);

export const getMonthlyExpenseStrategyConfig = (
  strategyId?: MonthlyExpenseStrategyId,
): MonthlyExpenseStrategyConfig =>
  MONTHLY_EXPENSE_STRATEGIES.find((strategy) => strategy.id === strategyId) ??
  MONTHLY_EXPENSE_STRATEGIES.find((strategy) => strategy.id === DEFAULT_MONTHLY_EXPENSE_STRATEGY)!;
