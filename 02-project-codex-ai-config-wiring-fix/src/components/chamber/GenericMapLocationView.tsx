import { useMemo, useState } from 'react';
import { ConsortAudiencePanel } from '../consorts/ConsortAudiencePanel';
import { buildLocationActionNarrative } from '../../game/lib/actionNarrativeRuntime';
import { getMapLocationInteractionConfig, type MapLocationActionConfig } from '../../game/data/mapLocationActions';
import { getRouteProfileById } from '../../game/data/routeProfiles';
import {
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
} from '../../game/data/concubineRoster';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import {
  advanceRandomEventLine,
  beginRandomEventSession,
  createSeededRandomEventRandom,
  getRandomEventCurrentLine,
  getRandomEventCurrentOptions,
  pickRandomEventBySeed,
  selectRandomEventOption,
  type RandomEventSession,
} from '../../game/random-events/randomEventRuntime';
import type { RandomEventLine } from '../../game/random-events/randomEventCatalog';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { MapAreaId } from '../../game/types';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { LocationActionResultStage } from './LocationActionResultStage';
import { MapSubsceneView, type SubsceneActionEntry, type SubsceneNpcEntry } from './MapSubsceneView';
import { useBlockingNarrativeLock } from './useBlockingNarrativeLock';
import { useLocationActionFlow, type TimedLocationActionOutcome } from './useLocationActionFlow';

interface GenericMapLocationViewProps {
  locationId: MapAreaId;
  extraNpcs?: SubsceneNpcEntry[];
  extraActions?: SubsceneActionEntry[];
}

const hasNumericEffects = (action: MapLocationActionConfig): boolean =>
  Boolean(
    action.effects &&
      ((action.effects.prestige ?? 0) !== 0 ||
        (action.effects.stress ?? 0) !== 0 ||
        (action.effects.trueHeart ?? 0) !== 0 ||
        Object.values(action.effects.stats ?? {}).some((value) => Number(value) !== 0)),
  );

const IMPERIAL_GARDEN_STROLL_POOL_ID = 'location.imperial-garden.stroll';
const IMPERIAL_GARDEN_RANDOM_PALACES = ['储秀宫', '承乾宫', '翊坤宫', '长春宫', '延禧宫', '景仁宫'] as const;

const countTriggeredImperialGardenStrolls = (triggerCounts: Record<string, number>): number =>
  Object.entries(triggerCounts).reduce(
    (sum, [eventId, count]) => (eventId.startsWith('imperial-garden.stroll.') ? sum + Number(count ?? 0) : sum),
    0,
  );

const pickImperialGardenPalaceName = (seed: string): string => {
  const random = createSeededRandomEventRandom(seed);
  const index = Math.floor(random() * IMPERIAL_GARDEN_RANDOM_PALACES.length);
  return IMPERIAL_GARDEN_RANDOM_PALACES[index] ?? IMPERIAL_GARDEN_RANDOM_PALACES[0];
};

