import { useEffect, useMemo, useState } from 'react';

import { YANGXIN_VERDICT_BACKGROUND } from '../../config/locationSceneBackgrounds';
import {
  EMPEROR_MAIN_INTERACTION_ACTIONS,
} from '../../game/lib/emperorActivityRuntime';
import { renderNarrativeEntry } from '../../game/narrative/narrativeCatalog';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type {
  ConcubineProfile,
  EmperorInteractionSource,
  EmperorMainInteractionActionId,
  InventoryItem,
  MapAreaId,
} from '../../game/types';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { OVERNIGHT_TRANSITION_MS } from './NightlyServiceEventView';

const EMPEROR_PORTRAIT_SRC = '/assets/characters/men/rongan.png';
const EUNUCH_PORTRAIT_SRC = '/assets/characters/men/taijian.png';

type EmperorAudiencePhase =
  | 'request'
  | 'intro'
  | 'choose'
  | 'gift'
  | 'praise-target'
  | 'complain-target'
  | 'feedback'
  | 'farewell'
  | 'fade';

interface EmperorAudiencePanelProps {
  source: EmperorInteractionSource;
  location: MapAreaId;
  concubines: ConcubineProfile[];
  onLeave: () => void;
}

const formatPlayerAddress = (playerName: string, rankLabel: string): string => {
  const surname = playerName.trim().slice(0, 1);
  return `${surname || '娘娘'}${rankLabel}`;
};

const isEligibleTargetConsort = (consort: ConcubineProfile): boolean =>
  consort.status === 'live' && !consort.residence.includes('冷宫');

const isGiftForEmperor = (item: InventoryItem): boolean =>
  item.quantity > 0 && (item.category === 'food' || item.category === 'gift');

const buildEmperorFarewellText = (source: EmperorInteractionSource, location: MapAreaId): string =>
  renderNarrativeEntry(source === 'public-encounter' ? 'emperor.audience.farewell.public' : 'emperor.audience.farewell.yangxin', {
    locationName: location,
  }).text;

