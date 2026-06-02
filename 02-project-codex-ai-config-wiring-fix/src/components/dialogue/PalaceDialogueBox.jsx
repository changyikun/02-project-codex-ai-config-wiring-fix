import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { DIALOGUE_CONFIG } from '../../config/dialogueConfig';

const TYPEWRITER_INTERVAL_MS = 16;
const DEFAULT_TYPEWRITER_ENABLED = !(import.meta.env?.MODE === 'test' || import.meta.env?.VITEST);

/**
 * @typedef {{
 *   id: string
 *   label: string
 *   effectHint?: string
 * }} PalaceDialogueOption
 */

/**
 * @param {{
 *   characterIdentity: string
 *   characterName: string
 *   content: string
 *   highlightText?: string
 *   ariaLabel?: string
 *   className?: string
 *   nextActionLabel?: string
 *   nextActionKind?: string
 *   onNextAction?: (() => void) | undefined
 *   onAdvancePage?: (() => void) | undefined
 *   options?: PalaceDialogueOption[]
 *   onSelectOption?: ((optionId: string) => void) | undefined
 *   busy?: boolean
 *   controlsDisabled?: boolean
 *   contentDisabled?: boolean
 *   typewriter?: boolean
 * }} props
 */
export function GlobalDialogue({
  characterIdentity,
  characterName,
  content,
  highlightText,
  ariaLabel = '宫廷对话框',
  className = '',
  nextActionLabel,
  nextActionKind,
  onNextAction,
  onAdvancePage,
  options = [],
  onSelectOption,
  busy = false,
  controlsDisabled = busy,
  contentDisabled = false,
  typewriter = DEFAULT_TYPEWRITER_ENABLED,
}) {
  const rootClassName = ['palace-dialogue-box', className].filter(Boolean).join(' ');
  const hasOptions = options.length > 0;
  const contentText = content ?? '';
  const contentChars = useMemo(() => Array.from(contentText), [contentText]);
  const [visibleCharCount, setVisibleCharCount] = useState(0);
  const shouldUseTypewriter = typewriter && contentChars.length > 0;
  const isContentComplete = !shouldUseTypewriter || visibleCharCount >= contentChars.length;
  const displayedContent = useMemo(
    () => (shouldUseTypewriter ? contentChars.slice(0, visibleCharCount).join('') : contentText),
    [contentChars, contentText, shouldUseTypewriter, visibleCharCount],
  );
  const showOptions = hasOptions && isContentComplete;
  const contentInteractionDisabled = contentDisabled || showOptions;
  const showNextAction = false;
  const canAdvancePage = Boolean(onAdvancePage) && isContentComplete && !contentInteractionDisabled;
  const speakerLabel =
    characterIdentity && characterName && characterIdentity !== characterName
      ? `${characterIdentity} · ${characterName}`
      : characterName || characterIdentity;

  useLayoutEffect(() => {
    setVisibleCharCount(shouldUseTypewriter ? 0 : contentChars.length);
  }, [contentChars.length, contentText, shouldUseTypewriter]);

  useEffect(() => {
    if (!shouldUseTypewriter || isContentComplete) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleCharCount((currentCount) => Math.min(currentCount + 1, contentChars.length));
    }, TYPEWRITER_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [contentChars.length, isContentComplete, shouldUseTypewriter, visibleCharCount]);

  const handleContentClick = () => {
    if (contentInteractionDisabled) {
      return;
    }

    if (!isContentComplete) {
      setVisibleCharCount(contentChars.length);
      return;
    }

    if (onAdvancePage) {
      onAdvancePage();
      return;
    }

    if (!hasOptions && onNextAction) {
      onNextAction();
    }
  };

  const handleTextKeyDown = (event) => {
    if (contentInteractionDisabled) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleContentClick();
    }
  };

  const handleContentMouseDown = (event) => {
    if (contentInteractionDisabled) {
      event.preventDefault();
    }
  };

  return (
    <section
      className={rootClassName}
      aria-label={ariaLabel}
      data-dialogue-mode={hasOptions ? 'options' : 'next'}
      data-dialogue-component={DIALOGUE_CONFIG.componentName}
      data-dialogue-lock={DIALOGUE_CONFIG.lockVersion}
    >
      {showOptions ? (
        <div className="palace-dialogue-box__options" role="group" aria-label="对话分支选项">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="palace-dialogue-box__option"
              onClick={() => onSelectOption?.(option.id)}
              disabled={controlsDisabled || !onSelectOption}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="palace-dialogue-box__content"
        onClick={handleContentClick}
        onMouseDown={handleContentMouseDown}
        data-typing={isContentComplete ? 'complete' : 'typing'}
        data-dialogue-page-state={canAdvancePage ? 'more' : 'last'}
        data-dialogue-interaction={contentInteractionDisabled ? 'disabled' : 'enabled'}
      >
        <header className="palace-dialogue-box__speaker">{speakerLabel}</header>
        <div className="palace-dialogue-box__text-container" aria-busy={busy}>
          <div className="palace-dialogue-box__text-plate">
            <div
              className="palace-dialogue-box__text-scroll"
              tabIndex={contentInteractionDisabled ? -1 : 0}
              aria-label={!isContentComplete ? '对话正文，点击显示完整内容' : canAdvancePage ? '对话正文，点击翻页' : '对话正文'}
              onKeyDown={handleTextKeyDown}
              data-typing={isContentComplete ? 'complete' : 'typing'}
            >
              <p className="palace-dialogue-box__text">{displayedContent}</p>
              {highlightText && isContentComplete ? <p className="palace-dialogue-box__highlight">{highlightText}</p> : null}
            </div>
          </div>
        </div>
        {showNextAction ? (
          <button
            type="button"
            className="palace-dialogue-box__next"
            data-next-action-kind={nextActionKind}
            onClick={onNextAction}
            disabled={controlsDisabled || !onNextAction}
          >
            {nextActionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export const PalaceDialogueBox = GlobalDialogue;
