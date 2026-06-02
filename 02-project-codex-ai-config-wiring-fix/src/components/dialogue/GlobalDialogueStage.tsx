import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DIALOGUE_CONFIG } from '../../config/dialogueConfig';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { NumericFeedbackBucket } from '../../game/types';
import { GlobalDialogue } from './PalaceDialogueBox';

const DIALOGUE_PAGE_CHAR_LIMIT = 80;
export const DIALOGUE_EXPLICIT_PAGE_BREAK = '\n<<PAGE_BREAK>>\n';
const narrationIdentity = '场景旁白';
const quotedTextPattern = /“([^”]+)”/g;
const nonSpeechQuoteContextPattern = /(纸上|账册|册上|案卷|供状|方子|药名|写着|写的是|批注|只剩|辨认|字样|四个字|这句|那句|回话)$/u;
const speechPunctuationPattern = /[，,。！？!?；;]/u;

const countChars = (text: string): number => Array.from(text).length;

interface DialogueScriptSegment {
  characterIdentity: string;
  characterName: string;
  content: string;
  isNarration: boolean;
}

export interface DialoguePortraitSegment {
  characterIdentity: string;
  characterName: string;
  isNarration: boolean;
}

export interface DialoguePortraitConfig {
  label: string;
  portrait: ReactNode;
  placement?: 'stage' | 'dialogue-left';
}

const normalizeSegmentText = (text: string): string => text.replace(/\n{3,}/g, '\n\n').trim();

const isLikelySpeechQuote = (quoteText: string, precedingText: string): boolean => {
  const normalizedQuote = quoteText.trim();
  if (!normalizedQuote) {
    return false;
  }

  const contextTail = precedingText.replace(/\s+/g, '').slice(-24);
  if (nonSpeechQuoteContextPattern.test(contextTail)) {
    return false;
  }

  return speechPunctuationPattern.test(normalizedQuote);
};

const mergeAdjacentSegments = (segments: DialogueScriptSegment[]): DialogueScriptSegment[] => {
  const merged: DialogueScriptSegment[] = [];

  segments.forEach((segment) => {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.isNarration === segment.isNarration &&
      previous.characterIdentity === segment.characterIdentity &&
      previous.characterName === segment.characterName
    ) {
      previous.content = normalizeSegmentText(`${previous.content}\n${segment.content}`);
      return;
    }

    merged.push({ ...segment });
  });

  return merged;
};

const buildDialogueScriptSegments = (input: {
  content: string;
  characterIdentity: string;
  characterName: string;
  narrationName: string;
  quotedSpeakerIdentity?: string;
  quotedSpeakerName?: string;
  splitQuotedDialogue: boolean;
}): DialogueScriptSegment[] => {
  const content = input.content ?? '';
  if (!input.splitQuotedDialogue || !quotedTextPattern.test(content)) {
    quotedTextPattern.lastIndex = 0;
    return [
      {
        characterIdentity: input.characterIdentity,
        characterName: input.characterName,
        content,
        isNarration: input.characterIdentity === narrationIdentity,
      },
    ];
  }

  quotedTextPattern.lastIndex = 0;
  const segments: DialogueScriptSegment[] = [];
  let lastIndex = 0;
  let narrationBuffer = '';
  let match: RegExpExecArray | null;

  const pushNarration = () => {
    const text = normalizeSegmentText(narrationBuffer);
    if (!text) {
      narrationBuffer = '';
      return;
    }

    segments.push({
      characterIdentity: narrationIdentity,
      characterName: input.narrationName,
      content: text,
      isNarration: true,
    });
    narrationBuffer = '';
  };

  while ((match = quotedTextPattern.exec(content)) !== null) {
    const quoteWithMarks = match[0];
    const quoteText = match[1] ?? '';
    const beforeQuote = content.slice(lastIndex, match.index);
    const precedingText = `${narrationBuffer}${beforeQuote}`;
    const isSpeech = isLikelySpeechQuote(quoteText, precedingText);

    if (!isSpeech) {
      narrationBuffer += `${beforeQuote}${quoteWithMarks}`;
      lastIndex = match.index + quoteWithMarks.length;
      continue;
    }

    narrationBuffer += beforeQuote;
    pushNarration();
    segments.push({
      characterIdentity: input.quotedSpeakerIdentity ?? input.characterIdentity,
      characterName: input.quotedSpeakerName ?? input.characterName,
      content: quoteText.trim(),
      isNarration: false,
    });
    lastIndex = match.index + quoteWithMarks.length;
  }

  narrationBuffer += content.slice(lastIndex);
  pushNarration();

  return mergeAdjacentSegments(segments).filter((segment) => normalizeSegmentText(segment.content).length > 0);
};

