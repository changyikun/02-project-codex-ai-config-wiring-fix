/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import { PalaceStatusBar } from './PalaceStatusBar';

describe('PalaceStatusBar', () => {
  afterEach(() => {
    vi.useRealTimers();
    act(() => {
      useGameFlowStore.setState((state) => ({
        ...state,
        time: {
          ...state.time,
          year: 1,
          month: 1,
          xun: 1,
          slot: '清晨',
        },
        state: {
          ...state.state,
          silver: 1000,
          stamina: 5,
        },
      }));
    });
  });

  it('renders time, silver, and stamina as separate persistent strips', () => {
    act(() => {
      useGameFlowStore.setState((state) => ({
        ...state,
        time: {
          ...state.time,
          year: 2,
          month: 3,
          xun: 2,
          slot: '上午',
        },
        state: {
          ...state.state,
          silver: 880,
          stamina: 4,
        },
      }));
    });

    render(<PalaceStatusBar />);

    const status = screen.getByLabelText('时间状态');
    const items = within(status).getAllByRole('listitem');

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveClass('palace-status__item', 'palace-status__item--time');
    expect(items[1]).toHaveClass('palace-status__item', 'palace-status__item--silver');
    expect(items[2]).toHaveClass('palace-status__item', 'palace-status__item--stamina');
    expect(items[0]).toHaveTextContent('二年三月二旬上午');
    expect(items[0].querySelector('.palace-status__time-date')).toHaveAccessibleName('二年三月二旬');
    expect(items[0].querySelector('.palace-status__time-slot')).toHaveAccessibleName('上午');
    expect(items[1]).toHaveTextContent('银两：880');
    expect(items[2]).toHaveTextContent('体力：4');
  });

  it('flips a complete calendar page only after time changes', () => {
    vi.useFakeTimers();

    act(() => {
      useGameFlowStore.setState((state) => ({
        ...state,
        time: {
          ...state.time,
          year: 1,
          month: 1,
          xun: 1,
          slot: '清晨',
        },
      }));
    });

    const { container } = render(<PalaceStatusBar />);

    expect(container.querySelector('.palace-status__time-page--flip')).not.toBeInTheDocument();

    act(() => {
      useGameFlowStore.setState((state) => ({
        ...state,
        time: {
          ...state.time,
          slot: '上午',
        },
      }));
    });

    const timeItem = container.querySelector('.palace-status__item--time');
    const flipPage = container.querySelector('.palace-status__time-page--flip');

    expect(timeItem).toHaveClass('is-flipping');
    expect(flipPage).toBeInTheDocument();
    expect(flipPage).toHaveTextContent('一年一月一旬上午');

    act(() => {
      vi.advanceTimersByTime(640);
    });

    expect(container.querySelector('.palace-status__time-page--flip')).not.toBeInTheDocument();
    expect(timeItem).not.toHaveClass('is-flipping');
    expect(timeItem).toHaveTextContent('一年一月一旬上午');

    vi.useRealTimers();
  });
});