export function EmperorAudiencePanel({ source, location, concubines, onLeave }: EmperorAudiencePanelProps) {
  const {
    state,
    hiddenStats,
    inventory,
    requestEmperorAudience,
    completeEmperorMainInteraction,
    completeEmperorGift,
    completeEmperorReputationComment,
  } = useGameFlowStore();
  const [phase, setPhase] = useState<EmperorAudiencePhase>(source === 'yangxin-request' ? 'request' : 'intro');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackNextPhase, setFeedbackNextPhase] = useState<EmperorAudiencePhase>('choose');
  const [optionalUsed, setOptionalUsed] = useState(false);
  const [mainActionDone, setMainActionDone] = useState(false);
  const [farewellText, setFarewellText] = useState('');

  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const playerAddress = formatPlayerAddress(state.name, playerRankLabel);
  const giftItems = useMemo(() => inventory.filter(isGiftForEmperor), [inventory]);
  const targetConsorts = useMemo(() => concubines.filter(isEligibleTargetConsort), [concubines]);

  useEffect(() => {
    if (phase !== 'fade') {
      return undefined;
    }
    const timer = window.setTimeout(onLeave, OVERNIGHT_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [onLeave, phase]);

  const beginRequest = () => {
    const result = requestEmperorAudience(location, source);
    setFeedbackText(result.message);
    setFeedbackNextPhase(result.success ? 'intro' : 'fade');
    setPhase('feedback');
  };

  const handleMainAction = (actionId: EmperorMainInteractionActionId) => {
    const result = completeEmperorMainInteraction(actionId, location, source);
    setFeedbackText(result.message);
    if (result.success) {
      setMainActionDone(true);
      setFarewellText(buildEmperorFarewellText(source, location));
    }
    setFeedbackNextPhase(result.success ? 'farewell' : 'choose');
    setPhase('feedback');
  };

  const handleGift = (itemId: string) => {
    const result = completeEmperorGift(itemId);
    setFeedbackText(result.message);
    if (result.success) {
      setOptionalUsed(true);
    }
    setFeedbackNextPhase('choose');
    setPhase('feedback');
  };

  const handleReputationComment = (targetConsortId: string, direction: 'praise' | 'complain') => {
    const result = completeEmperorReputationComment(targetConsortId, direction);
    setFeedbackText(result.message);
    if (result.success) {
      setOptionalUsed(true);
    }
    setFeedbackNextPhase('choose');
    setPhase('feedback');
  };

  const handleFeedbackNext = () => {
    setPhase(feedbackNextPhase);
  };

  if (phase === 'fade') {
    return (
      <section className="nightly-service-event nightly-service-event--overnight nightly-service-event--fade-in" aria-label="离开养心殿">
        <div className="nightly-service-event__blackout" />
      </section>
    );
  }

  const stageClassName = `nightly-service-event emperor-audience-event emperor-audience-event--${phase}`;
  const commonDialogueProps = {
    className: 'global-dialogue-stage--nightly-service global-dialogue-stage--emperor-audience',
    dialogueClassName: 'palace-dialogue-box--chamber',
  };

  const emperorPortrait = (
    <div className="nightly-service-event__emperor-stage emperor-audience-event__emperor-stage" aria-label="容安立绘">
      <div className="nightly-service-event__emperor-frame">
        <img src={EMPEROR_PORTRAIT_SRC} alt="容安" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--emperor" />
      </div>
    </div>
  );

  if (phase === 'request') {
    const requestEntry = renderNarrativeEntry('emperor.audience.request');
    return (
      <section className={stageClassName} aria-label="养心殿求见">
        <div className="nightly-service-event__background" style={{ backgroundImage: `url("${YANGXIN_VERDICT_BACKGROUND}")` }} />
        <GlobalDialogueStage
          {...commonDialogueProps}
          sceneLabel="养心殿求见通传"
          portraitLabel="内侍立绘"
          portrait={<img src={EUNUCH_PORTRAIT_SRC} alt="内侍" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--eunuch" />}
          ariaLabel="养心殿求见通传"
          characterIdentity={requestEntry.speakerIdentity}
          characterName={requestEntry.speakerName}
          content={requestEntry.text}
          onNextAction={beginRequest}
        />
      </section>
    );
  }

  if (phase === 'intro') {
    const introNarrativeId = source === 'public-encounter' ? 'emperor.audience.intro.public' : 'emperor.audience.intro.yangxin';
    const introEntry = renderNarrativeEntry(introNarrativeId, { locationName: location, playerAddress });
    return (
      <section className={stageClassName} aria-label="皇帝日间互动开场">
        <div className="nightly-service-event__background" style={{ backgroundImage: `url("${YANGXIN_VERDICT_BACKGROUND}")` }} />
        {emperorPortrait}
        <GlobalDialogueStage
          {...commonDialogueProps}
          sceneLabel="皇帝日间互动开场"
          portraitLabel="容安常驻立绘"
          ariaLabel="皇帝日间互动开场"
          suppressPortrait
          characterIdentity={introEntry.speakerIdentity}
          characterName={introEntry.speakerName}
          content={introEntry.text}
          onNextAction={() => setPhase('choose')}
        />
      </section>
    );
  }

  if (phase === 'feedback') {
    const feedbackEntry = renderNarrativeEntry('emperor.audience.feedback.default', { locationName: location });
    return (
      <section className={stageClassName} aria-label="皇帝互动反馈">
        <div className="nightly-service-event__background" style={{ backgroundImage: `url("${YANGXIN_VERDICT_BACKGROUND}")` }} />
        {emperorPortrait}
        <GlobalDialogueStage
          {...commonDialogueProps}
          sceneLabel="皇帝互动反馈"
          portraitLabel="旁白无立绘"
          ariaLabel="皇帝互动反馈"
          suppressPortrait
          characterIdentity={feedbackEntry.speakerIdentity}
          characterName={feedbackEntry.speakerName}
          content={feedbackText || feedbackEntry.text}
          onNextAction={handleFeedbackNext}
          numericFeedbackBucket="map-event"
        />
      </section>
    );
  }

  if (phase === 'farewell') {
    const farewellEntry = renderNarrativeEntry(source === 'public-encounter' ? 'emperor.audience.farewell.public' : 'emperor.audience.farewell.yangxin', {
      locationName: location,
    });
    return (
      <section className={stageClassName} aria-label="皇帝互动告退">
        <div className="nightly-service-event__background" style={{ backgroundImage: `url("${YANGXIN_VERDICT_BACKGROUND}")` }} />
        {emperorPortrait}
        <GlobalDialogueStage
          {...commonDialogueProps}
          sceneLabel={source === 'public-encounter' ? '皇帝公共偶遇收束' : '养心殿告退'}
          portraitLabel="旁白无立绘"
          ariaLabel="皇帝互动告退"
          suppressPortrait
          characterIdentity={farewellEntry.speakerIdentity}
          characterName={farewellEntry.speakerName}
          content={farewellText || farewellEntry.text}
          onNextAction={() => setPhase('fade')}
        />
      </section>
    );
  }

  const showMainActions = phase === 'choose';
  const showGiftItems = phase === 'gift';
  const showPraiseTargets = phase === 'praise-target';
  const showComplainTargets = phase === 'complain-target';

  return (
    <section className={stageClassName} aria-label="皇帝日间互动选择">
      <div className="nightly-service-event__background" style={{ backgroundImage: `url("${YANGXIN_VERDICT_BACKGROUND}")` }} />
      {emperorPortrait}
      <div className="nightly-service-event__interest emperor-audience-event__status">
        可行主事 1 次 · 附加话题 {optionalUsed ? '已用' : '未用'}
      </div>
      <aside className="nightly-service-event__actions emperor-audience-event__actions emperor-audience-event__actions--main" aria-label="皇帝主行动">
        {showMainActions
          ? EMPEROR_MAIN_INTERACTION_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={mainActionDone || (action.requiredFavor != null && state.favor < action.requiredFavor)}
                title={action.requiredFavor != null && state.favor < action.requiredFavor ? '宠爱高于50后可选' : action.statLabel}
                onClick={() => handleMainAction(action.id)}
              >
                {action.label}
              </button>
            ))
          : null}
      </aside>
      <aside className="nightly-service-event__actions emperor-audience-event__actions emperor-audience-event__actions--optional" aria-label="皇帝附加行动">
        {showMainActions ? (
          <>
            <button type="button" disabled={optionalUsed || giftItems.length === 0} onClick={() => setPhase('gift')}>
              送礼
            </button>
            <button type="button" disabled={optionalUsed || targetConsorts.length === 0} onClick={() => setPhase('praise-target')}>
              美言
            </button>
            <button type="button" disabled={optionalUsed || targetConsorts.length === 0} onClick={() => setPhase('complain-target')}>
              诉苦
            </button>
          </>
        ) : null}
        {showGiftItems ? (
          <>
            {giftItems.map((item) => (
              <button key={item.itemId} type="button" onClick={() => handleGift(item.itemId)}>
                {item.name} x{item.quantity}
              </button>
            ))}
            <button type="button" onClick={() => setPhase('choose')}>
              返回
            </button>
          </>
        ) : null}
        {showPraiseTargets
          ? targetConsorts.map((consort) => (
              <button key={consort.id} type="button" onClick={() => handleReputationComment(consort.id, 'praise')}>
                {consort.rankLabel}
                {consort.name}
              </button>
            ))
          : null}
        {showComplainTargets
          ? targetConsorts.map((consort) => (
              <button key={consort.id} type="button" onClick={() => handleReputationComment(consort.id, 'complain')}>
                {consort.rankLabel}
                {consort.name}
              </button>
            ))
          : null}
        {showPraiseTargets || showComplainTargets ? (
          <button type="button" onClick={() => setPhase('choose')}>
            返回
          </button>
        ) : null}
      </aside>
    </section>
  );
}