export function GenericMapLocationView({ locationId, extraNpcs = [], extraActions = [] }: GenericMapLocationViewProps) {
  const config = useMemo(() => getMapLocationInteractionConfig(locationId), [locationId]);
  const state = useGameFlowStore((store) => store.state);
  const hiddenStats = useGameFlowStore((store) => store.hiddenStats);
  const time = useGameFlowStore((store) => store.time);
  const randomEventProgress = useGameFlowStore((store) => store.randomEventProgress);
  const applyStoryEffects = useGameFlowStore((store) => store.applyStoryEffects);
  const applyRandomEventEffectForPlayer = useGameFlowStore((store) => store.applyRandomEventEffectForPlayer);
  const queueRandomEventUnlocks = useGameFlowStore((store) => store.queueRandomEventUnlocks);
  const completeRandomEventById = useGameFlowStore((store) => store.completeRandomEventById);
  const markNumericFeedbackEvent = useGameFlowStore((store) => store.markNumericFeedbackEvent);
  const openChamberPanel = useGameFlowStore((store) => store.openChamberPanel);
  const setActiveAffairsSource = useGameFlowStore((store) => store.setActiveAffairsSource);
  const enterMapMain = useGameFlowStore((store) => store.enterMapMain);
  const concubines = useGameFlowStore((store) => store.concubines);
  const customConsorts = useGameFlowStore((store) => store.customConsorts);
  const npcActivity = useGameFlowStore((store) => store.npcActivity);
  const resolveNpcActivityEntry = useGameFlowStore((store) => store.resolveNpcActivityEntry);
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [actionResultText, setActionResultText] = useState('');
  const [pendingTimedActionOutcome, setPendingTimedActionOutcome] = useState<TimedLocationActionOutcome | null>(null);
  const [activeRandomSession, setActiveRandomSession] = useState<RandomEventSession | null>(null);
  const [activeRandomLine, setActiveRandomLine] = useState<RandomEventLine | null>(null);
  useBlockingNarrativeLock(`generic-map-location:${locationId}:random-event`, Boolean(activeRandomSession));
  const [activeConsortAudience, setActiveConsortAudience] = useState<{
    entryId: string;
    consortId: string;
    summary: string;
  } | null>(null);
  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const playerPortraitSrc = getRouteProfileById(state.routeId)?.portrait;
  const activeRandomOptions = activeRandomSession ? getRandomEventCurrentOptions(activeRandomSession) : [];
  const isPlayerRandomLine = Boolean(
    activeRandomLine &&
      (activeRandomLine.portraitKey === 'player' ||
        activeRandomLine.speakerName === state.name ||
        activeRandomLine.speakerIdentity === playerRankLabel),
  );

  const buildRandomEventVariables = (extra: Record<string, string | number> = {}) => ({
    playerName: state.name,
    playerSurname: state.name.slice(0, 1),
    playerRank: playerRankLabel,
    playerResidence: state.residenceName,
    playerAddress: state.name,
    targetName: '',
    targetSurname: '',
    targetRank: '',
    targetResidence: '',
    targetAddress: '',
    locationName: locationId,
    timeLabel: time.slot,
    ...extra,
  });

  const finishRandomEvent = (eventId: string) => {
    completeRandomEventById(eventId);
    const outcome = pendingTimedActionOutcome;
    setActiveRandomSession(null);
    setActiveRandomLine(null);
    setPendingTimedActionOutcome(null);
    finishTimedLocationAction(outcome);
  };

  const handleRandomDialogueNext = () => {
    if (!activeRandomSession || activeRandomSession.stage !== 'lines') {
      return;
    }
    const advanceResult = advanceRandomEventLine(activeRandomSession);
    applyRandomEventEffectForPlayer(advanceResult.effect);
    if (advanceResult.unlockEventIds.length > 0) {
      queueRandomEventUnlocks(advanceResult.unlockEventIds);
    }
    if (advanceResult.completed) {
      finishRandomEvent(activeRandomSession.eventId);
      return;
    }
    setActiveRandomSession(advanceResult.session);
    setActiveRandomLine(getRandomEventCurrentLine(advanceResult.session) ?? (advanceResult.awaitingOptions ? activeRandomLine : null));
  };

  const handleRandomOptionSelect = (optionId: string) => {
    if (!activeRandomSession) {
      return;
    }
    const optionResult = selectRandomEventOption(activeRandomSession, optionId);
    applyRandomEventEffectForPlayer(optionResult.effect);
    if (optionResult.unlockEventIds.length > 0) {
      queueRandomEventUnlocks(optionResult.unlockEventIds);
    }
    if (optionResult.completed) {
      finishRandomEvent(activeRandomSession.eventId);
      return;
    }
    setActiveRandomSession(optionResult.session);
    setActiveRandomLine(getRandomEventCurrentLine(optionResult.session) ?? activeRandomLine);
  };

  const beginImperialGardenStrollRandomEvent = (action: MapLocationActionConfig, outcome: TimedLocationActionOutcome): boolean => {
    const nextCount = countTriggeredImperialGardenStrolls(randomEventProgress.triggerCounts) + 1;
    const seed = `${state.routeId}:${time.year}-${time.month}-${time.xun}:${time.slotIndex}:imperial-garden-stroll:${nextCount}`;
    const event = pickRandomEventBySeed({
      poolId: IMPERIAL_GARDEN_STROLL_POOL_ID,
      progress: randomEventProgress,
      seed,
    });
    if (!event) {
      applyStoryEffects({ stress: -2 });
      markNumericFeedbackEvent('map-event');
      setActionResultText(
        buildLocationActionNarrative({
          locationId: action.narrativeLocationId,
          actionId: action.id,
          actionLabel: action.label,
          resultText: action.resultText,
        }),
      );
      setPendingTimedActionOutcome(outcome.shouldSleep ? outcome : null);
      return false;
    }

    const session = beginRandomEventSession({
      eventId: event.eventId,
      variables: buildRandomEventVariables({
        randomPalaceName: pickImperialGardenPalaceName(`${seed}:${event.eventId}:palace`),
      }),
    });
    setActionResultText('');
    setPendingTimedActionOutcome(outcome.shouldSleep ? outcome : null);
    setActiveRandomSession(session);
    setActiveRandomLine(getRandomEventCurrentLine(session) ?? null);
    return true;
  };

  const handleAction = (action: MapLocationActionConfig) => {
    const outcome = beginTimedLocationAction({ staminaCost: action.staminaCost });
    if (locationId === '御花园' && action.id === 'stroll') {
      beginImperialGardenStrollRandomEvent(action, outcome);
      return;
    }
    if (action.effects) {
      applyStoryEffects({
        prestige: action.effects.prestige,
        stress: action.effects.stress,
        trueHeart: action.effects.trueHeart,
        stats: action.effects.stats,
      });
    }
    if (hasNumericEffects(action)) {
      markNumericFeedbackEvent('map-event');
    }
    setActionResultText(
      buildLocationActionNarrative({
        locationId: action.narrativeLocationId,
        actionId: action.id,
        actionLabel: action.label,
        resultText: action.resultText,
      }),
    );
    setPendingTimedActionOutcome(outcome.shouldSleep ? outcome : null);
  };

  const closeActionResult = () => {
    const outcome = pendingTimedActionOutcome;
    setActionResultText('');
    setPendingTimedActionOutcome(null);
    finishTimedLocationAction(outcome);
  };

  const handlePanelAction = (panelActionId: string) => {
    if (!config) {
      return;
    }
    const panelAction = config.panelActions?.find((item) => item.id === panelActionId);
    if (!panelAction) {
      return;
    }
    if (panelAction.panel === 'affairs' && panelAction.affairsSource) {
      setActiveAffairsSource(panelAction.affairsSource);
      openChamberPanel('affairs');
      return;
    }
    if (panelAction.panel === 'chronicle') {
      openChamberPanel('chronicle');
    }
  };

  const allConsorts = useMemo(() => [...concubines, ...customConsorts], [concubines, customConsorts]);
  const publicConsortEntries = useMemo(
    () =>
      getNpcActivitiesAtLocation(npcActivity, locationId, { includeResolved: true })
        .map((entry) => {
          const consort = allConsorts.find((candidate) => candidate.id === entry.actorConsortId);
          return consort ? { entry, consort } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [allConsorts, locationId, npcActivity],
  );
  const activeAudienceConsort = useMemo(
    () => allConsorts.find((consort) => consort.id === activeConsortAudience?.consortId) ?? null,
    [activeConsortAudience, allConsorts],
  );
  const npcEntries = useMemo<SubsceneNpcEntry[]>(
    () =>
      [
        ...extraNpcs,
        ...publicConsortEntries.map(({ entry, consort }) => ({
          id: `consort:${entry.id}`,
          kind: 'consort' as const,
          name: consort.name,
          identityLabel: getConcubineDisplayRankText(consort),
          ariaLabel: entry.resolved
            ? `${getConcubineDisplayRankText(consort)} ${consort.name}仍在此处`
            : `与${getConcubineDisplayRankText(consort)} ${consort.name}交谈`,
          portraitSrc: getConcubinePortraitPath(consort.portraitId),
          interactableState: entry.resolved ? ('spent' as const) : ('available' as const),
          disabledReason: entry.resolved ? '本旬已交谈过' : undefined,
          onClick: entry.resolved
            ? undefined
            : () => {
                setActiveConsortAudience({
                  entryId: entry.id,
                  consortId: consort.id,
                  summary: entry.summary,
                });
                resolveNpcActivityEntry(entry.id);
              },
        })),
      ],
    [extraNpcs, publicConsortEntries, resolveNpcActivityEntry],
  );
  const actionEntries = useMemo<SubsceneActionEntry[]>(
    () => [
      ...extraActions,
      ...(config?.actions ?? []).map((action) => ({
        id: action.id,
        label: action.label,
        onClick: () => handleAction(action),
      })),
      ...(config?.panelActions?.map((action) => ({
        id: action.id,
        label: action.label,
        onClick: () => handlePanelAction(action.id),
      })) ?? []),
    ],
    [config, extraActions],
  );

  if (!config) {
    return null;
  }

  if (activeConsortAudience && activeAudienceConsort) {
    return (
      <section className="map-subscene-view__encounter-shell" aria-label={`${activeAudienceConsort.name}${locationId}偶遇场景`}>
        <ConsortAudiencePanel
          consort={activeAudienceConsort}
          palaceLabel={locationId}
          hallLabel="偶遇"
          concubines={concubines}
          backLabel={`返回${locationId}`}
          initialActionLabel={`${locationId}偶遇`}
          encounterPlace="public"
          initialActionResult={`${activeConsortAudience.summary}你看见${getConcubineDisplayRankText(activeAudienceConsort)} ${
            activeAudienceConsort.name
          }正在此处，便主动上前搭话。`}
          onBack={(result) => {
            if (result?.shouldAdvanceTime) {
              finishTimedLocationAction(beginTimedLocationAction());
            }
            setActiveConsortAudience(null);
          }}
        />
      </section>
    );
  }

  return (
    <>
      <MapSubsceneView
        locationId={locationId}
        ariaLabel={`${locationId}行动`}
        npcStageLabel={`${locationId}可交互妃嫔`}
        npcs={npcEntries}
        actions={actionEntries}
        onLeave={enterMapMain}
      />

      {actionResultText ? (
        <LocationActionResultStage
          locationName={locationId}
          className="global-dialogue-stage--chamber"
          dialogueClassName="palace-dialogue-box--chamber"
          content={actionResultText}
          onNextAction={closeActionResult}
        />
      ) : null}

      {activeRandomSession && activeRandomLine ? (
        <GlobalDialogueStage
          sceneLabel={`${locationId}闲逛事件舞台`}
          portraitLabel={isPlayerRandomLine ? `${state.name}立绘` : `${activeRandomLine.speakerName || activeRandomLine.speakerIdentity}立绘`}
          portrait={
            isPlayerRandomLine && playerPortraitSrc ? (
              <img
                src={playerPortraitSrc}
                alt={state.name}
                className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--player"
              />
            ) : undefined
          }
          ariaLabel={`${locationId}闲逛事件`}
          className="global-dialogue-stage--chamber"
          dialogueClassName="palace-dialogue-box--chamber"
          suppressPortrait={!isPlayerRandomLine && !activeRandomLine.portraitKey}
          characterIdentity={activeRandomLine.speakerIdentity || '场景旁白'}
          characterName={activeRandomLine.speakerName || activeRandomLine.narrationName || locationId}
          narrationName={activeRandomLine.narrationName || locationId}
          content={activeRandomLine.text}
          options={activeRandomOptions.map((option) => ({ id: option.optionId, label: option.optionLabel }))}
          onSelectOption={handleRandomOptionSelect}
          onNextAction={activeRandomOptions.length === 0 ? handleRandomDialogueNext : undefined}
          splitQuotedDialogue={false}
        />
      ) : null}
    </>
  );
}
