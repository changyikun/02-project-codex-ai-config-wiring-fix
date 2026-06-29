import { useEffect, useMemo, useState } from 'react';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { AudienceInteractionShell, type AudienceExitResult, type AudienceMetaRow } from './AudienceInteractionShell';
import {
  getConcubineConditionLabel,
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
  getConcubineRankWeightByLabel,
} from '../../game/data/concubineRoster';
import { clampToRange, createDialogueId, trimDialogueHistory } from '../../game/lib/dialogueSceneUtils';
import { requestConsortLocalDialogue } from '../../game/lib/consortDialogueRuntime';
import { traceDialogue } from '../../game/lib/dialogueTrace';
import {
  isEarringReturnForConsort,
  resolveEarringGiftRelationDelta,
} from '../../game/lib/earringReturnRuntime';
import {
  CONSORT_AUDIENCE_FIXED_ACTIONS,
  CONSORT_AUDIENCE_FOLLOW_UP_LIMIT_PER_TOPIC,
  CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN,
  CONSORT_INTERACTION_LIMIT_TEXT,
  buildConsortAudienceSendOffNarrativeEntry,
  buildConsortPublicEncounterSendOffNarrativeEntry,
  type ConsortSendOffNarrative,
  isConsortGiftItem,
} from '../../game/lib/consortVisitRuntime';
import {
  applyYingluoyetingStoryChoice,
  resolveYingluoyetingMapEvent,
} from '../../game/lib/yingluoyetingStoryRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type {
  ConcubineProfile,
  ConsortDialogueTurn,
  ConsortPalaceActionId,
  InventoryItem,
  RouteId,
} from '../../game/types';

interface ConsortAudiencePanelProps {
  consort: ConcubineProfile;
  palaceLabel: string;
  hallLabel: string;
  concubines: ConcubineProfile[];
  onBack: (result?: AudienceExitResult) => void;
  backLabel?: string;
  initialActionResult?: string;
  initialActionLabel?: string;
  encounterPlace?: 'palace' | 'public';
}

interface HistoryEntry {
  speaker: string;
  text: string;
}

interface NarrativeTurnOverrides {
  actionResult?: string;
  selectedOptionId?: string;
  selectedOptionLabel?: string;
  giftItemName?: string;
  smearTargetName?: string;
  historyOverride?: HistoryEntry[];
  forceFinish?: boolean;
  forcedText?: string;
}

const appendUnique = (items: string[], value: string): string[] => (items.includes(value) ? items : [...items, value]);
const removeValue = (items: string[], value: string): string[] => items.filter((item) => item !== value);
const isChenWanningConsort = (consort: ConcubineProfile): boolean =>
  consort.name === '陈婉宁' || consort.portraitId === '陈婉宁';

const buildPlayerRankProxy = (consort: ConcubineProfile, playerName: string, playerRankLabel: string, playerPrestige: number): ConcubineProfile => ({
  ...consort,
  id: 'player-rank-proxy',
  portraitId: consort.portraitId,
  name: playerName,
  rankLabel: playerRankLabel,
  residence: consort.residence,
  stateLabel: '寻常',
  familyBackground: consort.familyBackground,
  personality: consort.personality,
  summary: consort.summary,
  stats: {
    ...consort.stats,
    prestige: playerPrestige,
    relationToPlayer: 0,
    affection: 0,
  },
  allies: [],
  rivals: [],
});

const buildRelationLabel = (consort: ConcubineProfile): string => {
  if (consort.allies.includes('玩家')) {
    return '已交好';
  }
  if (consort.rivals.includes('玩家')) {
    return '交恶';
  }
  if (consort.stats.relationToPlayer >= 60) {
    return '关系亲近';
  }
  if (consort.stats.relationToPlayer >= 10) {
    return '关系平稳';
  }
  if (consort.stats.relationToPlayer > -20) {
    return '关系紧绷';
  }
  return '明显防备';
};

