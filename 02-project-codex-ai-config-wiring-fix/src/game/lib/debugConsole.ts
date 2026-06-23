import { type DebugPrestigeResult, type DebugSilverResult, useGameFlowStore } from '../store/gameFlowStore';

export interface PalaceDebugConsole {
  addSilver: (amount: number | string) => DebugSilverResult;
  addPrestige: (amount: number | string) => DebugPrestigeResult;
}

declare global {
  interface Window {
    palaceDebug?: PalaceDebugConsole;
  }
}

export const installPalaceDebugConsole = (): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const previousDebugConsole = window.palaceDebug;
  const addSilver: PalaceDebugConsole['addSilver'] = (amount) => {
    const result = useGameFlowStore.getState().debugAddSilver(amount);
    const log = result.success ? console.info : console.warn;
    log('[palace-debug]', result.message, result);
    return result;
  };
  const addPrestige: PalaceDebugConsole['addPrestige'] = (amount) => {
    const result = useGameFlowStore.getState().debugAddPrestige(amount);
    const log = result.success ? console.info : console.warn;
    log('[palace-debug]', result.message, result);
    return result;
  };

  window.palaceDebug = {
    ...previousDebugConsole,
    addSilver,
    addPrestige,
  };
  console.info('[palace-debug] 可用命令：palaceDebug.addSilver(银两数), palaceDebug.addPrestige(声望数)');

  return () => {
    if (previousDebugConsole) {
      window.palaceDebug = previousDebugConsole;
      return;
    }
    delete window.palaceDebug;
  };
};
