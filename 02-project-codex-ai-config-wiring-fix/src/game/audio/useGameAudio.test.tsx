/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameAudio } from './useGameAudio';

class FakeAudioElement extends EventTarget {
  src: string;
  volume = 1;
  loop = false;
  preload = '';
  play = vi.fn((): Promise<void> => Promise.resolve());

  constructor(src: string) {
    super();
    this.src = src;
  }
}

const createdAudio: FakeAudioElement[] = [];

function AudioHarness() {
  useGameAudio({ autoStart: false });
  return (
    <button type="button" className="palace-sidebar__diamond">
      <span>地图</span>
    </button>
  );
}

describe('useGameAudio', () => {
  beforeEach(() => {
    createdAudio.length = 0;
    localStorage.clear();
    vi.stubGlobal(
      'Audio',
      vi.fn((src: string) => {
        const audio = new FakeAudioElement(src);
        createdAudio.push(audio);
        return audio;
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('plays menu.wav when palace sidebar buttons expand on hover and focus', () => {
    render(<AudioHarness />);

    const sidebarButton = screen.getByRole('button', { name: '地图' });
    fireEvent.pointerOver(sidebarButton);
    fireEvent.pointerOver(sidebarButton);
    fireEvent.focus(sidebarButton);

    const menuSfx = createdAudio.filter((audio) => audio.src === '/assets/audio/sfx/menu.wav');
    expect(menuSfx).toHaveLength(2);
    expect(menuSfx.every((audio) => audio.play.mock.calls.length === 1)).toBe(true);
  });

  it('allows the same sidebar button to play menu.wav again after hover leaves', () => {
    render(<AudioHarness />);

    const sidebarButton = screen.getByRole('button', { name: '地图' });
    fireEvent.pointerOver(sidebarButton);
    fireEvent.pointerOut(sidebarButton, { relatedTarget: document.body });
    fireEvent.pointerOver(sidebarButton);

    expect(createdAudio.filter((audio) => audio.src === '/assets/audio/sfx/menu.wav')).toHaveLength(2);
  });
});
