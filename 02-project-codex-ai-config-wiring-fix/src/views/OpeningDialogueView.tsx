import { useEffect, useMemo, useRef, useState } from 'react';
import { GlobalDialogueStage } from '../components/dialogue/GlobalDialogueStage';
import { PalaceStatusBar } from '../components/status/PalaceStatusBar';
import { GUIDE_TENDENCY_OPTIONS } from '../config/palaceUi';
import { buildOpeningNarrativeContext } from '../game/data/openingNarrativeProfiles';
import { requestOpeningDialogueWithFallback, buildLocalOpeningDialogue } from '../game/lib/openingDialogueRuntime';
import { useGameFlowStore } from '../game/store/gameFlowStore';

const openingBackground = '/assets/home-bg.png';
const npcPortrait = '/assets/dialogue/jiaojiao-final.png';
const npcName = '娇娇';
const routePortraitById: Record<string, string> = {
  lanyinxuguo: '/assets/player/lanyinxuguo-cutout.png',
  fushengrumeng: '/assets/player/ningxiaoman-cutout.png',
  yingluoyeting: '/assets/routes/portraits/yingluoyeting.png',
  chenyuansucuo: '/assets/routes/portraits/chenyuansucuo.png',
};

const resolveOpeningBackground = (routeId: string): string => {
  if (routeId === 'yingluoyeting') {
    return '/assets/ui/affairs-ui.jpg';
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

export function OpeningDialogueView() {
  const { state, hiddenStats, time, selectedRoute, patchState, enterMapMain } = useGameFlowStore();
  const [history, setHistory] = useState<Array<{ speaker: string; text: string }>>([]);
  const [turn, setTurn] = useState(1);
  const playerTitle = resolvePlayerTitle(state.family, state.routeId);
  const narrativeContext = useMemo(() => buildOpeningNarrativeContext(state.routeId), [state.routeId]);
  const sceneBackground = resolveOpeningBackground(state.routeId);

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

    const nextHistory = [...history, { speaker: speakerLabel, text: dialogueTurn.text }];
    const branchTurn = state.routeId === 'yingluoyeting' ? 5 : 3;
    setHistory(nextHistory);
    void loadTurn(Math.min(turn + 1, branchTurn), nextHistory);
  };

  const handleSelectTendency = (optionId: string) => {
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

            if (segment.characterName === npcName) {
              return {
                label: '娇娇立绘',
                portrait: <img src={npcPortrait} alt="娇娇" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant" />,
              };
            }

            return undefined;
          }}
          narrationName={state.residenceName}
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
          options={showChoices ? GUIDE_TENDENCY_OPTIONS.map((option) => ({
            id: option.id,
            label: option.label,
            effectHint: option.effectHint,
          })) : []}
          onSelectOption={showChoices ? handleSelectTendency : undefined}
          busy={loading}
          controlsDisabled={false}
        />
      </div>
    </main>
  );
}
