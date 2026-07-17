import { useCallback } from 'react';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { PalaceTimeState } from '../../game/types';

export interface TimedLocationActionOutcome {
  previousTime: PalaceTimeState;
  shouldSleep: boolean;
  reason: 'deep-night';
}

interface TimedLocationActionOptions {
  staminaCost?: number;
}

export const useLocationActionFlow = () => {
  const time = useGameFlowStore((store) => store.time);
  const state = useGameFlowStore((store) => store.state);
  const advanceTime = useGameFlowStore((store) => store.advanceTime);
  const patchState = useGameFlowStore((store) => store.patchState);
  const requestOvernightReturn = useGameFlowStore((store) => store.requestOvernightReturn);
  const enterMainChamber = useGameFlowStore((store) => store.enterMainChamber);

  const beginTimedLocationAction = useCallback(
    (options: TimedLocationActionOptions = {}): TimedLocationActionOutcome => {
      const staminaCost = Math.max(0, options.staminaCost ?? 0);
      const nextStamina = Math.max(0, state.stamina - staminaCost);

      if (staminaCost > 0) {
        patchState({ stamina: nextStamina });
      }

      const shouldSleep = time.slot === '深夜';
      if (!shouldSleep) {
        advanceTime(1);
      }

      return {
        previousTime: time,
        shouldSleep,
        reason: 'deep-night',
      };
    },
    [advanceTime, patchState, state.stamina, time],
  );

  const finishTimedLocationAction = useCallback(
    (outcome?: TimedLocationActionOutcome | null): boolean => {
      if (!outcome?.shouldSleep) {
        return false;
      }

      requestOvernightReturn({ origin: 'map', reason: outcome.reason });
      enterMainChamber();
      return true;
    },
    [enterMainChamber, requestOvernightReturn],
  );

  return { beginTimedLocationAction, finishTimedLocationAction };
};
