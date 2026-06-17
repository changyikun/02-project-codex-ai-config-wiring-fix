import { useEffect, useMemo, useState } from 'react';

import type { DialoguePortraitConfig, DialoguePortraitSegment } from '../dialogue/GlobalDialogueStage';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import {
  NIGHTLY_SERVICE_INTERACTION_ACTIONS,
  resolveNightlyServiceChoiceDelta,
} from '../../game/lib/nightlyServiceRuntime';
import type {
  ConcubineProfile,
  NightlyServiceGentleBranchId,
  NightlyServiceInteractionActionId,
  NightlyServiceInteractionChoice,
  NightlyServicePendingEvent,
} from '../../game/types';
import { renderNarrativeEntry } from '../../game/narrative/narrativeCatalog';

const EMPEROR_PORTRAIT_SRC = '/assets/characters/men/rongan.png';
const EUNUCH_PORTRAIT_SRC = '/assets/characters/men/taijian.png';
const YANGXIN_BACKGROUND_SRC = '/assets/routes/backgrounds/shiqin.png';
export const OVERNIGHT_TRANSITION_MS = 900;

type NightlyServiceViewPhase = 'notice' | 'choose' | 'feedback' | 'service' | 'overnight';
type GentleSelectionStep = 'branch' | 'praise-target' | 'smear-target';

interface NightlyServiceEventViewProps {
  pendingEvent: NightlyServicePendingEvent;
  playerName: string;
  playerPortrait?: string;
  playerStats?: Record<string, number>;
  concubines?: ConcubineProfile[];
  onComplete: (choices: NightlyServiceInteractionChoice[]) => void;
}

const actionOptions = NIGHTLY_SERVICE_INTERACTION_ACTIONS.map((action) => ({
  id: action.id,
  label: action.label,
}));

const resolveActionFeedback = (
  choice: NightlyServiceInteractionChoice | null,
  defaultText: string | undefined,
  concubines: ConcubineProfile[],
): string => {
  if (choice?.actionId !== 'gentle') {
    return defaultText ?? '你把话慢慢放轻，殿中气息也随之缓下来。';
  }

  if (choice.gentleBranchId === 'praise') {
    const target = concubines.find((consort) => consort.id === choice.targetConsortId);
    return target
      ? `你没有顺着话头争宠，只在合适处替${target.rankLabel}${target.name}留了余地。容安听完并未多言，指尖却在折角处停了一停。`
      : '你把话说得温和，殿中气息也随之缓下来。';
  }

  if (choice.gentleBranchId === 'smear') {
    const target = concubines.find((consort) => consort.id === choice.targetConsortId);
    return target
      ? `你没有把话说重，只点到${target.rankLabel}${target.name}近来一处失当。容安抬眼看你片刻，殿中烛影微微一晃。`
      : '你把话说得温和，殿中气息也随之缓下来。';
  }

  return defaultText ?? '你没有急着求赏，只把今日见闻慢慢说给他听。话到末处，殿中静下来，像是连烛火也跟着温顺了些。';
};

