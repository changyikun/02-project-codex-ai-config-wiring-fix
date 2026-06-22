import { useMemo, useState } from 'react';
import { buildLocationActionNarrative } from '../../game/lib/actionNarrativeRuntime';
import { getMapLocationInteractionConfig, type MapLocationActionConfig } from '../../game/data/mapLocationActions';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { MapAreaId } from '../../game/types';
import { LocationActionResultStage } from './LocationActionResultStage';
import { useLocationActionFlow, type TimedLocationActionOutcome } from './useLocationActionFlow';

interface GenericMapLocationViewProps {
  locationId: MapAreaId;
}

const hasNumericEffects = (action: MapLocationActionConfig): boolean =>
  Boolean(
    action.effects &&
      ((action.effects.prestige ?? 0) !== 0 ||
        (action.effects.stress ?? 0) !== 0 ||
        (action.effects.trueHeart ?? 0) !== 0 ||
        Object.values(action.effects.stats ?? {}).some((value) => Number(value) !== 0)),
  );

export function GenericMapLocationView({ locationId }: GenericMapLocationViewProps) {
  const config = useMemo(() => getMapLocationInteractionConfig(locationId), [locationId]);
  const applyStoryEffects = useGameFlowStore((store) => store.applyStoryEffects);
  const markNumericFeedbackEvent = useGameFlowStore((store) => store.markNumericFeedbackEvent);
  const openChamberPanel = useGameFlowStore((store) => store.openChamberPanel);
  const setActiveAffairsSource = useGameFlowStore((store) => store.setActiveAffairsSource);
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [actionResultText, setActionResultText] = useState('');
  const [pendingTimedActionOutcome, setPendingTimedActionOutcome] = useState<TimedLocationActionOutcome | null>(null);

  if (!config) {
    return null;
  }

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

  return (
    <>
      <section className="dowager-audience-view__briefing chamber-main__location-choice" aria-label={`${locationId}行动`}>
        <strong>{`${locationId} · ${config.subtitle}`}</strong>
        <p>{config.idleText}</p>
        <div className="chamber-main__location-choice-actions">
          {config.actions.map((action) => (
            <button key={action.id} type="button" onClick={() => handleAction(action)}>
              {action.label}
            </button>
          ))}
          {config.panelActions?.map((action) => (
            <button key={action.id} type="button" onClick={() => handlePanelAction(action.id)}>
              {action.label}
            </button>
          ))}
        </div>
      </section>

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