export function ConsortAudiencePanel({
  consort,
  palaceLabel,
  hallLabel,
  concubines,
  onBack,
  backLabel = '返回殿位',
  initialActionResult,
  initialActionLabel = '入殿相见',
  encounterPlace = 'palace',
}: ConsortAudiencePanelProps) {
  const {
    state,
    routeId,
    concubineRouteId,
    hiddenStats,
    time,
    inventory,
    consortInteractionMap,
    consumeInventoryItem,
    recordConsortInteractionAction,
    patchState,
    patchConcubineById,
  } = useGameFlowStore();
  const [dialogueTurn, setDialogueTurn] = useState<ConsortDialogueTurn | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState<ConsortPalaceActionId>('visit');
  const [actionLabel, setActionLabel] = useState('入殿相见');
  const [sceneHint, setSceneHint] = useState('');
  const [pickerMode, setPickerMode] = useState<'gift' | null>(null);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [closeAfterDialogue, setCloseAfterDialogue] = useState(false);
  const [sendOffAfterDialogue, setSendOffAfterDialogue] = useState<ConsortSendOffNarrative | null>(null);
  const [hasConsumedInteractionThisSession, setHasConsumedInteractionThisSession] = useState(false);
  const [chenFirstMeetResultText, setChenFirstMeetResultText] = useState('');
  const [chenFirstMeetFinished, setChenFirstMeetFinished] = useState(false);
  const saveId = useMemo(() => `local:${state.routeId}:${encodeURIComponent(state.name)}`, [state.name, state.routeId]);
  const sessionId = useMemo(() => createDialogueId(`session-${consort.id}`), [consort.id]);

  const displayRank = useMemo(() => getConcubineDisplayRankText(consort), [consort]);
  const portraitSrc = useMemo(() => getConcubinePortraitPath(consort.portraitId), [consort.portraitId]);

  const playerRankLabel = useMemo(() => {
    const initialRank = hiddenStats.initialRank;
    if (initialRank && getConcubineRankWeightByLabel(initialRank) > 0) {
      return initialRank;
    }

    const proxy = buildPlayerRankProxy(
      consort,
      state.name,
      initialRank === '和亲入宫' ? '妃' : initialRank ?? '官女子',
      state.prestige,
    );
    return getConcubineDisplayRankText(proxy);
  }, [consort, hiddenStats.initialRank, state.name, state.prestige]);

  const canPunish = useMemo(
    () => getConcubineRankWeightByLabel(playerRankLabel) > getConcubineRankWeightByLabel(displayRank),
    [displayRank, playerRankLabel],
  );

  const giftItems = useMemo(() => inventory.filter(isConsortGiftItem), [inventory]);
  const currentXunKey = `${time.year}-${time.month}-${time.xun}`;
  const interactionProgress =
    consortInteractionMap[consort.id]?.xunKey === currentXunKey ? consortInteractionMap[consort.id] : undefined;
  const interactionCountThisXun = Number(interactionProgress?.actionCountThisXun ?? 0);
  const remainingInteractionCount = Math.max(0, CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN - interactionCountThisXun);
  const interactionLimitReached = remainingInteractionCount <= 0;
  const dialogueActive = Boolean(dialogueTurn) || busy;
  const currentStateLabel = getConcubineConditionLabel(consort);
  const relationLabel = buildRelationLabel(consort);
  const isChenWanningAudience = isChenWanningConsort(consort);
  const consortTitle = `${displayRank} ${consort.name}`;
  const buildSendOffEntry = () =>
    encounterPlace === 'public'
      ? buildConsortPublicEncounterSendOffNarrativeEntry(consortTitle, palaceLabel)
      : buildConsortAudienceSendOffNarrativeEntry(consortTitle);
  const exitAudience = () => {
    onBack({ shouldAdvanceTime: hasConsumedInteractionThisSession });
  };
  const persistentConsortPortrait = (
    <div className="harem-palace-view__audience-portrait-stage" aria-label={`${consort.name}常驻立绘`}>
      <div className="harem-palace-view__audience-portrait-frame">
        <img src={portraitSrc} alt={consort.name} className="harem-palace-view__audience-portrait" />
      </div>
    </div>
  );
  const storyRouteId: RouteId =
    state.routeId === 'yingluoyeting' || routeId === 'yingluoyeting' || concubineRouteId === 'yingluoyeting'
      ? 'yingluoyeting'
      : state.routeId;
  const yingluoyetingStoryState = useMemo(
    () => (storyRouteId === state.routeId ? state : { ...state, routeId: storyRouteId }),
    [state, storyRouteId],
  );
  const chenFirstMeetEvent = useMemo(
    () =>
      !chenFirstMeetFinished && isChenWanningAudience
        ? resolveYingluoyetingMapEvent({
            state: yingluoyetingStoryState,
            time,
            locationId: '后宫',
            inventory,
          })
        : undefined,
    [chenFirstMeetFinished, isChenWanningAudience, inventory, yingluoyetingStoryState, time],
  );
  const chenFirstMeetActive = Boolean(chenFirstMeetEvent || chenFirstMeetResultText);

  const buildPayload = (
    activeConsort: ConcubineProfile,
    topic: 'visit' | 'action' | 'follow-up',
    nextActionId: string,
    actionLabelText: string,
    overrides?: NarrativeTurnOverrides,
  ) => {
    const activeHistory = trimDialogueHistory(overrides?.historyOverride ?? history);

    return {
      saveId,
      sessionId,
      requestId: createDialogueId('request'),
      sceneId: `consort-audience:${activeConsort.id}`,
      routeId: state.routeId,
      playerName: state.name,
      playerRank: playerRankLabel,
      playerResidence: state.residenceName,
      playerOpeningTendency: state.openingTendency,
      canPunish,
      topic,
      actionId: nextActionId,
      actionLabel: actionLabelText,
      actionResult: overrides?.actionResult,
      selectedOptionId: overrides?.selectedOptionId,
      selectedOptionLabel: overrides?.selectedOptionLabel,
      giftItemName: overrides?.giftItemName,
      smearTargetName: overrides?.smearTargetName,
      history: activeHistory,
      recentContext: activeHistory.map((entry) => `${entry.speaker}：${entry.text}`),
      playerContext: {
        favor: state.favor,
        stress: state.stress,
        prestige: state.prestige,
        trueHeart: state.trueHeart,
        silver: state.silver,
        stamina: state.stamina,
        stats: state.stats,
      },
      consortContext: {
        id: activeConsort.id,
        name: activeConsort.name,
        rank: getConcubineDisplayRankText(activeConsort),
        residence: activeConsort.residence,
        stateLabel: getConcubineConditionLabel(activeConsort),
        personality: activeConsort.personality,
        summary: activeConsort.summary,
        currentGoodwill: activeConsort.stats.relationToPlayer,
        currentAffection: activeConsort.stats.affection,
        emperorFavor: activeConsort.stats.favor,
        stress: activeConsort.stats.stress,
        allies: activeConsort.allies,
        rivals: activeConsort.rivals,
      },
      timeContext: time,
    } as const;
  };

  const runNarrativeTurn = async (
    activeConsort: ConcubineProfile,
    topic: 'visit' | 'action' | 'follow-up',
    nextActionId: ConsortPalaceActionId,
    actionLabelText: string,
    overrides?: NarrativeTurnOverrides,
  ) => {
    const payload = buildPayload(activeConsort, topic, nextActionId, actionLabelText, overrides);
    const nextTurn = await requestConsortLocalDialogue(payload, activeConsort);

    const displayedTurn: ConsortDialogueTurn = overrides?.forceFinish
      ? {
          ...nextTurn,
          mode: 'line',
          phase: 'finish',
          text: overrides.forcedText ?? nextTurn.text,
          options: [],
        }
      : nextTurn;
    const speakerLabel = `${nextTurn.speakerIdentity} · ${nextTurn.speakerName}`;
    traceDialogue({
      npcId: activeConsort.id,
      sceneId: payload.sceneId,
      sessionId,
      turnsRead: nextTurn.sessionMemory?.readTurnCount ?? 0,
      candidatesRead: nextTurn.sessionMemory?.readMemoryCandidateCount ?? 0,
      candidatesWritten: nextTurn.sessionMemory?.writtenMemoryCandidateCount ?? nextTurn.memoryCandidates?.length ?? 0,
      relationCandidatesRead: nextTurn.sessionMemory?.readRelationCandidateCount ?? 0,
      relationCandidatesWritten:
        nextTurn.sessionMemory?.writtenRelationCandidateCount ?? nextTurn.relationCandidates?.length ?? 0,
      relationPromotedCount: nextTurn.relationMemory?.promotedCount ?? 0,
      relationRejectedCount: nextTurn.relationMemory?.rejectedCount ?? 0,
      relationEntryCount: nextTurn.relationMemory?.totalEntryCount ?? 0,
      source: 'local',
    });
    setDialogueTurn(displayedTurn);
    setSceneHint(displayedTurn.sceneHint ?? '');
    setHistory((currentHistory) =>
      trimDialogueHistory([...(overrides?.historyOverride ?? currentHistory), { speaker: speakerLabel, text: displayedTurn.text }]),
    );
  };

  useEffect(() => {
    let disposed = false;

    const bootVisit = async () => {
      if (chenFirstMeetActive) {
        return;
      }

      setBusy(true);
      setActionId('visit');
      setActionLabel(initialActionLabel);
      setPickerMode(null);
      setFollowUpCount(0);
      setCloseAfterDialogue(false);
      setSendOffAfterDialogue(null);
      setHistory([]);
      setHasConsumedInteractionThisSession(false);
      try {
        await runNarrativeTurn(consort, 'visit', 'visit', initialActionLabel, {
          actionResult: initialActionResult ?? `你已步入${palaceLabel}${hallLabel}，与${displayRank} ${consort.name}正面相见。`,
          historyOverride: [],
        });
      } finally {
        if (!disposed) {
          setBusy(false);
        }
      }
    };

    void bootVisit();

    return () => {
      disposed = true;
    };
  }, [chenFirstMeetActive, consort.id, displayRank, hallLabel, initialActionLabel, initialActionResult, palaceLabel]);

  const handleChenFirstMeetChoice = (choiceId: string) => {
    if (!chenFirstMeetEvent) {
      return;
    }

    const result = applyYingluoyetingStoryChoice({
      eventId: chenFirstMeetEvent.eventId,
      choiceId,
      state: yingluoyetingStoryState,
    });
    patchState(result.statePatch);
    result.concubineRelationDeltas?.forEach((delta) => {
      const targetConsort = concubines.find((item) => item.name === delta.consortName);
      if (!targetConsort) {
        return;
      }
      patchConcubineById(targetConsort.id, (currentConsort) => ({
        ...currentConsort,
        stats: {
          ...currentConsort.stats,
          relationToPlayer: clampToRange(
            currentConsort.stats.relationToPlayer + delta.relationToPlayerDelta,
            -100,
            100,
          ),
        },
      }));
    });
    setChenFirstMeetResultText(result.resultText);
  };

  if (chenFirstMeetActive) {
    return (
      <section className="harem-palace-view__audience" aria-label="陈婉宁初见剧情">
        {persistentConsortPortrait}
        <GlobalDialogueStage
          sceneLabel="陈婉宁初见"
          portraitLabel="旁白无立绘"
          ariaLabel="陈婉宁初见剧情"
          className="global-dialogue-stage--consort"
          dialogueClassName="palace-dialogue-box--consort-audience"
          suppressPortrait
          characterIdentity={chenFirstMeetResultText ? '场景旁白' : (chenFirstMeetEvent?.speakerIdentity ?? '陈婉宁')}
          characterName={chenFirstMeetResultText ? '陈婉宁初见' : (chenFirstMeetEvent?.speakerName ?? '陈婉宁')}
          content={chenFirstMeetResultText || chenFirstMeetEvent?.text || ''}
          options={chenFirstMeetResultText ? [] : chenFirstMeetEvent?.options}
          onSelectOption={handleChenFirstMeetChoice}
          onNextAction={
            chenFirstMeetResultText
              ? () => {
                  setChenFirstMeetFinished(true);
                  setChenFirstMeetResultText('');
                }
              : undefined
          }
          busy={false}
        />
      </section>
    );
  }

  const applyGift = async (item: InventoryItem) => {
    if (busy) {
      return;
    }
    if (interactionLimitReached) {
      setSceneHint(CONSORT_INTERACTION_LIMIT_TEXT);
      setPickerMode(null);
      return;
    }
    if (!inventory.some((currentItem) => currentItem.itemId === item.itemId && currentItem.quantity > 0)) {
      setSceneHint(`${item.name}已不在当前背包中。`);
      setPickerMode(null);
      return;
    }
    const actionRecord = recordConsortInteractionAction(consort.id, 'gift');
    if (!actionRecord.success) {
      setSceneHint(CONSORT_INTERACTION_LIMIT_TEXT);
      setPickerMode(null);
      return;
    }
    setHasConsumedInteractionThisSession(true);
    const consumed = consumeInventoryItem(item.itemId);
    if (!consumed) {
      setSceneHint(`${item.name}已不在当前背包中。`);
      setPickerMode(null);
      return;
    }

    const isEarringReturn = isEarringReturnForConsort(item, consort.id);
    const relationDelta = resolveEarringGiftRelationDelta(item, consort.id);
    const nextConsort: ConcubineProfile = {
      ...consort,
      stats: {
        ...consort.stats,
        relationToPlayer: clampToRange(consort.stats.relationToPlayer + relationDelta, -100, 100),
        health: clampToRange(consort.stats.health + item.healthDelta, 0, 1000),
        appearance: clampToRange(consort.stats.appearance + item.appearanceDelta, 0, 1000),
        temperament: clampToRange(consort.stats.temperament + item.temperamentDelta, 0, 1000),
      },
    };

    patchConcubineById(consort.id, () => nextConsort);
    const shouldSendOff = actionRecord.actionCountThisXun >= CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN;
    const narrativeActionId: ConsortPalaceActionId = isEarringReturn ? 'return-earring' : 'gift';
    setBusy(true);
    setPickerMode(null);
    setActionId(narrativeActionId);
    setActionLabel('送礼');
    setFollowUpCount(0);
    setCloseAfterDialogue(shouldSendOff);
    setSendOffAfterDialogue(shouldSendOff ? buildSendOffEntry() : null);

    try {
      await runNarrativeTurn(nextConsort, 'action', narrativeActionId, '送礼', {
        actionResult: isEarringReturn
          ? ''
          : `${item.name}已送出。系统按礼物规则结算：对玩家好感 ${item.favorDelta >= 0 ? '+' : ''}${item.favorDelta}。`,
        giftItemName: item.name,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFixedAction = async (nextActionId: ConsortPalaceActionId, actionLabelText: string) => {
    if (busy) {
      return;
    }

    if (interactionLimitReached) {
      setPickerMode(null);
      setSceneHint(CONSORT_INTERACTION_LIMIT_TEXT);
      return;
    }

    if (nextActionId === 'gift') {
      setPickerMode('gift');
      setSceneHint(giftItems.length > 0 ? '从你当前持有的礼物中挑一件送出。' : '当前没有可送出的礼物。');
      return;
    }

    const actionRecord = recordConsortInteractionAction(consort.id, nextActionId);
    if (!actionRecord.success) {
      setPickerMode(null);
      setSceneHint(CONSORT_INTERACTION_LIMIT_TEXT);
      return;
    }
    setHasConsumedInteractionThisSession(true);

    const shouldSendOff = actionRecord.actionCountThisXun >= CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN;
    setBusy(true);
    setPickerMode(null);
    setActionId(nextActionId);
    setActionLabel(actionLabelText);
    setFollowUpCount(0);
    setCloseAfterDialogue(shouldSendOff);
    setSendOffAfterDialogue(shouldSendOff ? buildSendOffEntry() : null);

    let actionResult = '';
    let snapshot = consort;

    if (nextActionId === 'win-over') {
      if (consort.stats.relationToPlayer >= 60) {
        snapshot = {
          ...consort,
          allies: appendUnique(removeValue(consort.allies, '玩家'), '玩家'),
          rivals: removeValue(consort.rivals, '玩家'),
        };
        patchConcubineById(consort.id, () => snapshot);
        actionResult = '她当前对你好感已达 60 以上，系统判定她愿与您交好。';
      } else if (consort.stats.relationToPlayer < 10) {
        actionResult = '她当前对你好感低于 10，不会答应与你交好。';
      } else {
        actionResult = '她并未立刻应下，只把态度暂时压在观望之间。';
      }
    } else if (nextActionId === 'greet') {
      actionResult = '你借日常寒暄试探她的态度，局面仍留有缓和余地。';
    } else {
      actionResult = `你已选择${actionLabelText}。`;
    }

    try {
      await runNarrativeTurn(snapshot, 'action', nextActionId, actionLabelText, {
        actionResult,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAudienceDialogueNextAction = async () => {
    if (busy || !dialogueTurn) {
      return;
    }

    if (closeAfterDialogue) {
      if (sendOffAfterDialogue) {
        setDialogueTurn({
          ...dialogueTurn,
          mode: 'line',
          phase: 'finish',
          options: [],
          text: sendOffAfterDialogue.text,
          sceneHint: sendOffAfterDialogue.sceneHint || '这一轮会面已经收束，宫人正在送客。',
          speakerIdentity: sendOffAfterDialogue.speakerIdentity || '场景旁白',
          speakerName: sendOffAfterDialogue.speakerName || sendOffAfterDialogue.narrationName || '送客',
        });
        setSceneHint(sendOffAfterDialogue.sceneHint || '这一轮会面已经收束，宫人正在送客。');
        setSendOffAfterDialogue(null);
        return;
      }
      setDialogueTurn(null);
      setSceneHint('');
      setCloseAfterDialogue(false);
      exitAudience();
      return;
    }

    if (dialogueTurn.phase === 'continue' && dialogueTurn.mode === 'line') {
      if (followUpCount >= CONSORT_AUDIENCE_FOLLOW_UP_LIMIT_PER_TOPIC) {
        setDialogueTurn({
          ...dialogueTurn,
          mode: 'line',
          phase: 'finish',
          options: [],
          text: '话到此处，对方略一颔首，示意今日不再多留。',
        });
        setSceneHint('本轮话题已经收束。');
        return;
      }

      setBusy(true);
      setFollowUpCount((current) => current + 1);
      try {
        await runNarrativeTurn(consort, 'follow-up', actionId, actionLabel, {
          actionResult: '你暂且没有改换话题，只顺着这一句等对方继续说下去。',
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    setDialogueTurn(null);
    setSceneHint('');
  };

  const metaRows: AudienceMetaRow[] = [
    { label: '当前状态', value: currentStateLabel },
    { label: '对你态度', value: consort.stats.relationToPlayer },
    { label: '倾情', value: consort.stats.affection },
    { label: '关系', value: relationLabel },
  ];
  const actions = (
      <aside className="harem-palace-view__audience-actions" aria-label="宫内互动操作">
        <span className="harem-palace-view__audience-action-note">
          {`本旬可互动 ${remainingInteractionCount}/${CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN}`}
        </span>
        {CONSORT_AUDIENCE_FIXED_ACTIONS.map((action) => (
          <button
            key={action.actionId}
            type="button"
            onClick={() => void handleFixedAction(action.actionId, action.label)}
            disabled={dialogueActive || interactionLimitReached}
          >
            {action.label}
          </button>
        ))}
        <button type="button" onClick={exitAudience} disabled={busy}>
          返回
        </button>
      </aside>
  );
  const picker =
    pickerMode === 'gift' ? (
        <section className="harem-palace-view__audience-picker harem-palace-view__audience-picker--gift" aria-label="送礼选物">
          <header>
            <strong>可赠礼物</strong>
            <button type="button" onClick={() => setPickerMode(null)}>
              收起
            </button>
          </header>
          <div className="harem-palace-view__audience-picker-list">
            {giftItems.length > 0 ? (
              giftItems.map((item) => (
                <button key={item.itemId} type="button" onClick={() => void applyGift(item)}>
                  <strong>{`${item.name} ×${item.quantity}`}</strong>
                  <span>{item.description}</span>
                </button>
              ))
            ) : (
              <p>当前背包里没有可送出的礼物。</p>
            )}
          </div>
        </section>
      ) : undefined;
  const dialogue =
    dialogueTurn || busy ? (
        <GlobalDialogueStage
          sceneLabel={`${displayRank} ${consort.name} 宫内对话场景`}
          portraitLabel="旁白无立绘"
          ariaLabel="妃嫔宫内对话框"
          className="global-dialogue-stage--consort global-dialogue-stage--with-side-panel"
          dialogueClassName="palace-dialogue-box--consort-audience"
          suppressPortrait
          characterIdentity={dialogueTurn?.speakerIdentity ?? displayRank}
          characterName={dialogueTurn?.speakerName ?? consort.name}
          content={dialogueTurn?.text ?? '宫人正低声通传，对方还未开口。'}
          onNextAction={dialogueTurn ? () => void handleAudienceDialogueNextAction() : undefined}
          options={[]}
          busy={busy}
        />
      ) : undefined;

  return (
    <AudienceInteractionShell
      ariaLabel={`${displayRank} ${consort.name} 日常对话`}
      heading={`${palaceLabel} · ${hallLabel}`}
      onBack={exitAudience}
      backLabel={backLabel}
      metaRows={metaRows}
      portrait={persistentConsortPortrait}
      actions={actions}
      picker={picker}
      dialogue={dialogue}
    />
  );
}