export function NightlyServiceEventView({
  pendingEvent,
  playerName,
  playerPortrait,
  playerStats = {},
  concubines = [],
  onComplete,
}: NightlyServiceEventViewProps) {
  const [phase, setPhase] = useState<NightlyServiceViewPhase>('notice');
  const [selectedChoices, setSelectedChoices] = useState<NightlyServiceInteractionChoice[]>([]);
  const [latestChoice, setLatestChoice] = useState<NightlyServiceInteractionChoice | null>(null);
  const [gentleSelectionStep, setGentleSelectionStep] = useState<GentleSelectionStep | null>(null);
  const [chooseIntroVisible, setChooseIntroVisible] = useState(true);

  const currentInterest = useMemo(
    () =>
      selectedChoices.reduce(
        (interest, choice) => Math.max(20, Math.min(100, interest + resolveNightlyServiceChoiceDelta(choice, playerStats))),
        pendingEvent.initialInterest,
      ),
    [pendingEvent.initialInterest, playerStats, selectedChoices],
  );
  const latestAction = NIGHTLY_SERVICE_INTERACTION_ACTIONS.find((action) => action.id === latestChoice?.actionId);
  const remainingInteractions = Math.max(0, pendingEvent.maxInteractions - selectedChoices.length);
  const hasThirdPartyChoice = selectedChoices.some((choice) => choice.actionId === 'gentle' && (choice.gentleBranchId === 'praise' || choice.gentleBranchId === 'smear'));
  const friendlyConsorts = concubines.filter((consort) => consort.status === 'live' && Number(consort.stats.relationToPlayer ?? 0) > 0);
  const hostileConsorts = concubines.filter((consort) => consort.status === 'live' && Number(consort.stats.relationToPlayer ?? 0) < 0);

  const resolvePortrait = (segment: DialoguePortraitSegment): DialoguePortraitConfig | undefined => {
    if (segment.characterName === playerName && playerPortrait) {
      return {
        label: `${playerName}立绘`,
        placement: 'dialogue-left',
        portrait: <img src={playerPortrait} alt={playerName} className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--player" />,
      };
    }

    if (segment.characterName === '容安') {
      return {
        label: '容安立绘',
        portrait: <img src={EMPEROR_PORTRAIT_SRC} alt="容安" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--emperor" />,
      };
    }

    return undefined;
  };

  const addChoice = (choice: NightlyServiceInteractionChoice) => {
    setLatestChoice(choice);
    setSelectedChoices((current) => [...current, choice].slice(0, pendingEvent.maxInteractions));
    setGentleSelectionStep(null);
    setPhase('feedback');
  };

  const handleAction = (optionId: string) => {
    const actionId = optionId as NightlyServiceInteractionActionId;
    if (actionId === 'gentle') {
      setGentleSelectionStep('branch');
      return;
    }

    addChoice({ actionId });
  };

  const handleGentleBranch = (branchId: NightlyServiceGentleBranchId) => {
    if (branchId === 'comfort') {
      addChoice({ actionId: 'gentle', gentleBranchId: 'comfort' });
      return;
    }

    setGentleSelectionStep(branchId === 'praise' ? 'praise-target' : 'smear-target');
  };

  const handleGentleTarget = (branchId: Exclude<NightlyServiceGentleBranchId, 'comfort'>, targetConsortId: string) => {
    addChoice({ actionId: 'gentle', gentleBranchId: branchId, targetConsortId });
  };

  const handleFeedbackDone = () => {
    if (selectedChoices.length >= pendingEvent.maxInteractions) {
      setPhase('service');
      return;
    }

    setChooseIntroVisible(false);
    setPhase('choose');
  };

  useEffect(() => {
    if (phase !== 'overnight') {
      return undefined;
    }

    const timer = window.setTimeout(() => onComplete(selectedChoices), OVERNIGHT_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete, phase, selectedChoices]);

  if (phase === 'overnight') {
    return (
      <section className="nightly-service-event nightly-service-event--overnight nightly-service-event--fade-in" aria-label="一夜过去">
        <div className="nightly-service-event__blackout" />
      </section>
    );
  }

  const stageClassName = `nightly-service-event nightly-service-event--${phase}`;
  const showPersistentEmperorPortrait = phase === 'choose' || phase === 'feedback' || phase === 'service';
  const commonProps = {
    resolvePortrait,
    className: 'global-dialogue-stage--nightly-service',
    dialogueClassName: 'palace-dialogue-box--chamber',
  };

  const persistentEmperorPortrait = showPersistentEmperorPortrait ? (
    <div className="nightly-service-event__emperor-stage" aria-label="容安立绘">
      <div className="nightly-service-event__emperor-frame">
        <img src={EMPEROR_PORTRAIT_SRC} alt="容安" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--emperor" />
      </div>
    </div>
  ) : null;

  if (phase === 'notice') {
    const summonEntry = renderNarrativeEntry('nightly.service.summon', {
      rankLabel: pendingEvent.rankLabel,
      playerName: pendingEvent.playerName,
    });
    return (
      <section className={stageClassName} aria-label="侍寝太监通报">
        <div className="nightly-service-event__background" style={{ backgroundImage: `url("${YANGXIN_BACKGROUND_SRC}")` }} />
        <GlobalDialogueStage
          {...commonProps}
          sceneLabel="侍寝太监通报"
          portraitLabel="传旨太监立绘"
          portrait={<img src={EUNUCH_PORTRAIT_SRC} alt="传旨太监" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--eunuch" />}
          ariaLabel="侍寝太监通报"
          characterIdentity={summonEntry.speakerIdentity}
          characterName={summonEntry.speakerName}
          content={summonEntry.text}
          splitQuotedDialogue={false}
          onNextAction={() => {
            setChooseIntroVisible(true);
            setPhase('choose');
          }}
          numericFeedbackBucket="nightly-service"
        />
      </section>
    );
  }

  if (phase === 'choose') {
    const introEntry = renderNarrativeEntry('nightly.service.intro');
    return (
      <section className={stageClassName} aria-label="养心殿侍寝互动">
        <div className="nightly-service-event__background" style={{ backgroundImage: `url("${YANGXIN_BACKGROUND_SRC}")` }} />
        {persistentEmperorPortrait}
        <div className="nightly-service-event__interest">兴致 {currentInterest} / 100 · 还可互动 {remainingInteractions} 次</div>
        {!chooseIntroVisible && gentleSelectionStep ? (
          <aside className="nightly-service-event__actions nightly-service-event__actions--branch" aria-label="温言絮语分支">
            {gentleSelectionStep === 'branch' ? (
              <>
                <button type="button" onClick={() => handleGentleBranch('comfort')}>
                  温柔抚慰
                </button>
                <button type="button" disabled={hasThirdPartyChoice || friendlyConsorts.length === 0} onClick={() => handleGentleBranch('praise')}>
                  为交好妃嫔美言
                </button>
                <button type="button" disabled={hasThirdPartyChoice || hostileConsorts.length === 0} onClick={() => handleGentleBranch('smear')}>
                  对交恶妃嫔进言
                </button>
                <button type="button" onClick={() => setGentleSelectionStep(null)}>
                  返回
                </button>
              </>
            ) : null}
            {gentleSelectionStep === 'praise-target'
              ? friendlyConsorts.map((consort) => (
                  <button key={consort.id} type="button" onClick={() => handleGentleTarget('praise', consort.id)}>
                    {consort.rankLabel}
                    {consort.name}
                  </button>
                ))
              : null}
            {gentleSelectionStep === 'smear-target'
              ? hostileConsorts.map((consort) => (
                  <button key={consort.id} type="button" onClick={() => handleGentleTarget('smear', consort.id)}>
                    {consort.rankLabel}
                    {consort.name}
                  </button>
                ))
              : null}
          </aside>
        ) : !chooseIntroVisible ? (
          <aside className="nightly-service-event__actions" aria-label="养心殿侍寝操作">
            {actionOptions.map((action) => (
              <button key={action.id} type="button" onClick={() => handleAction(action.id)}>
                {action.label}
              </button>
            ))}
          </aside>
        ) : null}
        {chooseIntroVisible ? (
          <GlobalDialogueStage
            {...commonProps}
            sceneLabel="养心殿侍寝互动"
            portraitLabel="旁白无立绘"
            ariaLabel="养心殿侍寝互动"
            characterIdentity={introEntry.speakerIdentity}
            characterName={introEntry.speakerName}
            content={introEntry.text}
            onNextAction={() => setChooseIntroVisible(false)}
          />
        ) : null}
      </section>
    );
  }

  if (phase === 'feedback') {
    return (
      <section className={stageClassName} aria-label="侍寝互动反馈">
        <div className="nightly-service-event__background" style={{ backgroundImage: `url("${YANGXIN_BACKGROUND_SRC}")` }} />
        {persistentEmperorPortrait}
        <div className="nightly-service-event__interest">兴致 {currentInterest} / 100 · 已互动 {selectedChoices.length} / {pendingEvent.maxInteractions}</div>
        <GlobalDialogueStage
          {...commonProps}
          sceneLabel="侍寝互动反馈"
          portraitLabel="旁白无立绘"
          ariaLabel="侍寝互动反馈"
          characterIdentity="场景旁白"
          characterName="养心殿"
          content={resolveActionFeedback(latestChoice, latestAction?.feedback, concubines)}
          onNextAction={handleFeedbackDone}
        />
      </section>
    );
  }

  const afterEntry = renderNarrativeEntry('nightly.service.after');
  return (
    <section className={stageClassName} aria-label="正式侍寝剧情">
      <div className="nightly-service-event__background" style={{ backgroundImage: `url("${YANGXIN_BACKGROUND_SRC}")` }} />
      {persistentEmperorPortrait}
      <div className="nightly-service-event__interest">最终兴致 {currentInterest} / 100</div>
      <GlobalDialogueStage
        {...commonProps}
        sceneLabel="正式侍寝剧情"
        portraitLabel="旁白无立绘"
        ariaLabel="正式侍寝剧情"
        characterIdentity={afterEntry.speakerIdentity}
        characterName={afterEntry.speakerName}
        content={afterEntry.text}
        onNextAction={() => setPhase('overnight')}
      />
    </section>
  );
}
