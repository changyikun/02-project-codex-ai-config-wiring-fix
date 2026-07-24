import { useMemo, useState } from 'react';

import { getConcubineDisplayRankText } from '../../game/data/concubineRoster';
import {
  EMPEROR_DAY_AUDIENCE_ACTIONS,
  EMPEROR_DAY_AUDIENCE_INTERACTION_LIMIT,
} from '../../game/lib/emperorDayAudienceRuntime';
import { renderNarrativeEntry } from '../../game/narrative/narrativeCatalog';
import { requireNonConsortNpcProfile } from '../../game/npcs/npcCatalog';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type {
  ConcubineProfile,
  EmperorInteractionSource,
  EmperorMainInteractionActionId,
  InventoryItem,
  MapAreaId,
} from '../../game/types';
import { AudienceInteractionShell, type AudienceMetaRow } from '../consorts/AudienceInteractionShell';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';

const EMPEROR_PROFILE = requireNonConsortNpcProfile('rongan');
const EMPEROR_PORTRAIT_SRC = EMPEROR_PROFILE.portraitSrc ?? '';
const EUNUCH_PORTRAIT_SRC = '/assets/characters/men/taijian.png';

type EmperorAudiencePhase =
  | 'request'
  | 'intro'
  | 'choose'
  | 'gift'
  | 'praise-target'
  | 'complain-target'
  | 'feedback'
  | 'farewell';

interface EmperorAudiencePanelProps {
  source: EmperorInteractionSource;
  location: MapAreaId;
  concubines: ConcubineProfile[];
  skipRequest?: boolean;
  onEnterInterior?: () => void;
  onLeave: (result?: { shouldAdvanceTime?: boolean }) => void;
}

const formatPlayerAddress = (playerName: string, rankLabel: string): string => {
  const surname = playerName.trim().slice(0, 1);
  return `${surname || '小主'}${rankLabel}`;
};

const isEligibleTargetConsort = (consort: ConcubineProfile): boolean =>
  consort.status === 'live' && !consort.residence.includes('冷宫');

const isGiftForEmperor = (item: InventoryItem): boolean =>
  item.quantity > 0 && (item.category === 'food' || item.category === 'gift');

const buildEmperorFarewellText = (source: EmperorInteractionSource, location: MapAreaId): string =>
  renderNarrativeEntry(source === 'public-encounter' ? 'emperor.audience.farewell.public' : 'emperor.audience.farewell.yangxin', {
    locationName: location,
  }).text;

