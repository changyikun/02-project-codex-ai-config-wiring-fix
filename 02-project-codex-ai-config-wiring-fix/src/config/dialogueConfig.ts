import type { CSSProperties } from 'react';

export const DIALOGUE_CONFIG = {
  componentName: 'GlobalDialogue',
  lockVersion: 'global-dialogue-lock-v1',
  portrait: {
    top: '74px',
    width: '40%',
    height: '68%',
    maxWidth: '620px',
    maxHeight: '560px',
  },
  box: {
    left: '54px',
    right: '54px',
    bottom: '22px',
    height: '214px',
  },
  frame: {
    image: "url('/assets/dialogue/dialog-box-opaque-floral.png')",
    borderWidth: '60px',
    contentInset: '-60px',
    borderSlice: '60 fill',
  },
  speaker: {
    top: '16px',
    minWidth: '360px',
    maxWidth: '460px',
  },
  options: {
    liftAboveSpeaker: '46px',
  },
} as const;

export const getDialogueRootStyle = (): CSSProperties =>
  ({
    '--global-dialogue-portrait-top': DIALOGUE_CONFIG.portrait.top,
    '--global-dialogue-portrait-width': DIALOGUE_CONFIG.portrait.width,
    '--global-dialogue-portrait-height': DIALOGUE_CONFIG.portrait.height,
    '--global-dialogue-portrait-max-width': DIALOGUE_CONFIG.portrait.maxWidth,
    '--global-dialogue-portrait-max-height': DIALOGUE_CONFIG.portrait.maxHeight,
    '--global-dialogue-box-left': DIALOGUE_CONFIG.box.left,
    '--global-dialogue-box-right': DIALOGUE_CONFIG.box.right,
    '--global-dialogue-box-bottom': DIALOGUE_CONFIG.box.bottom,
    '--global-dialogue-box-height': DIALOGUE_CONFIG.box.height,
    '--global-dialogue-frame-image': DIALOGUE_CONFIG.frame.image,
    '--global-dialogue-frame-border': DIALOGUE_CONFIG.frame.borderWidth,
    '--global-dialogue-frame-content-inset': DIALOGUE_CONFIG.frame.contentInset,
    '--global-dialogue-frame-slice': DIALOGUE_CONFIG.frame.borderSlice,
    '--global-dialogue-speaker-top': DIALOGUE_CONFIG.speaker.top,
    '--global-dialogue-speaker-min-width': DIALOGUE_CONFIG.speaker.minWidth,
    '--global-dialogue-speaker-max-width': DIALOGUE_CONFIG.speaker.maxWidth,
    '--global-dialogue-option-lift': DIALOGUE_CONFIG.options.liftAboveSpeaker,
  }) as CSSProperties;
