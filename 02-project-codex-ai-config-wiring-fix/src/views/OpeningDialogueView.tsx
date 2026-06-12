import { useEffect, useMemo, useRef, useState } from 'react';
import { DIALOGUE_EXPLICIT_PAGE_BREAK, GlobalDialogueStage } from '../components/dialogue/GlobalDialogueStage';
import { PalaceStatusBar } from '../components/status/PalaceStatusBar';
import { GUIDE_TENDENCY_OPTIONS } from '../config/palaceUi';
import { buildOpeningNarrativeContext } from '../game/data/openingNarrativeProfiles';
import { requestOpeningDialogueWithFallback, buildLocalOpeningDialogue } from '../game/lib/openingDialogueRuntime';
import { YINGLUOYETING_STORY_FLAGS } from '../game/lib/yingluoyetingStoryRuntime';
import { useGameFlowStore } from '../game/store/gameFlowStore';

const openingBackground = '/assets/home-bg.png';
const yetingOpeningBackground = '/assets/routes/backgrounds/yeting_daytime.png';
const yushufangInsideBackground = '/assets/routes/backgrounds/yushufang_inside_daytime.png';
const npcPortrait = '/assets/characters/women/jiaojiao.png';
const middleAgedPalaceMaidPortrait = '/assets/characters/women/gongren_middleage.png';
const npcName = '娇娇';
const expenseExplanationOption = {
  id: 'expense-explanation',
  label: '先问清用度',
  effectHint: '由当前说话人解释三档月度开销，不会定下策略。',
} as const;
const expenseExplanationNextActionLabel = '重新选择';
const expenseExplanationText = [
  '这三档说的是每月固定用度，不是一次性的赏赐。你现在选下，只是定本月按什么章法花银子。',
  '节衣缩食：每月用月俸四分之一。好处是省银两；代价是起居和体面受损，声望-5，健康-1。',
  '量入为出：每月用月俸一半。它最稳妥，不额外增减声望和健康。',
  '锦衣玉食：每月用月俸四分之三。花费重些，但能撑住体面与起居，声望+10，健康+1。',
].join(DIALOGUE_EXPLICIT_PAGE_BREAK);
const routePortraitById: Record<string, string> = {
  lanyinxuguo: '/assets/player/lanyinxuguo-cutout.png',
  fushengrumeng: '/assets/player/ningxiaoman-cutout.png',
  yingluoyeting: '/assets/characters/women/chenbi.png',
  chenyuansucuo: '/assets/routes/portraits/chenyuansucuo.png',
};

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
  const { state, hiddenStats, time, selectedRoute, patchState, enterMapMain } = useGameFlowStore();
  const [history, setHistory] = useState<Array<{ speaker: string; text: string }>>([]);
  const [turn, setTurn] = useState(1);
  const playerTitle = resolvePlayerTitle(state.family, state.routeId);
  const narrativeContext = useMemo(() => buildOpeningNarrativeContext(state.routeId), [state.routeId]);
  const sceneBackground = resolveOpeningBackground(state.routeId, turn);

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

  useEffect(() => {
    let cancelled = false;
    const payload = buildRequest(1, []);
    const requestId = ++requestIdRef.current;
    setHistory([]);
    setTurn(1);
    setDialogueTurn(buildLocalOpeningDialogue(payload));
    setLoading(true);

    requestOpeningDialogueWithFallback(payload)
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

  const speakerLabel = `${dialogueTurn.speakerIdentity} · ${dialogueTurn.speakerName}`;
  const showChoices = dialogueTurn.mode === 'branch';
  const isNarrationTurn = dialogueTurn.speakerIdentity === '场景旁白';
  const narrationName =
    state.routeId === 'yingluoyeting' && turn <= 4 ? (turn >= 4 ? '后宫宫道' : dialogueTurn.speakerName) : state.residenceName;
  const quotedOpeningSpeaker = resolveQuotedOpeningSpeaker(state.routeId, turn, state.name);
  const playerPortrait = selectedRoute?.portrait ?? routePortraitById[state.routeId];

  const loadTurn = async (nextTurn: number, nextHistory: Array<{ speaker: string; text: string }>) => {
    const payload = buildRequest(nextTurn, nextHistory);
    const requestId = ++requestIdRef.current;
    setTurn(nextTurn);
    setDialogueTurn(buildLocalOpeningDialogue(payload));
    setLoading(true);
    try {
      const response = await requestOpeningDialogueWithFallback(payload);
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

    const branchTurn = state.routeId === 'yingluoyeting' ? 5 : 3;

    if (dialogueTurn.nextActionLabel === expenseExplanationNextActionLabel) {
      const payload = buildRequest(branchTurn, history);
      setTurn(branchTurn);
      setDialogueTurn(buildLocalOpeningDialogue(payload));
      return;
    }

    const nextHistory = [...history, { speaker: speakerLabel, text: dialogueTurn.text }];
    setHistory(nextHistory);
    void loadTurn(Math.min(turn + 1, branchTurn), nextHistory);
  };

  const handleSelectTendency = (optionId: string) => {
    if (optionId === expenseExplanationOption.id) {
      setDialogueTurn({
        mode: 'line',
        phase: 'continue',
        speakerIdentity: dialogueTurn.speakerIdentity,
        speakerName: dialogueTurn.speakerName,
        text: expenseExplanationText,
        nextActionLabel: expenseExplanationNextActionLabel,
        timeCost: 0,
        dataEffects: {
          silver: 0,
          stamina: 0,
          favor: 0,
          prestige: 0,
          stress: 0,
          trueHeart: 0,
          stats: {},
        },
        options: [],
      });
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
        <div className="opening-dialogue__background" style={{ backgroundImage: `url(${sceneBackground})` }} />
        <PetalEffect />
        <PalaceStatusBar />

        <GlobalDialogueStage
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
          ariaLabel="开场对话框"
          className={`global-dialogue-stage--opening ${isNarrationTurn ? 'global-dialogue-stage--narration' : 'global-dialogue-stage--assistant'}`}
          dialogueClassName="palace-dialogue-box--opening"
          characterIdentity={dialogueTurn.speakerIdentity}
          characterName={dialogueTurn.speakerName}
          content={dialogueTurn.text}
          nextActionLabel={!showChoices ? dialogueTurn.nextActionLabel : undefined}
          onNextAction={!showChoices ? handleNextLine : undefined}
          options={showChoices ? [
            ...GUIDE_TENDENCY_OPTIONS.map((option) => ({
              id: option.id,
              label: option.label,
              effectHint: option.effectHint,
            })),
            expenseExplanationOption,
          ] : []}
          onSelectOption={showChoices ? handleSelectTendency : undefined}
          busy={loading}
          controlsDisabled={false}
        />
      </div>
    </main>
  );
}
