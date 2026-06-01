import type { PalaceTimeState } from '../types';

export const FAMILY_AID_COST = 120;
export const FAMILY_AID_BONUS = 10;
export const FAMILY_AID_QUARTERLY_PRESTIGE = 12;

const toAbsoluteMonth = (year: number, month: number): number => (Math.max(1, year) - 1) * 12 + Math.max(1, month);

export const isFamilyQuarterSettlementMonth = (absoluteMonth: number): boolean =>
  absoluteMonth >= 7 && (absoluteMonth - 7) % 3 === 0;

export const countFamilyQuarterSettlements = (start: PalaceTimeState, monthTransitions: number): number => {
  const transitions = Math.max(0, Math.floor(monthTransitions));
  const startMonth = toAbsoluteMonth(start.year, start.month);
  let count = 0;

  for (let index = 1; index <= transitions; index += 1) {
    if (isFamilyQuarterSettlementMonth(startMonth + index)) {
      count += 1;
    }
  }

  return count;
};