const splitLongParagraph = (paragraph: string): string[] => {
  const sentences = paragraph.match(/[^。！？；.!?;]+[。！？；.!?;]?/g) ?? [paragraph];
  const pages: string[] = [];
  let currentPage = '';

  sentences.forEach((sentence) => {
    const nextPage = currentPage ? `${currentPage}${sentence}` : sentence;
    if (currentPage && countChars(nextPage) > DIALOGUE_PAGE_CHAR_LIMIT) {
      pages.push(currentPage);
      currentPage = sentence;
      return;
    }
    currentPage = nextPage;
  });

  if (currentPage) {
    pages.push(currentPage);
  }

  return pages;
};

const splitDialogueContentPages = (content: string): string[] => {
  if (content.includes(DIALOGUE_EXPLICIT_PAGE_BREAK)) {
    const explicitPages = content
      .split(DIALOGUE_EXPLICIT_PAGE_BREAK)
      .map((page) => normalizeSegmentText(page))
      .filter(Boolean);

    if (explicitPages.length > 0) {
      return explicitPages;
    }
  }

  const paragraphs = content
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1 && countChars(content) <= DIALOGUE_PAGE_CHAR_LIMIT) {
    return [content];
  }

  const pages: string[] = [];
  let currentPage = '';

  paragraphs.forEach((paragraph) => {
    const paragraphParts = countChars(paragraph) > DIALOGUE_PAGE_CHAR_LIMIT ? splitLongParagraph(paragraph) : [paragraph];

    paragraphParts.forEach((part) => {
      const nextPage = currentPage ? `${currentPage}\n${part}` : part;
      if (currentPage && countChars(nextPage) > DIALOGUE_PAGE_CHAR_LIMIT) {
        pages.push(currentPage);
        currentPage = part;
        return;
      }
      currentPage = nextPage;
    });
  });

  if (currentPage) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [''];
};

interface GlobalDialogueOption {
  id: string;
  label: string;
  effectHint?: string;
}

interface GlobalDialogueStageProps {
  sceneLabel: string;
  portraitLabel: string;
  portrait?: ReactNode;
  resolvePortrait?: (segment: DialoguePortraitSegment) => DialoguePortraitConfig | undefined;
  narrationName?: string;
  quotedSpeakerIdentity?: string;
  quotedSpeakerName?: string;
  splitQuotedDialogue?: boolean;
  characterIdentity: string;
  characterName: string;
  content: string;
  highlightText?: string;
  ariaLabel?: string;
  className?: string;
  dialogueClassName?: string;
  suppressPortrait?: boolean;
  nextActionLabel?: string;
  onNextAction?: (() => void) | undefined;
  options?: GlobalDialogueOption[];
  onSelectOption?: ((optionId: string) => void) | undefined;
  busy?: boolean;
  controlsDisabled?: boolean;
  typewriter?: boolean;
  numericFeedbackBucket?: NumericFeedbackBucket;
}

