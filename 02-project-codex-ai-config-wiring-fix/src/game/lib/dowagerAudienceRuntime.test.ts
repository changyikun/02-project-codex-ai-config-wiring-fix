import { describe, expect, it } from 'vitest';
import type { PermanentNpcRelationshipState } from '../types';
import {
  DOWAGER_MISSING_MONTHLY_GREETING_PRESTIGE_DELTA,
  hasDowagerGreetedThisMonth,
  hasDowagerGreetedThisXun,
  isDowagerAudienceOpenSlot,
  markDowagerGreetingOnRelationship,
  resolveDowagerMissedGreetingPenalty,
} from './dowagerAudienceRuntime';

const relationship: PermanentNpcRelationshipState = {
  npcId: 'dowager',
  npcName: '太后',
  met: true,
  affinity: 0,
  xunKey: '1-1-1',
  actionCountThisXun: 0,
};

describe('dowagerAudienceRuntime', () => {
  it('opens dowager audience from morning to dusk only', () => {
    expect(isDowagerAudienceOpenSlot('清晨')).toBe(true);
    expect(isDowagerAudienceOpenSlot('傍晚')).toBe(true);
    expect(isDowagerAudienceOpenSlot('夜晚')).toBe(false);
    expect(isDowagerAudienceOpenSlot('深夜')).toBe(false);
  });

  it('marks monthly and xun greetings on the permanent NPC relationship', () => {
    const marked = markDowagerGreetingOnRelationship(relationship, { year: 1, month: 2, xun: 3 });

    expect(hasDowagerGreetedThisMonth(marked, { year: 1, month: 2 })).toBe(true);
    expect(hasDowagerGreetedThisXun(marked, { year: 1, month: 2, xun: 3 })).toBe(true);
    expect(hasDowagerGreetedThisXun(marked, { year: 1, month: 2, xun: 2 })).toBe(false);
  });

  it('penalizes missed monthly greeting for the month being closed', () => {
    const missed = resolveDowagerMissedGreetingPenalty({
      relationship,
      previousTime: { year: 1, month: 1 },
      monthTransitions: 1,
    });
    expect(missed.prestigeDelta).toBe(DOWAGER_MISSING_MONTHLY_GREETING_PRESTIGE_DELTA);
    expect(missed.lines[0]).toContain('建章宫掌事来传话');

    const covered = resolveDowagerMissedGreetingPenalty({
      relationship: markDowagerGreetingOnRelationship(relationship, { year: 1, month: 1, xun: 2 }),
      previousTime: { year: 1, month: 1 },
      monthTransitions: 1,
    });
    expect(covered.prestigeDelta).toBe(0);
    expect(covered.lines).toEqual([]);
  });
});
