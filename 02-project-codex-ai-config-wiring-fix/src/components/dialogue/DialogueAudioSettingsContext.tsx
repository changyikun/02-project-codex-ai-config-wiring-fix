import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from '../../game/audio/gameAudio';

interface DialogueAudioSettingsContextValue {
  audioSettings: AudioSettings;
  onAudioSettingsChange?: (settings: AudioSettings) => void;
}

const DialogueAudioSettingsContext = createContext<DialogueAudioSettingsContextValue>({
  audioSettings: DEFAULT_AUDIO_SETTINGS,
});

export function DialogueAudioSettingsProvider({
  audioSettings,
  onAudioSettingsChange,
  children,
}: DialogueAudioSettingsContextValue & { children: ReactNode }) {
  return (
    <DialogueAudioSettingsContext.Provider value={{ audioSettings, onAudioSettingsChange }}>
      {children}
    </DialogueAudioSettingsContext.Provider>
  );
}

export const useDialogueAudioSettings = () => useContext(DialogueAudioSettingsContext);
