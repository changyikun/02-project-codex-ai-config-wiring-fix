import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from '../../game/audio/gameAudio';

interface GameSettingsDialogProps {
  audioSettings?: AudioSettings;
  onAudioSettingsChange?: (settings: AudioSettings) => void;
  onClose: () => void;
  idPrefix?: string;
  variant?: 'start' | 'dialogue';
}

export function GameSettingsDialog({
  audioSettings = DEFAULT_AUDIO_SETTINGS,
  onAudioSettingsChange,
  onClose,
  idPrefix = 'game-settings',
  variant = 'start',
}: GameSettingsDialogProps) {
  const musicPercent = Math.round(audioSettings.musicVolume * 100);
  const sfxPercent = Math.round(audioSettings.sfxVolume * 100);
  const backdropClassName =
    variant === 'dialogue'
      ? 'start-scene__settings-backdrop game-settings-dialog-backdrop game-settings-dialog-backdrop--dialogue'
      : 'start-scene__settings-backdrop game-settings-dialog-backdrop';

  const updateMusicVolume = (value: string) => {
    onAudioSettingsChange?.({ ...audioSettings, musicVolume: Number(value) / 100 });
  };
  const updateSfxVolume = (value: string) => {
    onAudioSettingsChange?.({ ...audioSettings, sfxVolume: Number(value) / 100 });
  };

  return (
    <section className={backdropClassName} role="dialog" aria-label="游戏设置" aria-modal="true">
      <div className="start-scene__settings-panel">
        <h2>游戏设置</h2>
        <div className="start-scene__settings-controls">
          <label className="start-scene__settings-row" htmlFor={`${idPrefix}-music-volume`}>
            <span>音乐音量</span>
            <input
              id={`${idPrefix}-music-volume`}
              type="range"
              min="0"
              max="100"
              step="1"
              value={musicPercent}
              aria-label="音乐音量"
              data-audio-sfx="none"
              onChange={(event) => updateMusicVolume(event.target.value)}
            />
            <strong>{musicPercent}%</strong>
          </label>
          <label className="start-scene__settings-row" htmlFor={`${idPrefix}-sfx-volume`}>
            <span>音效音量</span>
            <input
              id={`${idPrefix}-sfx-volume`}
              type="range"
              min="0"
              max="100"
              step="1"
              value={sfxPercent}
              aria-label="音效音量"
              data-audio-sfx="none"
              onChange={(event) => updateSfxVolume(event.target.value)}
            />
            <strong>{sfxPercent}%</strong>
          </label>
        </div>
        <button
          type="button"
          className="start-scene__confirm-button start-scene__settings-close is-secondary"
          aria-label="关闭设置"
          data-audio-sfx="panel-close"
          onClick={onClose}
        >
          关闭
        </button>
      </div>
    </section>
  );
}
