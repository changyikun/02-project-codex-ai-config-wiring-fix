/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { GameSettingsDialog } from '../components/settings/GameSettingsDialog';

const readAppStylesheet = () => readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

const getCssRuleBlock = (stylesheet: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
};

describe('game settings dialog style', () => {
  it('keeps volume labels on one line and centers the close button in both reused dialogs', () => {
    render(<GameSettingsDialog onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toHaveClass('game-settings-dialog-backdrop');
    expect(screen.getByRole('button', { name: /\u5173\u95ed/ })).toHaveClass('start-scene__settings-close');

    const stylesheet = readAppStylesheet();
    const rowRule = getCssRuleBlock(stylesheet, '.start-scene__settings-row');
    const labelRule = getCssRuleBlock(stylesheet, '.start-scene__settings-row span');
    const closeRule = getCssRuleBlock(stylesheet, '.start-scene__settings-close');

    expect(rowRule).toMatch(/grid-template-columns:\s*112px\s+minmax\(0,\s*1fr\)\s+54px/);
    expect(labelRule).toMatch(/white-space:\s*nowrap/);
    expect(labelRule).toMatch(/text-align:\s*left/);
    expect(closeRule).toMatch(/display:\s*block/);
    expect(closeRule).toMatch(/margin:\s*0\s+auto/);
  });
});
