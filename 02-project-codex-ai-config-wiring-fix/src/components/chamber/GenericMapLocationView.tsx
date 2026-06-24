import { useMemo, useState } from 'react';
import { ConsortAudiencePanel } from '../consorts/ConsortAudiencePanel';
import { buildLocationActionNarrative } from '../../game/lib/actionNarrativeRuntime';
import { getMapLocationInteractionConfig, type MapLocationActionConfig } from '../../game/data/mapLocationActions';
import {
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
} from '../../game/data/concubineRoster';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { MapAreaId } from '../../game/types';
import { LocationActionResultStage } from './LocationActionResultStage';
import { MapSubsceneView, type SubsceneActionEntry, type SubsceneNpcEntry } from './MapSubsceneView';
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

export function GenericMapLocationView({ locationId, extraNpcs = [], extraActions = [] }: GenericMapLocationViewProps) {
  const config = useMemo(() => getMapLocationInteractionConfig(locationId), [locationId]);
  const applyStoryEffects = useGameFlowStore((store) => store.applyStoryEffects);
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
  const [activeConsortAudience, setActiveConsortAudience] = useState<{
    entryId: string;
    consortId: string;
    summary: string;
  } | null>(null);

  const handleAction = (action: MapLocationActionConfig) => {
    const outcome = beginTimedLocationAction({ staminaCost: action.staminaCost });
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
          onBack={() => setActiveConsortAudience(null)}
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
    </>
  );
}
