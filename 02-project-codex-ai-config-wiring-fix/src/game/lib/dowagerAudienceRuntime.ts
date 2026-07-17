import { getNumericRuleValue } from '../numerics/numericCatalog';
import { requireNonConsortNpcProfile } from '../npcs/npcCatalog';
import type { PalaceTimeState, PermanentNpcRelationshipState } from '../types';

const dowagerProfile = requireNonConsortNpcProfile('dowager');

export const DOWAGER_NPC_ID = dowagerProfile.npcId;
export const DOWAGER_NPC_NAME = dowagerProfile.displayName;
export const DOWAGER_AUDIENCE_OPEN_SLOTS = ['清晨', '上午', '中午', '下午', '傍晚'] as const;

export const DOWAGER_INTERACTION_LIMIT_PER_XUN = getNumericRuleValue('dowager_interaction_limit_per_xun');
export const DOWAGER_GREETING_AFFINITY_DELTA = getNumericRuleValue('dowager_greeting_affinity_delta');
export const DOWAGER_MINOR_AFFINITY_DELTA = getNumericRuleValue('dowager_minor_affinity_delta');
export const DOWAGER_MISSING_MONTHLY_GREETING_PRESTIGE_DELTA = getNumericRuleValue(
  'dowager_missing_monthly_greeting_prestige_delta',
);

export const isDowagerAudienceOpenSlot = (slot: string): boolean =>
  DOWAGER_AUDIENCE_OPEN_SLOTS.some((openSlot) => openSlot === slot);

export const getDowagerMonthKey = (time: Pick<PalaceTimeState, 'year' | 'month'>): string => `${time.year}-${time.month}`;

export const getDowagerXunKey = (time: Pick<PalaceTimeState, 'year' | 'month' | 'xun'>): string =>
  `${time.year}-${time.month}-${time.xun}`;

export const hasDowagerGreetedThisMonth = (
  relationship: PermanentNpcRelationshipState | undefined,
  time: Pick<PalaceTimeState, 'year' | 'month'>,
): boolean => relationship?.lastDowagerGreetingMonthKey === getDowagerMonthKey(time);

export const hasDowagerGreetedThisXun = (
  relationship: PermanentNpcRelationshipState | undefined,
  time: Pick<PalaceTimeState, 'year' | 'month' | 'xun'>,
): boolean => relationship?.lastDowagerGreetingXunKey === getDowagerXunKey(time);

export const markDowagerGreetingOnRelationship = (
  relationship: PermanentNpcRelationshipState,
  time: Pick<PalaceTimeState, 'year' | 'month' | 'xun'>,
): PermanentNpcRelationshipState => ({
  ...relationship,
  met: true,
  lastDowagerGreetingMonthKey: getDowagerMonthKey(time),
  lastDowagerGreetingXunKey: getDowagerXunKey(time),
});

export const resolveDowagerMissedGreetingPenalty = ({
  relationship,
  previousTime,
  monthTransitions,
}: {
  relationship: PermanentNpcRelationshipState | undefined;
  previousTime: Pick<PalaceTimeState, 'year' | 'month'>;
  monthTransitions: number;
}): { missedMonthCount: number; prestigeDelta: number; lines: string[] } => {
  if (monthTransitions <= 0) {
    return { missedMonthCount: 0, prestigeDelta: 0, lines: [] };
  }
  const coveredCurrentMonth = hasDowagerGreetedThisMonth(relationship, previousTime);
  const missedMonthCount = Math.max(0, Math.floor(monthTransitions) - (coveredCurrentMonth ? 1 : 0));
  const prestigeDelta = DOWAGER_MISSING_MONTHLY_GREETING_PRESTIGE_DELTA * missedMonthCount;
  if (missedMonthCount <= 0) {
    return { missedMonthCount, prestigeDelta: 0, lines: [] };
  }
  const absDelta = Math.abs(prestigeDelta);
  return {
    missedMonthCount,
    prestigeDelta,
    lines: [
      missedMonthCount > 1
        ? `建章宫掌事来传话：前数月未见小主入宫问安，太后虽未明责，宫里已有议论。声望-${absDelta}。`
        : `建章宫掌事来传话：上月未见小主入宫问安，太后虽未明责，宫里已有议论。声望-${absDelta}。`,
    ],
  };
};
