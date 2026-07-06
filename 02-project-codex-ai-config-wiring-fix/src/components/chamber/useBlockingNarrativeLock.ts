import { useEffect } from 'react';
import { useGameFlowStore } from '../../game/store/gameFlowStore';

export const useBlockingNarrativeLock = (lockId: string, active: boolean) => {
  const beginBlockingNarrative = useGameFlowStore((store) => store.beginBlockingNarrative);
  const endBlockingNarrative = useGameFlowStore((store) => store.endBlockingNarrative);

  useEffect(() => {
    if (!active) {
      endBlockingNarrative(lockId);
      return undefined;
    }

    beginBlockingNarrative(lockId);
    return () => {
      endBlockingNarrative(lockId);
    };
  }, [active, beginBlockingNarrative, endBlockingNarrative, lockId]);
};