export function GlobalDialogueStage({
  sceneLabel,
  portraitLabel,
  portrait,
  resolvePortrait,
  narrationName,
  quotedSpeakerIdentity,
  quotedSpeakerName,
  splitQuotedDialogue = true,
  characterIdentity,
  characterName,
  content,
  highlightText,
  ariaLabel,
  className = '',
  dialogueClassName = '',
  suppressPortrait = false,
  nextActionLabel,
  onNextAction,
  options = [],
  onSelectOption,
  busy = false,
  controlsDisabled = busy,
  typewriter,
  numericFeedbackBucket,
}: GlobalDialogueStageProps) {
  const currentView = useGameFlowStore((store) => store.currentView);
  const markNumericFeedbackEvent = useGameFlowStore((store) => store.markNumericFeedbackEvent);
  const boxClassName = ['palace-dialogue-box--global-lock', dialogueClassName].filter(Boolean).join(' ');
  const scriptSegments = useMemo(
    () =>
      buildDialogueScriptSegments({
        content,
        characterIdentity,
        characterName,
        narrationName: narrationName ?? sceneLabel,
        quotedSpeakerIdentity,
        quotedSpeakerName,
        splitQuotedDialogue,
      }),
    [characterIdentity, characterName, content, narrationName, quotedSpeakerIdentity, quotedSpeakerName, sceneLabel, splitQuotedDialogue],
  );
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const previousContentRef = useRef(content);
  const boundedSegmentIndex = Math.min(segmentIndex, scriptSegments.length - 1);
  const currentSegment =
    scriptSegments[boundedSegmentIndex] ?? {
      characterIdentity,
      characterName,
      content,
      isNarration: characterIdentity === narrationIdentity,
    };
  const contentPages = useMemo(() => splitDialogueContentPages(currentSegment.content), [currentSegment.content]);
  const boundedPageIndex = Math.min(pageIndex, contentPages.length - 1);
  const currentContent = contentPages[boundedPageIndex] ?? '';
  const hasMorePages = boundedPageIndex < contentPages.length - 1;
  const hasMoreSegments = boundedSegmentIndex < scriptSegments.length - 1;
  const hasOptions = options.length > 0 && !hasMorePages && !hasMoreSegments;
  const showPortrait = !suppressPortrait && !currentSegment.isNarration;
  const resolvedPortrait = showPortrait ? resolvePortrait?.(currentSegment) : undefined;
  const currentSegmentMatchesBaseCharacter =
    currentSegment.characterIdentity === characterIdentity && currentSegment.characterName === characterName;
  const currentPortrait =
    resolvedPortrait?.portrait ??
    (showPortrait && portrait && currentSegmentMatchesBaseCharacter ? portrait : undefined) ??
    (showPortrait ? <div className="global-dialogue-stage__portrait-placeholder">{currentSegment.characterName}</div> : undefined);
  const currentPortraitLabel =
    resolvedPortrait?.label ?? (showPortrait && portrait && currentSegmentMatchesBaseCharacter ? portraitLabel : `${currentSegment.characterName}剪影`);
  const currentPortraitPlacement = resolvedPortrait?.placement ?? 'stage';
  const portraitStageClassName = [
    'global-dialogue-stage__portrait-stage',
    `global-dialogue-stage__portrait-stage--${currentPortraitPlacement}`,
  ].join(' ');
  const rootClassName = [
    'global-dialogue-stage',
    currentSegment.isNarration ? 'global-dialogue-stage--narration' : 'global-dialogue-stage--assistant',
    showPortrait ? `global-dialogue-stage--portrait-${currentPortraitPlacement}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (previousContentRef.current !== content) {
      previousContentRef.current = content;
      setSegmentIndex(0);
      setPageIndex(0);
    }
  }, [content]);

  useEffect(() => {
    setPageIndex(0);
  }, [boundedSegmentIndex]);

  useEffect(() => {
    if (!currentContent) {
      return;
    }

    markNumericFeedbackEvent(numericFeedbackBucket ?? (currentView === 'map-main' ? 'map-event' : 'chamber-action'));
  }, [currentContent, currentView, markNumericFeedbackEvent, numericFeedbackBucket]);

  const handleAdvancePageOrSegment = () => {
    if (hasMorePages) {
      setPageIndex((current) => Math.min(current + 1, contentPages.length - 1));
      return;
    }

    if (hasMoreSegments) {
      setSegmentIndex((current) => Math.min(current + 1, scriptSegments.length - 1));
    }
  };

  return (
    <section className={rootClassName} aria-label={sceneLabel} data-dialogue-lock={DIALOGUE_CONFIG.lockVersion}>
      <div className="global-dialogue-stage__interaction-lock" aria-hidden="true" />

      {showPortrait ? (
        <div className={portraitStageClassName} aria-label={currentPortraitLabel}>
          <div className="global-dialogue-stage__portrait-frame">{currentPortrait}</div>
        </div>
      ) : null}

      {hasOptions ? (
        <div className="global-dialogue-stage__options palace-dialogue-box__options" role="group" aria-label="对话分支选项">
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

      <GlobalDialogue
        ariaLabel={ariaLabel}
        className={boxClassName}
        characterIdentity={currentSegment.characterIdentity}
        characterName={currentSegment.characterName}
        content={currentContent}
        highlightText={!hasMorePages && !hasMoreSegments ? highlightText : undefined}
        nextActionLabel={!hasMorePages && !hasMoreSegments ? nextActionLabel : undefined}
        nextActionKind={undefined}
        onNextAction={!hasMorePages && !hasMoreSegments ? onNextAction : undefined}
        onAdvancePage={hasMorePages || hasMoreSegments ? handleAdvancePageOrSegment : undefined}
        options={[]}
        onSelectOption={undefined}
        busy={busy}
        controlsDisabled={controlsDisabled}
        contentDisabled={hasOptions}
        typewriter={typewriter}
      />
    </section>
  );
}
