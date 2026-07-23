/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_SETTINGS_STORAGE_KEY, GameAudioEngine, readAudioSettings } from './gameAudio';

class FakeAudioElement extends EventTarget {
  src: string;
  volume = 1;
  currentTime = 0;
  play = vi.fn((): Promise<void> => Promise.resolve());
  pause = vi.fn();

  constructor(src: string) {
    super();
    this.src = src;
  }

  end() {
    this.dispatchEvent(new Event('ended'));
  }
}

describe('GameAudioEngine', () => {
  const createdAudio: FakeAudioElement[] = [];

  beforeEach(() => {
    createdAudio.length = 0;
    localStorage.clear();
  });

  const createEngine = () =>
    new GameAudioEngine({
      createAudio: (src) => {
        const audio = new FakeAudioElement(src);
        createdAudio.push(audio);
        return audio as unknown as HTMLAudioElement;
      },
    });

  it('loops qingci and huihuan as a two-track bgm playlist', async () => {
    const engine = createEngine();

    await engine.startBgm();

    expect(createdAudio[0].src).toBe('/assets/audio/bgm/qingci.mp3');
    expect(createdAudio[0].play).toHaveBeenCalledTimes(1);

    createdAudio[0].end();
    await Promise.resolve();

    expect(createdAudio[1].src).toBe('/assets/audio/bgm/huihuan.mp3');
    expect(createdAudio[1].play).toHaveBeenCalledTimes(1);

    createdAudio[1].end();
    await Promise.resolve();

    expect(createdAudio[0].play).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed bgm start pending and retries after user activation', async () => {
    const engine = createEngine();
    createdAudio.length = 0;

    const firstPlay = vi.fn((): Promise<void> => Promise.resolve())
      .mockRejectedValueOnce(new Error('autoplay blocked'))
      .mockResolvedValueOnce();
    const retryEngine = new GameAudioEngine({
      createAudio: (src) => {
        const audio = new FakeAudioElement(src);
        audio.play = firstPlay;
        createdAudio.push(audio);
        return audio as unknown as HTMLAudioElement;
      },
    });

    await retryEngine.startBgm();
    expect(retryEngine.hasPendingBgmStart()).toBe(true);

    await retryEngine.resumePendingBgm();

    expect(firstPlay).toHaveBeenCalledTimes(2);
    expect(retryEngine.hasPendingBgmStart()).toBe(false);
  });

  it('does not play sfx when sound effects are muted', () => {
    const engine = createEngine();
    engine.setSettings({ musicVolume: 0.7, sfxVolume: 0 });

    engine.playSfx('click');

    expect(createdAudio.filter((audio) => audio.src === '/assets/audio/sfx/click.wav')).toHaveLength(0);
  });

  it('plays the added economy and promotion sound effects through the shared sfx volume', () => {
    const engine = createEngine();
    engine.setSettings({ musicVolume: 0.7, sfxVolume: 0.42 });

    engine.playSfx('cost');
    engine.playSfx('level-up');
    engine.playSfx('level-up-higher');

    const sfxAudio = createdAudio.slice(2);
    expect(sfxAudio.map((audio) => audio.src)).toEqual([
      '/assets/audio/sfx/cost.wav',
      '/assets/audio/sfx/level_up.mp3',
      '/assets/audio/sfx/level_up_higher.mp3',
    ]);
    expect(sfxAudio.map((audio) => audio.volume)).toEqual([0.42, 0.42, 0.42]);
  });

  it('persists and reads audio slider settings', () => {
    localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify({ musicVolume: 0.32, sfxVolume: 0.81 }));

    expect(readAudioSettings()).toEqual({ musicVolume: 0.32, sfxVolume: 0.81 });
  });
});
