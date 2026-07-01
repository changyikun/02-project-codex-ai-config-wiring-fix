import { useMemo, useState } from 'react';

import { getConcubineDisplayRankText, getConcubinePortraitPath } from '../../game/data/concubineRoster';
import { isConsortGiftItem } from '../../game/lib/consortVisitRuntime';
import { EMPEROR_SCHEDULE_SLOTS, getEmperorScheduledLocation } from '../../game/lib/emperorActivityRuntime';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import {
  LI_GONGGONG_NPC_ID,
  LI_GONGGONG_NPC_NAME,
  PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN,
  createPermanentNpcRelationship,
  normalizePermanentNpcRelationshipForXun,
} from '../../game/lib/permanentNpcRuntime';
import { renderNarrativeEntry } from '../../game/narrative/narrativeCatalog';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { ConcubineProfile, EmperorInteractionSource, EmperorScheduleState, InventoryItem, MapAreaId, TimeSlot } from '../../game/types';
import { AudienceInteractionShell, type AudienceMetaRow } from '../consorts/AudienceInteractionShell';
import { ConsortAudiencePanel } from '../consorts/ConsortAudiencePanel';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { MapSubsceneView, type SubsceneNpcEntry } from './MapSubsceneView';
import { useLocationActionFlow } from './useLocationActionFlow';

interface YangxinHallViewProps {
  concubines: ConcubineProfile[];
  onStartEmperorAudience: (source: EmperorInteractionSource, location: MapAreaId, options?: { skipRequest?: boolean }) => void;
}

export const LI_GONGGONG_PORTRAIT_SRC = '/assets/characters/men/ligonggong.png';
const BRIBE_COST = 50;
const BRIBE_AFFINITY_DELTA = 8;
const TALK_AFFINITY_DELTA = 1;

const getXunKey = (time: { year: number; month: number; xun: number }) => `${time.year}-${time.month}-${time.xun}`;

const buildPermanentNpcRelationLabel = (affinity: number): string => {
  if (affinity >= 70) return '肯照应';
  if (affinity >= 40) return '相熟';
  if (affinity > 0) return '认得';
  return '生疏';
};

const buildMoodHint = (mood: number, affinity: number): string => {
  if (affinity < 30) return '';
  if (mood < 0) return '皇上今日心绪很差，御前说话最好少碰锋芒。';
  if (mood <= 20) return '皇上今日兴致不高，能少绕弯便少绕弯。';
  if (mood <= 50) return '皇上今日心绪平平，规矩话比讨巧话稳妥。';
  if (mood <= 70) return affinity >= 70 ? '皇上今日心情尚可，批折子时也肯听人说两句。' : '皇上今日心情尚可。';
  return affinity >= 70 ? '皇上今日心情不错，御前气氛比往常松些。' : '皇上今日心情不错。';
};

const buildScheduleHint = (
  schedule: EmperorScheduleState,
  entrySlot: TimeSlot,
  currentLocation: MapAreaId,
  affinity: number,
): string => {
  if (affinity < 20) {
    return currentLocation === '养心殿' ? '皇上眼下在殿中。' : '皇上眼下不在殿中。';
  }
  if (affinity < 50) {
    return currentLocation === '养心殿' ? '皇上此刻在殿中。' : `皇上此刻不在殿中，听说去了${currentLocation}。`;
  }
  const currentIndex = EMPEROR_SCHEDULE_SLOTS.indexOf(entrySlot);
  const nextSlot = EMPEROR_SCHEDULE_SLOTS[currentIndex + 1];
  if (affinity < 75 || !nextSlot) {
    return `皇上此刻在${currentLocation}。`;
  }
  const restSchedule = EMPEROR_SCHEDULE_SLOTS.slice(currentIndex, currentIndex + 3)
    .map((slot) => `${slot}${schedule.slots[slot].location}`)
    .join('、');
  return `李公公把近几个时辰的去向也说了：${restSchedule}。`;
};

const isGiftForLiGonggong = (item: InventoryItem): boolean =>
  item.quantity > 0 && isConsortGiftItem(item) && !item.isQuestItem;

