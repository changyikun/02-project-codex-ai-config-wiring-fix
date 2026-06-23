/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installPalaceDebugConsole } from './debugConsole';
import { useGameFlowStore } from '../store/gameFlowStore';

describe('debug console commands', () => {
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    delete window.palaceDebug;
    console.info = vi.fn();
    console.warn = vi.fn();
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      state: {
        ...state.state,
        silver: 100,
        prestige: 200,
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 100,
        prestige: 200,
      },
      numericFeedbackSignal: { sequence: 0, bucket: 'chamber-action' },
    }));
  });

  afterEach(() => {
    delete window.palaceDebug;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
  });

  it('installs palaceDebug.addSilver on window for browser console use', () => {
    const cleanup = installPalaceDebugConsole();

    const result = window.palaceDebug?.addSilver(25);

    expect(result).toMatchObject({
      success: true,
      appliedAmount: 25,
      silver: 125,
    });
    expect(useGameFlowStore.getState().state.silver).toBe(125);
    expect(useGameFlowStore.getState().hiddenStats.silver).toBe(125);

    cleanup();
    expect(window.palaceDebug).toBeUndefined();
  });

  it('installs palaceDebug.addPrestige on window for browser console use', () => {
    const cleanup = installPalaceDebugConsole();

    const result = window.palaceDebug?.addPrestige('75');

    expect(result).toMatchObject({
      success: true,
      appliedAmount: 75,
      prestige: 275,
    });
    expect(useGameFlowStore.getState().state.prestige).toBe(275);
    expect(useGameFlowStore.getState().hiddenStats.prestige).toBe(275);

    cleanup();
    expect(window.palaceDebug).toBeUndefined();
  });
});
