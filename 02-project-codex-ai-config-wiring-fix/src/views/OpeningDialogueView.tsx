import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { GlobalDialogueStage } from '../components/dialogue/GlobalDialogueStage';
import { PalaceStatusBar } from '../components/status/PalaceStatusBar';
import { GUIDE_TENDENCY_OPTIONS } from '../config/palaceUi';
import { buildOpeningNarrativeContext } from '../game/data/openingNarrativeProfiles';
import { requestOpeningLocalDialogue, buildLocalOpeningDialogue, buildOpeningDialogueFromCsv } from '../game/lib/openingDialogueRuntime';
import {
  buildYingluoyetingOpeningRewardBundle,
  resolveYingluoyetingOpeningPerformanceTier,
  YINGLUOYETING_OPENING_CHOICE_STEPS,
  YINGLUOYETING_OPENING_PERFORMANCE_STEPS,
  YINGLUOYETING_OPENING_STORY_STEPS,
  type YingluoyetingOpeningChoiceId,
} from '../game/lib/yingluoyetingOpeningRuntime';
import { YINGLUOYETING_STORY_FLAGS } from '../game/lib/yingluoyetingStoryRuntime';
import { useGameFlowStore } from '../game/store/gameFlowStore';

const openingBackground = '/assets/home-bg.png';
const yetingOpeningBackground = '/assets/routes/backgrounds/yeting_daytime.png';
const yushufangInsideBackground = '/assets/routes/backgrounds/yushufang_inside_daytime.png';
const npcPortrait = '/assets/characters/women/jiaojiao.png';
const liGonggongPortrait = '/assets/characters/men/ligonggong.png';
const taijianPortrait = '/assets/characters/men/taijian.png';
const middleAgedPalaceMaidPortrait = '/assets/characters/women/gongren_middleage.png';
const npcName = '娇娇';
const YINGLUOYETING_OPENING_REWARD_GRANTED_FLAG = 'yingluoyetingOpeningRewardGranted';
const OPENING_BACKGROUND_FADE_MS = 650;
const OPENING_BLACK_COVER_RATIO = 0.34;
const expenseExplanationOption = {
  id: 'expense-explanation',
  label: '先问清用度',
  effectHint: '由当前说话人解释三档月度开销，不会定下策略。',
} as const;
const routePortraitById: Record<string, string> = {
  lanyinxuguo: '/assets/player/lanyinxuguo-cutout.png',
  fushengrumeng: '/assets/player/ningxiaoman-cutout.png',
  yingluoyeting: '/assets/characters/women/chenbi.png',
  chenyuansucuo: '/assets/routes/portraits/chenyuansucuo.png',
};

const openingBackgroundPreloads = Array.from(new Set([
  openingBackground,
  yetingOpeningBackground,
  yushufangInsideBackground,
  npcPortrait,
  liGonggongPortrait,
  taijianPortrait,
  middleAgedPalaceMaidPortrait,
  routePortraitById.yingluoyeting,
  ...YINGLUOYETING_OPENING_STORY_STEPS.map((step) => step.background),
  ...Object.values(YINGLUOYETING_OPENING_CHOICE_STEPS).flatMap((steps) => steps.map((step) => step.background)),
  ...Object.values(YINGLUOYETING_OPENING_PERFORMANCE_STEPS).flatMap((steps) => steps.map((step) => step.background)),
]));

const resolveOpeningBackground = (routeId: string, turn: number): string => {
  if (routeId === 'yingluoyeting') {
    return turn === 2 ? yushufangInsideBackground : yetingOpeningBackground;
  }
  return openingBackground;
};

