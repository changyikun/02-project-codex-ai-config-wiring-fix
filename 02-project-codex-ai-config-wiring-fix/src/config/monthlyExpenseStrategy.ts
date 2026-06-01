import type { MonthlyExpenseStrategyId } from '../game/types';

export interface MonthlyExpenseStrategyConfig {
  id: MonthlyExpenseStrategyId;
  label: string;
  expenseRate: number;
  prestigeDelta: number;
  healthDelta: number;
  summary: string;
}

export const DEFAULT_MONTHLY_EXPENSE_STRATEGY: MonthlyExpenseStrategyId = 'balanced';

export const MONTHLY_EXPENSE_STRATEGIES: readonly MonthlyExpenseStrategyConfig[] = [
  {
    id: 'frugal',
    label: '节衣缩食',
    expenseRate: 0.25,
    prestigeDelta: -5,
    healthDelta: -1,
    summary: '用度从省，省下银两，但体面与起居都会受损。',
  },
  {
    id: 'balanced',
    label: '量入为出',
    expenseRate: 0.5,
    prestigeDelta: 0,
    healthDelta: 0,
    summary: '按月俸正常维持体面，不额外增减声望与健康。',
  },
  {
    id: 'luxury',
    label: '锦衣玉食',
    expenseRate: 0.75,
    prestigeDelta: 10,
    healthDelta: 1,
    summary: '高调维持体面，银两消耗较高，声望与起居更稳。',
  },
] as const;

export const getMonthlyExpenseStrategyConfig = (
  strategyId?: MonthlyExpenseStrategyId,
): MonthlyExpenseStrategyConfig =>
  MONTHLY_EXPENSE_STRATEGIES.find((strategy) => strategy.id === strategyId) ??
  MONTHLY_EXPENSE_STRATEGIES.find((strategy) => strategy.id === DEFAULT_MONTHLY_EXPENSE_STRATEGY)!;