export function YangxinHallView({ concubines, onStartEmperorAudience }: YangxinHallViewProps) {
  const {
    state,
    time,
    hiddenStats,
    inventory,
    customConsorts,
    permanentNpcRelationships,
    emperorInteraction,
    npcActivity,
    ensurePermanentNpcRelationship,
    markPermanentNpcMet,
    recordPermanentNpcInteractionAction,
    applyPermanentNpcAffinityDelta,
    applyStoryEffects,
    markNumericFeedbackEvent,
    consumeInventoryItem,
    requestEmperorAudience,
    resolveNpcActivityEntry,
    enterMapMain,
  } = useGameFlowStore();
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [activeLiGonggong, setActiveLiGonggong] = useState(false);
  const [dialogueMode, setDialogueMode] = useState<'entry' | 'feedback' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [activePicker, setActivePicker] = useState<'gift' | null>(null);
  const [consumedInteraction, setConsumedInteraction] = useState(false);
  const [shouldOpenEmperorAfterFeedback, setShouldOpenEmperorAfterFeedback] = useState(false);
  const [activeConsortAudience, setActiveConsortAudience] = useState<{
    entryId: string;
    consortId: string;
    summary: string;
  } | null>(null);

  const entryTime = useGameFlowStore((store) => store.activeMapLocationEntryTime ?? store.time);
  const currentXunKey = getXunKey(time);
  const relationship = normalizePermanentNpcRelationshipForXun(
    permanentNpcRelationships[LI_GONGGONG_NPC_ID] ??
      createPermanentNpcRelationship(LI_GONGGONG_NPC_ID, LI_GONGGONG_NPC_NAME, currentXunKey),
    LI_GONGGONG_NPC_ID,
    LI_GONGGONG_NPC_NAME,
    currentXunKey,
  );
  const remainingInteractionCount = Math.max(
    0,
    PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN - Number(relationship.actionCountThisXun ?? 0),
  );
  const allConsorts = useMemo(() => [...concubines, ...customConsorts], [concubines, customConsorts]);
  const publicConsortEntries = useMemo(
    () =>
      getNpcActivitiesAtLocation(npcActivity, '养心殿', { includeResolved: true })
        .map((entry) => {
          const consort = allConsorts.find((candidate) => candidate.id === entry.actorConsortId);
          return consort ? { entry, consort } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [allConsorts, npcActivity],
  );
  const activeAudienceConsort = useMemo(
    () => allConsorts.find((consort) => consort.id === activeConsortAudience?.consortId) ?? null,
    [activeConsortAudience, allConsorts],
  );
  const giftableInventory = useMemo(
    () => inventory.filter(isGiftForLiGonggong).sort((left, right) => left.price - right.price),
    [inventory],
  );
  const scheduledLocation = getEmperorScheduledLocation(emperorInteraction, entryTime);
  const isFirstMeet = activeLiGonggong && !relationship.met;
  const entryText = renderNarrativeEntry(isFirstMeet ? 'yangxin.li-gonggong.first-meet' : 'yangxin.li-gonggong.idle').text;
  const dialogueActive = dialogueMode != null;

  const closeLiGonggong = () => {
    if (consumedInteraction) {
      finishTimedLocationAction(beginTimedLocationAction());
    }
    setActiveLiGonggong(false);
    setDialogueMode(null);
    setFeedbackText('');
    setActivePicker(null);
    setConsumedInteraction(false);
    setShouldOpenEmperorAfterFeedback(false);
  };

  const openLiGonggong = () => {
    ensurePermanentNpcRelationship(LI_GONGGONG_NPC_ID, LI_GONGGONG_NPC_NAME);
    setActiveLiGonggong(true);
    setDialogueMode('entry');
    setFeedbackText('');
    setActivePicker(null);
    setConsumedInteraction(false);
    setShouldOpenEmperorAfterFeedback(false);
  };

  const handleDialogueNext = () => {
    if (dialogueMode === 'entry') {
      if (isFirstMeet) {
        markPermanentNpcMet(LI_GONGGONG_NPC_ID, LI_GONGGONG_NPC_NAME);
      }
      setDialogueMode(null);
      return;
    }
    if (shouldOpenEmperorAfterFeedback) {
      setActiveLiGonggong(false);
      setDialogueMode(null);
      setFeedbackText('');
      setActivePicker(null);
      setConsumedInteraction(false);
      setShouldOpenEmperorAfterFeedback(false);
      onStartEmperorAudience('yangxin-request', '养心殿', { skipRequest: true });
      return;
    }
    setDialogueMode(null);
  };

  const consumeLiAction = (actionId: 'talk' | 'gift' | 'yangxin-request' | 'bribe'): boolean => {
    const result = recordPermanentNpcInteractionAction(LI_GONGGONG_NPC_ID, LI_GONGGONG_NPC_NAME, actionId);
    if (!result.success) {
      setFeedbackText(renderNarrativeEntry('yangxin.li-gonggong.interaction.limit').text);
      setDialogueMode('feedback');
      return false;
    }
    setConsumedInteraction(true);
    return true;
  };

  const handleRequestEmperor = () => {
    if (!consumeLiAction('yangxin-request')) {
      return;
    }
    const result = requestEmperorAudience('养心殿', 'yangxin-request', {
      gatekeeperAffinity: relationship.affinity,
      requireEmperorAtLocation: true,
    });
    setFeedbackText(
      renderNarrativeEntry(
        result.success
          ? 'yangxin.li-gonggong.request.success'
          : scheduledLocation === '养心殿'
            ? 'yangxin.li-gonggong.request.fail'
            : 'yangxin.li-gonggong.request.not-in-hall',
      ).text,
    );
    setShouldOpenEmperorAfterFeedback(result.success);
    setDialogueMode('feedback');
  };

  const handleTalk = () => {
    if (!consumeLiAction('talk')) {
      return;
    }
    applyPermanentNpcAffinityDelta(LI_GONGGONG_NPC_ID, LI_GONGGONG_NPC_NAME, TALK_AFFINITY_DELTA);
    setFeedbackText(
      renderNarrativeEntry('yangxin.li-gonggong.chat', {
        scheduleHint: buildScheduleHint(emperorInteraction.schedule, entryTime.slot, scheduledLocation, relationship.affinity),
        moodHint: buildMoodHint(emperorInteraction.mood, relationship.affinity),
      }).text,
    );
    setDialogueMode('feedback');
  };

  const handleBribe = () => {
    if (state.silver < BRIBE_COST) {
      setFeedbackText(renderNarrativeEntry('yangxin.li-gonggong.bribe.insufficient', { bribeCost: BRIBE_COST }).text);
      setDialogueMode('feedback');
      return;
    }
    if (!consumeLiAction('bribe')) {
      return;
    }
    applyStoryEffects({ silver: -BRIBE_COST });
    markNumericFeedbackEvent('map-event');
    applyPermanentNpcAffinityDelta(LI_GONGGONG_NPC_ID, LI_GONGGONG_NPC_NAME, BRIBE_AFFINITY_DELTA);
    setFeedbackText(renderNarrativeEntry('yangxin.li-gonggong.bribe').text);
    setDialogueMode('feedback');
  };

  const handleGift = (itemId: string) => {
    const item = giftableInventory.find((candidate) => candidate.itemId === itemId);
    if (!item || !consumeLiAction('gift')) {
      return;
    }
    if (!consumeInventoryItem(item.itemId)) {
      return;
    }
    applyPermanentNpcAffinityDelta(LI_GONGGONG_NPC_ID, LI_GONGGONG_NPC_NAME, item.favorDelta);
    setActivePicker(null);
    setFeedbackText(renderNarrativeEntry('yangxin.li-gonggong.gift', { itemName: item.name }).text);
    setDialogueMode('feedback');
  };

  const handleStartConsortAudience = (entryId: string) => {
    const activity = publicConsortEntries.find((item) => item.entry.id === entryId);
    if (!activity || activity.entry.resolved) {
      return;
    }
    setActiveConsortAudience({
      entryId,
      consortId: activity.consort.id,
      summary: activity.entry.summary,
    });
    resolveNpcActivityEntry(entryId);
  };

  const subsceneNpcEntries = useMemo<SubsceneNpcEntry[]>(
    () => [
      {
        id: 'fixed:li-gonggong',
        kind: 'fixed',
        name: LI_GONGGONG_NPC_NAME,
        identityLabel: '太监总管',
        portraitSrc: LI_GONGGONG_PORTRAIT_SRC,
        onClick: openLiGonggong,
      },
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
        onClick: entry.resolved ? undefined : () => handleStartConsortAudience(entry.id),
      })),
    ],
    [publicConsortEntries],
  );

  if (activeConsortAudience && activeAudienceConsort) {
    return (
      <section className="map-subscene-view__encounter-shell" aria-label={`${activeAudienceConsort.name} 养心殿偶遇场景`}>
        <ConsortAudiencePanel
          consort={activeAudienceConsort}
          palaceLabel="养心殿"
          hallLabel="偶遇"
          concubines={concubines}
          backLabel="返回"
          initialActionLabel="养心殿偶遇"
          encounterPlace="public"
          initialActionResult={`养心殿前内侍来去无声。${activeConsortAudience.summary}你看见${getConcubineDisplayRankText(
            activeAudienceConsort,
          )} ${activeAudienceConsort.name}正在此处，便主动上前搭话。`}
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

  if (activeLiGonggong) {
    const metaRows: AudienceMetaRow[] = [
      { label: '当前状态', value: relationship.met ? '已见过' : '初见' },
      { label: '对你态度', value: relationship.affinity },
      { label: '关系', value: buildPermanentNpcRelationLabel(relationship.affinity) },
      { label: '口风', value: relationship.affinity >= 70 ? '肯多说' : relationship.affinity >= 30 ? '略肯提点' : '谨慎' },
    ];
    const portrait = (
      <div className="harem-palace-view__audience-portrait-stage" aria-label="李公公常驻立绘">
        <div className="harem-palace-view__audience-portrait-frame">
          <img src={LI_GONGGONG_PORTRAIT_SRC} alt={LI_GONGGONG_NPC_NAME} className="harem-palace-view__audience-portrait" />
        </div>
      </div>
    );
    const actions = dialogueActive ? null : (
      <aside className="harem-palace-view__audience-actions" aria-label="养心殿总管互动操作">
        <span className="harem-palace-view__audience-action-note">
          {`本旬可互动 ${remainingInteractionCount}/${PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN}`}
        </span>
        <button type="button" onClick={handleRequestEmperor}>
          求见皇帝（耗次）
        </button>
        <button type="button" className={activePicker === 'gift' ? 'is-active' : ''} onClick={() => setActivePicker('gift')}>
          送礼（耗次）
        </button>
        <button type="button" onClick={handleBribe} disabled={state.silver < BRIBE_COST}>
          打点银两（{BRIBE_COST}两，耗次）
        </button>
        <button type="button" onClick={handleTalk}>
          闲聊（耗次）
        </button>
        <button type="button" onClick={closeLiGonggong}>
          返回
        </button>
      </aside>
    );
    const picker =
      activePicker === 'gift' ? (
        <section className="harem-palace-view__audience-picker harem-palace-view__audience-picker--gift" role="dialog" aria-label="李公公送礼弹窗">
          <header>
            <strong>赠予李公公</strong>
            <span>{`当前银两：${state.silver}`}</span>
            <button type="button" onClick={() => setActivePicker(null)}>
              收起
            </button>
          </header>
          <div className="harem-palace-view__audience-picker-list">
            {giftableInventory.length > 0 ? (
              giftableInventory.map((item) => (
                <button key={item.itemId} type="button" aria-label={`赠予李公公 ${item.name}`} onClick={() => handleGift(item.itemId)}>
                  <strong>{`${item.name} ×${item.quantity}`}</strong>
                  <span>{item.description}</span>
                </button>
              ))
            ) : (
              <p>背包里暂时没有合适的礼物。</p>
            )}
          </div>
        </section>
      ) : undefined;
    const dialogue =
      dialogueMode != null ? (
        <GlobalDialogueStage
          sceneLabel="李公公 养心殿对话场景"
          portraitLabel="李公公常驻立绘"
          ariaLabel="李公公 养心殿对话"
          className="global-dialogue-stage--consort global-dialogue-stage--with-side-panel"
          dialogueClassName="palace-dialogue-box--consort-audience"
          suppressPortrait
          characterIdentity="太监总管"
          characterName={LI_GONGGONG_NPC_NAME}
          content={dialogueMode === 'entry' ? entryText : feedbackText}
          onNextAction={handleDialogueNext}
          numericFeedbackBucket={dialogueMode === 'feedback' ? 'map-event' : undefined}
          splitQuotedDialogue={false}
        />
      ) : undefined;

    return (
      <AudienceInteractionShell
        ariaLabel="太监总管 李公公 日常对话"
        heading={`养心殿 · ${LI_GONGGONG_NPC_NAME}`}
        metaRows={metaRows}
        portrait={portrait}
        actions={actions}
        picker={picker}
        dialogue={dialogue}
      />
    );
  }

  return (
    <MapSubsceneView
      locationId="养心殿"
      ariaLabel="养心殿行动"
      npcStageLabel="养心殿在场人物"
      npcs={subsceneNpcEntries}
      actions={[]}
      onLeave={enterMapMain}
    />
  );
}