const PetalEffect = () => {
  return (
    <div className="opening-dialogue__petals">
      {Array.from({ length: 15 }).map((_, index) => (
        <div
          key={index}
          className="opening-dialogue__petal"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${Math.random() * 5 + 5}s`,
            animationDelay: `${Math.random() * 5}s`,
            opacity: Math.random() * 0.5 + 0.3,
            transform: `scale(${Math.random() * 0.5 + 0.5})`,
          }}
        />
      ))}
    </div>
  );
};

const resolvePlayerTitle = (family: string, routeId: string): string => {
  if (routeId === 'lanyinxuguo') return '皇后娘娘';
  if (routeId === 'chenyuansucuo') return '公主';
  if (family.includes('罪臣')) return '姑娘';
  return '小主';
};

const resolveQuotedOpeningSpeaker = (routeId: string, turn: number, playerName: string) => {
  if (routeId !== 'yingluoyeting') {
    return undefined;
  }

  if (turn === 1) {
    return {
      identity: '掖庭掌事',
      name: '掌事宫人',
    };
  }

  if (turn === 2) {
    return {
      identity: '内廷听用宫人',
      name: playerName,
    };
  }

  return undefined;
};

const isDefaultMiddleAgedPalaceMaidSpeaker = (identity: string, name: string): boolean => {
  if (identity === '内廷听用宫人') {
    return false;
  }

  return identity.includes('宫人') || name.includes('宫人') || identity.includes('掖庭掌事');
};

export function OpeningDialogueView() {
  const { state, hiddenStats, time, selectedRoute, patchState, enterMapMain, grantInventoryItem } = useGameFlowStore();
  const [history, setHistory] = useState<Array<{ speaker: string; text: string }>>([]);
  const [turn, setTurn] = useState(1);
  const [showingExpenseExplanation, setShowingExpenseExplanation] = useState(false);
  const [yetingOpeningStepIndex, setYetingOpeningStepIndex] = useState(0);
  const [selectedYetingOpeningChoice, setSelectedYetingOpeningChoice] = useState<YingluoyetingOpeningChoiceId | undefined>();
  const [showingYetingExpenseChoice, setShowingYetingExpenseChoice] = useState(false);
  const [isDelayedOpeningPortraitReady, setIsDelayedOpeningPortraitReady] = useState(true);
  const playerTitle = resolvePlayerTitle(state.family, state.routeId);
  const narrativeContext = useMemo(() => buildOpeningNarrativeContext(state.routeId), [state.routeId]);
  const isYingluoyetingOpening = state.routeId === 'yingluoyeting';
  const yetingOpeningTier = useMemo(
    () => resolveYingluoyetingOpeningPerformanceTier(state.stats),
    [state.stats],
  );
  const yetingOpeningSteps = useMemo(
    () => [
      ...YINGLUOYETING_OPENING_STORY_STEPS.slice(0, 9),
      ...YINGLUOYETING_OPENING_PERFORMANCE_STEPS[yetingOpeningTier],
      YINGLUOYETING_OPENING_STORY_STEPS[9],
      YINGLUOYETING_OPENING_STORY_STEPS[10],
      ...(selectedYetingOpeningChoice ? YINGLUOYETING_OPENING_CHOICE_STEPS[selectedYetingOpeningChoice] : []),
      ...YINGLUOYETING_OPENING_STORY_STEPS.slice(11),
    ],
    [selectedYetingOpeningChoice, yetingOpeningTier],
  );
  const activeYetingOpeningStep = isYingluoyetingOpening && !showingYetingExpenseChoice ? yetingOpeningSteps[yetingOpeningStepIndex] : undefined;
  const isYetingBlackTransition = activeYetingOpeningStep?.transition === 'black';
  const shouldDelayActiveOpeningPortrait = Boolean(
    activeYetingOpeningStep?.delayPortraitUntilBackgroundSettled && !isDelayedOpeningPortraitReady,
  );
  const targetSceneBackground = activeYetingOpeningStep?.background ?? resolveOpeningBackground(state.routeId, turn);
  const [blackTransitionSceneBackground, setBlackTransitionSceneBackground] = useState<string | undefined>();
  const [previousSceneBackground, setPreviousSceneBackground] = useState<string | undefined>();
  const [backgroundFadeKey, setBackgroundFadeKey] = useState(0);

  const buildRequest = (nextTurn: number, nextHistory: Array<{ speaker: string; text: string }>) => ({
    routeId: state.routeId,
    playerName: state.name,
    family: state.family,
    playerTitle,
    residenceName: state.residenceName,
    npcName,
    topic: 'opening-guide',
    turn: nextTurn,
    history: nextHistory,
    playerContext: {
      currentRank: hiddenStats.initialRank ?? '宫妃',
      personality: state.openingTendency ?? '未定',
      routeLabel: selectedRoute?.label,
      favor: state.favor,
      stress: state.stress,
      prestige: state.prestige,
      trueHeart: state.trueHeart,
      silver: state.silver,
      stamina: state.stamina,
      stats: state.stats,
    },
    npcContext: narrativeContext.npcContext,
    routeContext: narrativeContext.routeContext,
    timeContext: time,
  });

  const initialRequest = useMemo(
    () => buildRequest(1, []),
    [hiddenStats.initialRank, narrativeContext, playerTitle, selectedRoute?.label, state, time],
  );
  const [dialogueTurn, setDialogueTurn] = useState(() => buildLocalOpeningDialogue(initialRequest));
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const currentSceneBackgroundRef = useRef(targetSceneBackground);
  const sceneBackground = isYetingBlackTransition
    ? blackTransitionSceneBackground ?? currentSceneBackgroundRef.current
    : targetSceneBackground;
  const immediatePreviousSceneBackground = currentSceneBackgroundRef.current !== sceneBackground ? currentSceneBackgroundRef.current : undefined;
  const transitionPreviousSceneBackground = immediatePreviousSceneBackground ?? previousSceneBackground;

  useEffect(() => {
    openingBackgroundPreloads.forEach((background) => {
      if (document.head.querySelector(`link[rel="preload"][as="image"][href="${background}"]`)) {
        return;
      }

      const link = document.createElement('link');
      link.rel = 'preload';
      link.setAttribute('as', 'image');
      link.href = background;
      document.head.appendChild(link);
    });
  }, []);

  useEffect(() => {
    if (state.routeId === 'yingluoyeting') {
      setHistory([]);
      setTurn(1);
      setYetingOpeningStepIndex(0);
      setSelectedYetingOpeningChoice(undefined);
      setShowingYetingExpenseChoice(false);
      setShowingExpenseExplanation(false);
      setDialogueTurn(buildLocalOpeningDialogue(buildRequest(5, [])));
      setLoading(false);
      return;
    }

    let cancelled = false;
    const payload = buildRequest(1, []);
    const requestId = ++requestIdRef.current;
    setHistory([]);
    setTurn(1);
    setShowingExpenseExplanation(false);
    setDialogueTurn(buildLocalOpeningDialogue(payload));
    setLoading(true);

    requestOpeningLocalDialogue(payload)
      .then((response) => {
        if (!cancelled && requestId === requestIdRef.current) {
          setDialogueTurn(response);
        }
      })
      .finally(() => {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hiddenStats.initialRank, narrativeContext, playerTitle, selectedRoute?.label, state.family, state.name, state.residenceName, state.routeId]);

  useEffect(() => {
    if (!activeYetingOpeningStep || !activeYetingOpeningStep.id.endsWith('-reward')) {
      return;
    }
    if (state.flags[YINGLUOYETING_OPENING_REWARD_GRANTED_FLAG]) {
      return;
    }

    buildYingluoyetingOpeningRewardBundle(yetingOpeningTier).forEach((reward) => {
      grantInventoryItem(reward.item, reward.quantity);
    });
    patchState({
      flags: {
        ...state.flags,
        [YINGLUOYETING_OPENING_REWARD_GRANTED_FLAG]: true,
      },
    });
  }, [activeYetingOpeningStep, grantInventoryItem, patchState, state.flags, yetingOpeningTier]);

  const speakerLabel = `${dialogueTurn.speakerIdentity} · ${dialogueTurn.speakerName}`;
  const isYetingExpenseChoice = isYingluoyetingOpening && showingYetingExpenseChoice;
  const showChoices = isYetingExpenseChoice
    ? dialogueTurn.mode === 'branch'
    : activeYetingOpeningStep
      ? Boolean(activeYetingOpeningStep.options)
      : dialogueTurn.mode === 'branch';
  const isNarrationTurn = activeYetingOpeningStep
    ? activeYetingOpeningStep.speakerIdentity === '场景旁白'
    : dialogueTurn.speakerIdentity === '场景旁白';
  const narrationName =
    activeYetingOpeningStep?.narrationName ||
    dialogueTurn.narrationName ||
    (state.routeId === 'yingluoyeting' && turn <= 4 ? (turn >= 4 ? '后宫宫道' : dialogueTurn.speakerName) : state.residenceName);
  const quotedOpeningSpeaker = resolveQuotedOpeningSpeaker(state.routeId, turn, state.name);
  const playerPortrait = selectedRoute?.portrait ?? routePortraitById[state.routeId];

  useEffect(() => {
    if (!activeYetingOpeningStep?.autoAdvanceMs) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setYetingOpeningStepIndex((current) => Math.min(current + 1, yetingOpeningSteps.length - 1));
    }, activeYetingOpeningStep.autoAdvanceMs);

    return () => window.clearTimeout(timer);
  }, [activeYetingOpeningStep?.autoAdvanceMs, activeYetingOpeningStep?.id, yetingOpeningSteps.length]);

  useEffect(() => {
    if (!isYetingBlackTransition || !activeYetingOpeningStep?.autoAdvanceMs) {
      setBlackTransitionSceneBackground(undefined);
      return undefined;
    }

    setBlackTransitionSceneBackground(undefined);
    const timer = window.setTimeout(() => {
      setBlackTransitionSceneBackground(targetSceneBackground);
    }, Math.round(activeYetingOpeningStep.autoAdvanceMs * OPENING_BLACK_COVER_RATIO));

    return () => window.clearTimeout(timer);
  }, [activeYetingOpeningStep?.autoAdvanceMs, activeYetingOpeningStep?.id, isYetingBlackTransition, targetSceneBackground]);

  useEffect(() => {
    if (!activeYetingOpeningStep?.delayPortraitUntilBackgroundSettled) {
      setIsDelayedOpeningPortraitReady(true);
      return undefined;
    }

    setIsDelayedOpeningPortraitReady(false);
    const timer = window.setTimeout(() => {
      setIsDelayedOpeningPortraitReady(true);
    }, OPENING_BACKGROUND_FADE_MS);

    return () => window.clearTimeout(timer);
  }, [activeYetingOpeningStep?.delayPortraitUntilBackgroundSettled, activeYetingOpeningStep?.id]);

  useLayoutEffect(() => {
    const previousBackground = currentSceneBackgroundRef.current;
    if (previousBackground === sceneBackground) {
      return undefined;
    }

    setPreviousSceneBackground(previousBackground);
    currentSceneBackgroundRef.current = sceneBackground;
    setBackgroundFadeKey((current) => current + 1);

    const timer = window.setTimeout(() => {
      setPreviousSceneBackground(undefined);
    }, OPENING_BACKGROUND_FADE_MS);

    return () => window.clearTimeout(timer);
  }, [sceneBackground]);

  const loadTurn = async (nextTurn: number, nextHistory: Array<{ speaker: string; text: string }>) => {
    const payload = buildRequest(nextTurn, nextHistory);
    const requestId = ++requestIdRef.current;
    setTurn(nextTurn);
    setShowingExpenseExplanation(false);
    setDialogueTurn(buildLocalOpeningDialogue(payload));
    setLoading(true);
    try {
      const response = await requestOpeningLocalDialogue(payload);
      if (requestId === requestIdRef.current) {
        setDialogueTurn(response);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleNextLine = () => {
    if (showChoices) {
      return;
    }

    if (activeYetingOpeningStep) {
      if (yetingOpeningStepIndex < yetingOpeningSteps.length - 1) {
        setYetingOpeningStepIndex((current) => current + 1);
        return;
      }

      const payload = buildRequest(5, history);
      setTurn(5);
      setShowingYetingExpenseChoice(true);
      setDialogueTurn(buildLocalOpeningDialogue(payload));
      return;
    }

    const branchTurn = state.routeId === 'yingluoyeting' ? 5 : 3;

    if (showingExpenseExplanation) {
      const payload = buildRequest(branchTurn, history);
      setTurn(branchTurn);
      setShowingExpenseExplanation(false);
      setDialogueTurn(buildLocalOpeningDialogue(payload));
      return;
    }

    const nextHistory = [...history, { speaker: speakerLabel, text: dialogueTurn.text }];
    setHistory(nextHistory);
    void loadTurn(Math.min(turn + 1, branchTurn), nextHistory);
  };

  const handleSelectTendency = (optionId: string) => {
    if (activeYetingOpeningStep?.options?.some((option) => option.id === optionId)) {
      setSelectedYetingOpeningChoice(optionId as YingluoyetingOpeningChoiceId);
      setYetingOpeningStepIndex((current) => current + 1);
      return;
    }

    if (optionId === expenseExplanationOption.id) {
      setShowingExpenseExplanation(true);
      setDialogueTurn(buildOpeningDialogueFromCsv('opening.expense.explanation', 'line', 'continue', {
        residenceName: state.residenceName,
      }));
      return;
    }

    const selectedOption = GUIDE_TENDENCY_OPTIONS.find((option) => option.id === optionId);
    if (!selectedOption) {
      return;
    }

    patchState({
      openingTendency: selectedOption.openingTendency,
      monthlyExpenseStrategy: selectedOption.id,
      nextMonthlyExpenseStrategy: undefined,
      flags: {
        ...state.flags,
        openingGuideFinished: true,
        ...(state.routeId === 'yingluoyeting'
          ? {
              [YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending]: true,
            }
          : {}),
      },
    });

    enterMapMain();
  };

  return (
    <main className="opening-dialogue palace-stage-shell">
      <div className="opening-dialogue__frame">
        <div
          key={sceneBackground}
          className={`opening-dialogue__background opening-dialogue__background--current${transitionPreviousSceneBackground ? ' opening-dialogue__background--entering' : ''}`}
          style={{ backgroundImage: `url("${sceneBackground}")` }}
        />
        {transitionPreviousSceneBackground ? (
          <div
            key={backgroundFadeKey}
            className="opening-dialogue__background opening-dialogue__background--previous"
            style={{ backgroundImage: `url("${transitionPreviousSceneBackground}")` }}
            aria-hidden="true"
          />
        ) : null}
        {isYetingBlackTransition ? (
          <div
            className="opening-dialogue__black-transition"
            style={{ '--opening-black-transition-duration': `${activeYetingOpeningStep?.autoAdvanceMs ?? 2000}ms` } as CSSProperties}
            aria-hidden="true"
          />
        ) : null}
        {!isYetingBlackTransition ? <PetalEffect /> : null}
        {!isYetingBlackTransition ? <PalaceStatusBar /> : null}

        {!isYetingBlackTransition ? <GlobalDialogueStage
          sceneLabel="开场对话立绘舞台"
          portraitLabel={isNarrationTurn ? '旁白无立绘' : '娇娇立绘'}
          portrait={
            isNarrationTurn ? undefined : (
              <img src={npcPortrait} alt="娇娇" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant" />
            )
          }
          resolvePortrait={(segment) => {
            if (segment.isNarration) {
              return undefined;
            }

            if (segment.characterName === state.name && playerPortrait) {
              return {
                label: `${state.name}立绘`,
                placement: 'dialogue-left',
                portrait: <img src={playerPortrait} alt={state.name} className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--player" />,
              };
            }

            if (segment.characterName === '李公公' || segment.characterIdentity === '李公公') {
              if (shouldDelayActiveOpeningPortrait) {
                return undefined;
              }

              return {
                label: '李公公立绘',
                portrait: <img src={liGonggongPortrait} alt="李公公" className="global-dialogue-stage__portrait-media" />,
              };
            }

            if (segment.characterName === '内侍' || segment.characterIdentity === '内侍') {
              return {
                label: '内侍立绘',
                portrait: <img src={taijianPortrait} alt="内侍" className="global-dialogue-stage__portrait-media" />,
              };
            }

            if (segment.characterName === '娇娇' || segment.characterIdentity === '娇娇') {
              return {
                label: '娇娇立绘',
                portrait: <img src={npcPortrait} alt="娇娇" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant" />,
              };
            }

            if (isDefaultMiddleAgedPalaceMaidSpeaker(segment.characterIdentity, segment.characterName)) {
              return {
                label: `${segment.characterName}立绘`,
                portrait: (
                  <img
                    src={middleAgedPalaceMaidPortrait}
                    alt={segment.characterName}
                    className="global-dialogue-stage__portrait-media"
                  />
                ),
              };
            }

            if (segment.characterName === npcName) {
              return {
                label: '娇娇立绘',
                portrait: <img src={npcPortrait} alt="娇娇" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant" />,
              };
            }

            return undefined;
          }}
          narrationName={narrationName}
          quotedSpeakerIdentity={quotedOpeningSpeaker?.identity}
          quotedSpeakerName={quotedOpeningSpeaker?.name}
          splitQuotedDialogue={!activeYetingOpeningStep}
          ariaLabel="开场对话框"
          className={`global-dialogue-stage--opening ${isNarrationTurn ? 'global-dialogue-stage--narration' : 'global-dialogue-stage--assistant'}`}
          dialogueClassName="palace-dialogue-box--opening"
          characterIdentity={activeYetingOpeningStep?.speakerIdentity ?? dialogueTurn.speakerIdentity}
          characterName={activeYetingOpeningStep?.speakerName ?? dialogueTurn.speakerName}
          content={activeYetingOpeningStep?.text ?? dialogueTurn.text}
          suppressPortrait={shouldDelayActiveOpeningPortrait}
          onNextAction={!showChoices ? handleNextLine : undefined}
          options={showChoices ? (
            activeYetingOpeningStep?.options?.map((option) => ({
              id: option.id,
              label: option.label,
            })) ?? [
              ...GUIDE_TENDENCY_OPTIONS.map((option) => ({
                id: option.id,
                label: option.label,
                effectHint: option.effectHint,
              })),
              expenseExplanationOption,
            ]
          ) : []}
          onSelectOption={showChoices ? handleSelectTendency : undefined}
          busy={loading}
          controlsDisabled={false}
        /> : null}
      </div>
    </main>
  );
}
