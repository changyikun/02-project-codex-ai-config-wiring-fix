/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playConfiguredSfx } from '../../game/audio/gameAudio';
import type { SettlementReport } from '../../game/types';
import { PromotionEdictStage } from './PromotionEdictStage';

vi.mock('../../game/audio/gameAudio', async () => {
  const actual = await vi.importActual<typeof import('../../game/audio/gameAudio')>('../../game/audio/gameAudio');
  return {
    ...actual,
    playConfiguredSfx: vi.fn(),
  };
});

const report: SettlementReport = {
  id: 'rank-promotion-test',
  kind: 'promotion',
  year: 1,
  month: 2,
  xun: 1,
  title: '晋封旨意',
  summary: '由官女子晋为答应。',
  lines: ['由官女子晋为答应。'],
};

describe('PromotionEdictStage audio', () => {
  afterEach(() => {
    vi.mocked(playConfiguredSfx).mockClear();
  });

  it('plays the promotion sound when the edict reveal stage starts', async () => {
    const { container } = render(<PromotionEdictStage report={report} onComplete={vi.fn()} />);

    expect(playConfiguredSfx).not.toHaveBeenCalled();

    const dialogueContent = container.querySelector('.palace-dialogue-box__content');
    expect(dialogueContent).toBeInTheDocument();
    fireEvent.click(dialogueContent as Element);

    await waitFor(() => {
      expect(container.querySelector('.promotion-edict-stage__reveal')).toBeInTheDocument();
      expect(playConfiguredSfx).toHaveBeenCalledWith('level-up');
    });
    expect(playConfiguredSfx).toHaveBeenCalledTimes(1);
  });

  it('uses the higher-rank promotion sound for consort-rank promotions to fei and above', async () => {
    const higherReport: SettlementReport = {
      ...report,
      id: 'rank-promotion-high-test',
      summary: '由嫔晋为妃。',
      lines: ['由嫔晋为妃。'],
    };
    const { container } = render(<PromotionEdictStage report={higherReport} onComplete={vi.fn()} />);

    const dialogueContent = container.querySelector('.palace-dialogue-box__content');
    fireEvent.click(dialogueContent as Element);

    await waitFor(() => {
      expect(playConfiguredSfx).toHaveBeenCalledWith('level-up-higher');
    });
    expect(playConfiguredSfx).toHaveBeenCalledTimes(1);
  });
});
