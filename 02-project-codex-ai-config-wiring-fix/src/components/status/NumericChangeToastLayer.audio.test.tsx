/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playConfiguredSfx } from '../../game/audio/gameAudio';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import { NumericChangeToastLayer } from './NumericChangeToastLayer';

vi.mock('../../game/audio/gameAudio', async () => {
  const actual = await vi.importActual<typeof import('../../game/audio/gameAudio')>('../../game/audio/gameAudio');
  return {
    ...actual,
    playConfiguredSfx: vi.fn(),
  };
});

describe('NumericChangeToastLayer audio', () => {
  afterEach(() => {
    vi.mocked(playConfiguredSfx).mockClear();
    act(() => {
      useGameFlowStore.setState((state) => ({
        ...state,
        currentView: 'start',
        state: {
          ...state.state,
          silver: 1000,
        },
        hiddenStats: {
          ...state.hiddenStats,
          silver: 1000,
        },
        numericFeedbackSignal: { sequence: 0, bucket: 'chamber-action' },
      }));
    });
  });

  it('plays the cost sound when a queued silver change is surfaced', async () => {
    act(() => {
      useGameFlowStore.setState((state) => ({
        ...state,
        currentView: 'bedchamber',
        state: {
          ...state.state,
          silver: 100,
        },
        hiddenStats: {
          ...state.hiddenStats,
          silver: 100,
        },
        numericFeedbackSignal: { sequence: 0, bucket: 'chamber-action' },
      }));
    });

    render(<NumericChangeToastLayer />);

    act(() => {
      useGameFlowStore.setState((state) => ({
        ...state,
        state: {
          ...state.state,
          silver: 85,
        },
        hiddenStats: {
          ...state.hiddenStats,
          silver: 85,
        },
      }));
      useGameFlowStore.getState().markNumericFeedbackEvent('chamber-action');
    });

    await waitFor(() => {
      expect(playConfiguredSfx).toHaveBeenCalledWith('cost');
    });
    expect(playConfiguredSfx).toHaveBeenCalledTimes(1);
  });
});
