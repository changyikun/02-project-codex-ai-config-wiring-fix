import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_AUDIO_SETTINGS,
  GameAudioEngine,
  type AudioSettings,
  type SfxKey,
  isSfxKey,
  readAudioSettings,
  writeAudioSettings,
} from './gameAudio';

const CLOSE_ACTION_PATTERN = /关闭|取消|返回|离开|回宫|收起/;

const isDisabledControl = (element: HTMLElement): boolean => {
  if (element instanceof HTMLButtonElement) {
    return element.disabled;
  }
  return element.getAttribute('aria-disabled') === 'true';
};

const getButtonLabel = (element: HTMLElement): string =>
  [element.getAttribute('aria-label'), element.getAttribute('title'), element.textContent].filter(Boolean).join(' ');

const getClickSfxKey = (button: HTMLElement): SfxKey | undefined => {
  const explicitSfx = button.dataset.audioSfx;
  if (explicitSfx === 'none') {
    return undefined;
  }
  if (isSfxKey(explicitSfx)) {
    return explicitSfx;
  }
  if (button.closest('.palace-sidebar__diamond')) {
    return undefined;
  }
  return CLOSE_ACTION_PATTERN.test(getButtonLabel(button)) ? 'panel-close' : 'click';
};

export function useGameAudio(options: { autoStart?: boolean; enableUiSfx?: boolean } = {}) {
  const { autoStart = true, enableUiSfx = true } = options;
  const [settings, setSettingsState] = useState<AudioSettings>(() => readAudioSettings());
  const engineRef = useRef<GameAudioEngine>();
  const hoveredSidebarButtonsRef = useRef<WeakSet<Element>>(new WeakSet());

  if (!engineRef.current) {
    engineRef.current = new GameAudioEngine({ settings });
  }

  useEffect(() => {
    engineRef.current?.setSettings(settings);
    writeAudioSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!autoStart) {
      return undefined;
    }
    void engineRef.current?.startBgm();

    const resumeAudio = () => {
      void engineRef.current?.resumePendingBgm();
    };

    window.addEventListener('pointerdown', resumeAudio, { passive: true });
    window.addEventListener('keydown', resumeAudio);
    return () => {
      window.removeEventListener('pointerdown', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
  }, [autoStart]);

  useEffect(() => {
    if (!enableUiSfx) {
      return undefined;
    }

    const playSfx = (key: SfxKey) => {
      engineRef.current?.playSfx(key);
    };

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const button = event.target.closest<HTMLElement>('button, [role="button"]');
      if (!button || isDisabledControl(button)) {
        return;
      }
      const key = getClickSfxKey(button);
      if (key) {
        playSfx(key);
      }
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const button = event.target.closest<HTMLElement>('.palace-sidebar__diamond');
      if (!button || isDisabledControl(button) || hoveredSidebarButtonsRef.current.has(button)) {
        return;
      }
      hoveredSidebarButtonsRef.current.add(button);
      playSfx('menu');
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const button = event.target.closest<HTMLElement>('.palace-sidebar__diamond');
      if (!button) {
        return;
      }
      if (event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) {
        return;
      }
      hoveredSidebarButtonsRef.current.delete(button);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const button = event.target.closest<HTMLElement>('.palace-sidebar__diamond');
      if (button && !isDisabledControl(button)) {
        playSfx('menu');
      }
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('pointerover', handlePointerOver, true);
    document.addEventListener('pointerout', handlePointerOut, true);
    document.addEventListener('focusin', handleFocusIn, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('pointerover', handlePointerOver, true);
      document.removeEventListener('pointerout', handlePointerOut, true);
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [enableUiSfx]);

  const setAudioSettings = useCallback((nextSettings: AudioSettings) => {
    setSettingsState({
      musicVolume: Math.min(1, Math.max(0, nextSettings.musicVolume)),
      sfxVolume: Math.min(1, Math.max(0, nextSettings.sfxVolume)),
    });
  }, []);

  return {
    musicVolume: settings.musicVolume,
    sfxVolume: settings.sfxVolume,
    setMusicVolume: useCallback((musicVolume: number) => setAudioSettings({ ...settings, musicVolume }), [setAudioSettings, settings]),
    setSfxVolume: useCallback((sfxVolume: number) => setAudioSettings({ ...settings, sfxVolume }), [setAudioSettings, settings]),
    setAudioSettings,
    playSfx: useCallback((key: SfxKey) => engineRef.current?.playSfx(key), []),
    defaultSettings: DEFAULT_AUDIO_SETTINGS,
  };
}
