export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
}

export type SfxKey = 'click' | 'menu' | 'panel-open' | 'panel-close' | 'cost' | 'level-up' | 'level-up-higher';

type AudioFactory = (src: string) => HTMLAudioElement | undefined;

export const AUDIO_SETTINGS_STORAGE_KEY = 'palace-ai-game.audio-settings.v1';
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.7,
};

export const BGM_TRACKS = ['/assets/audio/bgm/qingci.mp3', '/assets/audio/bgm/huihuan.mp3'] as const;

const SFX_TRACKS: Record<SfxKey, string> = {
  click: '/assets/audio/sfx/click.wav',
  menu: '/assets/audio/sfx/menu.wav',
  'panel-open': '/assets/audio/sfx/panel_open.wav',
  'panel-close': '/assets/audio/sfx/panel_close.wav',
  cost: '/assets/audio/sfx/cost.wav',
  'level-up': '/assets/audio/sfx/level_up.mp3',
  'level-up-higher': '/assets/audio/sfx/level_up_higher.mp3',
};

const clampVolume = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
};

const readStorage = (): Storage | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

export const readAudioSettings = (): AudioSettings => {
  const storage = readStorage();
  if (!storage) {
    return DEFAULT_AUDIO_SETTINGS;
  }

  try {
    const parsed = JSON.parse(storage.getItem(AUDIO_SETTINGS_STORAGE_KEY) ?? 'null') as Partial<AudioSettings> | null;
    return {
      musicVolume: clampVolume(parsed?.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
      sfxVolume: clampVolume(parsed?.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume),
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
};

export const writeAudioSettings = (settings: AudioSettings) => {
  const storage = readStorage();
  if (!storage) {
    return;
  }
  storage.setItem(
    AUDIO_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      musicVolume: clampVolume(settings.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
      sfxVolume: clampVolume(settings.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume),
    }),
  );
};

const createDefaultAudio: AudioFactory = (src) => {
  const AudioConstructor = typeof Audio === 'undefined' ? undefined : Audio;
  if (!AudioConstructor) {
    return undefined;
  }
  if (import.meta.env.MODE === 'test' && !('_isMockFunction' in AudioConstructor)) {
    return undefined;
  }
  return new AudioConstructor(src);
};

export const isSfxKey = (value: unknown): value is SfxKey => typeof value === 'string' && value in SFX_TRACKS;

const playAudioElement = (audio: HTMLAudioElement) => {
  try {
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === 'function') {
      void playResult.catch(() => undefined);
    }
  } catch {
    // Audio playback is best-effort and must never block UI interaction.
  }
};

export const playConfiguredSfx = (key: SfxKey) => {
  const { sfxVolume } = readAudioSettings();
  if (sfxVolume <= 0) {
    return;
  }
  const audio = createDefaultAudio(SFX_TRACKS[key]);
  if (!audio) {
    return;
  }
  audio.volume = sfxVolume;
  playAudioElement(audio);
};

export class GameAudioEngine {
  private readonly createAudio: AudioFactory;
  private readonly bgmTracks: HTMLAudioElement[];
  private settings: AudioSettings;
  private currentBgmIndex = 0;
  private bgmRequested = false;
  private pendingBgmStart = false;

  constructor(options: { createAudio?: AudioFactory; settings?: AudioSettings } = {}) {
    this.createAudio = options.createAudio ?? createDefaultAudio;
    this.settings = options.settings ?? readAudioSettings();
    this.bgmTracks = BGM_TRACKS.map((src) => this.createAudio(src)).filter(
      (audio): audio is HTMLAudioElement => Boolean(audio),
    );

    this.bgmTracks.forEach((audio, index) => {
      audio.loop = false;
      audio.preload = 'auto';
      audio.volume = this.settings.musicVolume;
      audio.addEventListener('ended', () => {
        if (!this.bgmRequested) {
          return;
        }
        this.currentBgmIndex = (index + 1) % this.bgmTracks.length;
        void this.playCurrentBgm();
      });
    });
  }

  setSettings(settings: AudioSettings) {
    const wasMusicMuted = this.settings.musicVolume <= 0;
    this.settings = {
      musicVolume: clampVolume(settings.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
      sfxVolume: clampVolume(settings.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume),
    };
    this.bgmTracks.forEach((audio) => {
      audio.volume = this.settings.musicVolume;
    });
    if (this.bgmRequested && wasMusicMuted && this.settings.musicVolume > 0) {
      void this.playCurrentBgm();
    }
  }

  async startBgm() {
    this.bgmRequested = true;
    await this.playCurrentBgm();
  }

  async resumePendingBgm() {
    if (!this.pendingBgmStart && this.bgmRequested) {
      return;
    }
    this.bgmRequested = true;
    await this.playCurrentBgm();
  }

  hasPendingBgmStart() {
    return this.pendingBgmStart;
  }

  playSfx(key: SfxKey) {
    if (this.settings.sfxVolume <= 0) {
      return;
    }
    const audio = this.createAudio(SFX_TRACKS[key]);
    if (!audio) {
      return;
    }
    audio.volume = this.settings.sfxVolume;
    playAudioElement(audio);
  }

  private async playCurrentBgm() {
    const audio = this.bgmTracks[this.currentBgmIndex];
    if (!audio || this.settings.musicVolume <= 0) {
      this.pendingBgmStart = false;
      return;
    }

    audio.volume = this.settings.musicVolume;
    try {
      const playResult = audio.play();
      if (playResult && typeof playResult.then === 'function') {
        await playResult;
      }
      this.pendingBgmStart = false;
    } catch {
      this.pendingBgmStart = true;
    }
  }
}

export const getStoredSfxVolume = () => readAudioSettings().sfxVolume;