export function EmperorAudiencePanel({ source, location, concubines, skipRequest = false, onEnterInterior, onLeave }: EmperorAudiencePanelProps) {
  const {
    state,
    hiddenStats,
    inventory,
    requestEmperorAudience,
    completeEmperorMainInteraction,
    completeEmperorGift,
    completeEmperorReputationComment,
  } = useGameFlowStore();
  const [phase, setPhase] = useState<EmperorAudiencePhase>(source === 'yangxin-request' && !skipRequest ? 'request' : 'intro');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackNextPhase, setFeedbackNextPhase] = useState<EmperorAudiencePhase | 'leave'>('choose');
  const [interactionCount, setInteractionCount] = useState(0);
  const [farewellText, setFarewellText] = useState('');

  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const playerAddress = formatPlayerAddress(state.name, playerRankLabel);
  const giftItems = useMemo(() => inventory.filter(isGiftForEmperor), [inventory]);
  const targetConsorts = useMemo(() => concubines.filter(isEligibleTargetConsort), [concubines]);
  const remainingInteractionCount = Math.max(0, EMPEROR_DAY_AUDIENCE_INTERACTION_LIMIT - interactionCount);
  const interactionLimitReached = remainingInteractionCount <= 0;
  const dialogueActive = phase === 'request' || phase === 'intro' || phase === 'feedback' || phase === 'farewell';

  const finishAudience = () => {
    onLeave({ shouldAdvanceTime: source === 'yangxin-request' || interactionCount > 0 });
  };

  const markInteractionConsumed = () => {
    const nextCount = interactionCount + 1;
    setInteractionCount(nextCount);
    if (nextCount >= EMPEROR_DAY_AUDIENCE_INTERACTION_LIMIT) {
      setFarewellText(buildEmperorFarewellText(source, location));
      setFeedbackNextPhase('farewell');
    } else {
      setFeedbackNextPhase('choose');
    }
  };

  const beginRequest = () => {
    const result = requestEmperorAudience(location, source);
    setFeedbackText(result.message);
    setFeedbackNextPhase(result.success ? 'intro' : 'leave');
    setPhase('feedback');
  };

  const handleMainAction = (actionId: EmperorMainInteractionActionId) => {
    if (interactionLimitReached) {
      return;
    }
    const result = completeEmperorMainInteraction(actionId, location, source);
    setFeedbackText(result.message);
    if (result.success) {
      markInteractionConsumed();
    } else {
      setFeedbackNextPhase('choose');
    }
    setPhase('feedback');
  };

  const handleGift = (itemId: string) => {
    if (interactionLimitReached) {
      return;
    }
    const result = completeEmperorGift(itemId);
    setFeedbackText(result.message);
    if (result.success) {
      markInteractionConsumed();
    } else {
      setFeedbackNextPhase('choose');
    }
    setPhase('feedback');
  };

  const handleReputationComment = (targetConsortId: string, direction: 'praise' | 'complain') => {
    if (interactionLimitReached) {
      return;
    }
    const result = completeEmperorReputationComment(targetConsortId, direction);
    setFeedbackText(result.message);
    if (result.success) {
      markInteractionConsumed();
    } else {
      setFeedbackNextPhase('choose');
    }
    setPhase('feedback');
  };

  const handleFeedbackNext = () => {
    if (feedbackNextPhase === 'leave') {
      onLeave({ shouldAdvanceTime: false });
      return;
    }
    if (source === 'yangxin-request' && feedbackNextPhase === 'intro') {
      onEnterInterior?.();
    }
    setPhase(feedbackNextPhase);
  };

  const emperorPortrait = (
    <div
      className="harem-palace-view__audience-portrait-stage emperor-day-audience-view__portrait-stage"
      aria-label={`${EMPEROR_PROFILE.displayName}常驻立绘`}
    >
      <div className="harem-palace-view__audience-portrait-frame emperor-day-audience-view__portrait-frame">
        <img
          src={EMPEROR_PORTRAIT_SRC}
          alt={EMPEROR_PROFILE.displayName}
          className="harem-palace-view__audience-portrait emperor-day-audience-view__portrait"
        />
      </div>
    </div>
  );

  if (phase === 'request') {
    const requestEntry = renderNarrativeEntry('emperor.audience.request');
    return (
      <GlobalDialogueStage
        sceneLabel="养心殿求见通传"
        portraitLabel="内侍立绘"
        portrait={<img src={EUNUCH_PORTRAIT_SRC} alt="内侍" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--eunuch" />}
        ariaLabel="养心殿求见通传"
        className="global-dialogue-stage--chamber"
        dialogueClassName="palace-dialogue-box--chamber"
        characterIdentity={requestEntry.speakerIdentity}
        characterName={requestEntry.speakerName}
        content={requestEntry.text}
        onNextAction={beginRequest}
      />
    );
  }

  const metaRows: AudienceMetaRow[] = [
    { label: '当前地点', value: location },
    { label: '会面来源', value: source === 'public-encounter' ? '外景偶遇' : '养心殿求见' },
    { label: '御前称谓', value: playerAddress },
  ];

  const actions = (
    <aside className="harem-palace-view__audience-actions emperor-day-audience-view__actions" aria-label="皇帝日间交互操作">
      <span className="harem-palace-view__audience-action-note">
        {`本次可互动 ${remainingInteractionCount}/${EMPEROR_DAY_AUDIENCE_INTERACTION_LIMIT}`}
      </span>
      {EMPEROR_DAY_AUDIENCE_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => handleMainAction(action.id)}
          disabled={dialogueActive || interactionLimitReached}
          title={action.statLabel}
        >
          {action.label}
        </button>
      ))}
      <button type="button" className={phase === 'gift' ? 'is-active' : ''} onClick={() => setPhase('gift')} disabled={dialogueActive || interactionLimitReached || giftItems.length === 0}>
        送礼
      </button>
      <button
        type="button"
        className={phase === 'praise-target' ? 'is-active' : ''}
        onClick={() => setPhase('praise-target')}
        disabled={dialogueActive || interactionLimitReached || targetConsorts.length === 0}
      >
        美言
      </button>
      <button
        type="button"
        className={phase === 'complain-target' ? 'is-active' : ''}
        onClick={() => setPhase('complain-target')}
        disabled={dialogueActive || interactionLimitReached || targetConsorts.length === 0}
      >
        诉苦
      </button>
      <button type="button" className="harem-palace-view__audience-return" onClick={finishAudience} disabled={dialogueActive}>
        返回
      </button>
    </aside>
  );

  const picker =
    phase === 'gift' || phase === 'praise-target' || phase === 'complain-target' ? (
      <section className="harem-palace-view__audience-picker harem-palace-view__audience-picker--gift" aria-label="皇帝交互选择面板">
        <header>
          <strong>{phase === 'gift' ? '奉上礼物' : phase === 'praise-target' ? '选择美言对象' : '选择诉苦对象'}</strong>
          <button type="button" onClick={() => setPhase('choose')}>
            收起
          </button>
        </header>
        <div className="harem-palace-view__audience-picker-list">
          {phase === 'gift'
            ? giftItems.map((item) => (
                <button key={item.itemId} type="button" onClick={() => handleGift(item.itemId)}>
                  <strong>{`${item.name} ×${item.quantity}`}</strong>
                  <span>{item.description}</span>
                </button>
              ))
            : targetConsorts.map((consort) => (
                <button
                  key={consort.id}
                  type="button"
                  onClick={() => handleReputationComment(consort.id, phase === 'praise-target' ? 'praise' : 'complain')}
                >
                  <strong>{`${getConcubineDisplayRankText(consort)} ${consort.name}`}</strong>
                  <span>{consort.residence}</span>
                </button>
              ))}
        </div>
      </section>
    ) : undefined;

  const dialogue = dialogueActive ? (
    <GlobalDialogueStage
      sceneLabel="皇帝日间会面"
      portraitLabel="容安常驻立绘"
      ariaLabel="皇帝日间会面对话"
      className="global-dialogue-stage--consort global-dialogue-stage--with-side-panel emperor-day-audience-view__dialogue"
      dialogueClassName="palace-dialogue-box--consort-audience"
      suppressPortrait
      characterIdentity={phase === 'farewell' ? '场景旁白' : '皇帝'}
      characterName={phase === 'farewell' ? (source === 'public-encounter' ? '恭送圣驾' : '养心殿') : '容安'}
      content={
        phase === 'intro'
          ? renderNarrativeEntry(source === 'public-encounter' ? 'emperor.audience.intro.public' : 'emperor.audience.intro.yangxin', {
              locationName: location,
              playerAddress,
            }).text
          : phase === 'farewell'
            ? farewellText || buildEmperorFarewellText(source, location)
            : feedbackText
      }
      onNextAction={
        phase === 'intro'
          ? () => setPhase('choose')
          : phase === 'farewell'
            ? finishAudience
            : handleFeedbackNext
      }
      numericFeedbackBucket={phase === 'feedback' ? 'map-event' : undefined}
    />
  ) : undefined;

  return (
    <AudienceInteractionShell
      ariaLabel="皇帝 日间会面"
      heading={source === 'public-encounter' ? `${location} · 容安` : '养心殿 · 容安'}
      className="emperor-day-audience-view"
      metaRows={metaRows}
      portrait={emperorPortrait}
      actions={actions}
      picker={picker}
      dialogue={dialogue}
    />
  );
}
