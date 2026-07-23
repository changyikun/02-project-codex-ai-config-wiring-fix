/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { GlobalDialogue } from '../components/dialogue/PalaceDialogueBox';

const readAppStylesheet = () => readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

const getCssRuleBlock = (stylesheet: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
};

describe('dialogue toolbar style', () => {
  it('keeps tools in the lower right of the text box and active fast-forward only changes text', () => {
    render(
      <GlobalDialogue
        characterIdentity="旁白"
        characterName="寝殿"
        content="窗外灯影晃了晃。"
        typewriter={false}
        fastForwardActive
        onToggleFastForward={vi.fn()}
      />,
    );

    const fastForwardButton = screen.getByRole('button', { name: /快进/ });
    expect(fastForwardButton).toHaveClass('is-active');
    expect(fastForwardButton).toHaveTextContent(/快进中/);

    const stylesheet = readAppStylesheet();
    const toolsRule = getCssRuleBlock(stylesheet, '.palace-dialogue-box__tools');
    const buttonRule = getCssRuleBlock(stylesheet, '.palace-dialogue-box__tool-button');
    const fastForwardRule = getCssRuleBlock(stylesheet, '.palace-dialogue-box__tool-button--fast-forward');
    const toolTextRule = getCssRuleBlock(stylesheet, '.palace-dialogue-box__tool-text');
    const fastForwardTextRule = getCssRuleBlock(
      stylesheet,
      '.palace-dialogue-box__tool-button--fast-forward .palace-dialogue-box__tool-text',
    );
    const activeButtonRule = getCssRuleBlock(stylesheet, '.palace-dialogue-box__tool-button.is-active');
    const activeTextRule = getCssRuleBlock(stylesheet, '.palace-dialogue-box__tool-button.is-active .palace-dialogue-box__tool-text');
    const dotsRule = getCssRuleBlock(stylesheet, '.palace-dialogue-box__fast-forward-dots');
    const iconRule = getCssRuleBlock(stylesheet, '.palace-dialogue-box__tool-icon');

    const fastForwardLabel = fastForwardButton.querySelector('.palace-dialogue-box__tool-label');
    const fastForwardSuffix = fastForwardButton.querySelector('.palace-dialogue-box__tool-suffix');
    const fastForwardDots = fastForwardButton.querySelectorAll('.palace-dialogue-box__fast-forward-dot');

    expect(toolsRule).toMatch(/bottom:\s*clamp\(-2[0-9]px,\s*-1(?:\.\d+)?vw,\s*-1[0-9]px\)/);
    expect(toolsRule).toMatch(/right:\s*clamp\(4[0-9]px,\s*4(?:\.\d+)?vw,\s*6[0-9]px\)/);
    expect(buttonRule).toMatch(/justify-content:\s*flex-start/);
    expect(buttonRule).toMatch(/min-width:\s*clamp\(7[0-9]px,\s*6(?:\.\d+)?vw,\s*9[0-9]px\)/);
    expect(buttonRule).toMatch(/height:\s*clamp\(2[0-9]px,\s*2(?:\.\d+)?vw,\s*3[0-9]px\)/);
    expect(buttonRule).toMatch(/padding:\s*0\s+10px\s+1px\s+3[0-9]px/);
    expect(buttonRule).toMatch(/font-size:\s*clamp\(14px,\s*0\.\d+vw,\s*16px\)/);
    expect(iconRule).toMatch(/width:\s*clamp\(16px,\s*1(?:\.\d+)?vw,\s*20px\)/);
    expect(fastForwardRule).toMatch(/min-width:\s*clamp\(11[0-9]px,\s*7(?:\.\d+)?vw,\s*13[0-9]px\)/);
    expect(toolTextRule).toMatch(/justify-content:\s*flex-start/);
    expect(fastForwardTextRule).toMatch(/min-width:\s*5\.\d+em/);
    expect(activeButtonRule).not.toMatch(/animation|filter|brightness/);
    expect(activeTextRule).toMatch(/color:/);
    expect(dotsRule).toMatch(/width:\s*1\.2em/);
    expect(fastForwardLabel).toHaveTextContent('\u5feb\u8fdb');
    expect(fastForwardSuffix).toHaveTextContent('\u4e2d');
    expect(fastForwardDots).toHaveLength(3);
  });
});
