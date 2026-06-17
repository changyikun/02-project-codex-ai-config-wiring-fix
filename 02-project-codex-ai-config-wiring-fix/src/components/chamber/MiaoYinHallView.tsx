import { useEffect, useMemo, useState } from 'react';
import {
  buildMusicScoreRewardBundle,
  buildRandomMusicScoreItem,
  isMusicScoreItem,
} from '../../game/data/inventoryPresets';
import {
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
} from '../../game/data/concubineRoster';
import {
  requestMiaoYinLocalDialogue,
  type MiaoYinDialogueActor,
} from '../../game/lib/miaoyinDialogueRuntime';
import { buildLocationActionNarrative } from '../../game/lib/actionNarrativeRuntime';
import { clampToRange, createDialogueId, trimDialogueHistory } from '../../game/lib/dialogueSceneUtils';
import { traceDialogue } from '../../game/lib/dialogueTrace';
import { requestMiaoYinAmbientLocal } from '../../game/lib/miaoyinAmbientRuntime';
import {
  CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN,
  buildConsortPublicEncounterSendOffNarrativeEntry,
  type ConsortSendOffNarrative,
} from '../../game/lib/consortVisitRuntime';
import {
  resolveMusicScoreMastery,
  resolveMusicScorePractice,
  resolveMusicScoreQualityLabel,
} from '../../game/lib/musicScoreRuntime';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import {
  getPalaceBanquetEventTime,
  isPalaceBanquetRegistrationOpen,
  resolvePalaceBanquetSeasonKeyForTime,
  resolvePalaceBanquetYearForTime,
} from '../../game/lib/palaceBanquetSchedule';
import { requestRelationshipJudgementLocal } from '../../game/lib/relationshipJudgeRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type {
  ConcubineProfile,
  ConsortDialogueOption,
  ConsortDialogueTurn,
  InventoryItem,
} from '../../game/types';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { AutoCutoutPortrait } from '../visual/AutoCutoutPortrait';
import { LocationActionResultStage } from './LocationActionResultStage';
import { useLocationActionFlow, type TimedLocationActionOutcome } from './useLocationActionFlow';

interface MiaoYinHallViewProps {
  concubines: ConcubineProfile[];
}

interface HistoryEntry {
  speaker: string;
  text: string;
}

type EncounterKind = 'first-meet' | 'unlock' | 'gift-event' | 'emperor' | 'consort' | 'regular';

interface MiaoYinSceneActor extends MiaoYinDialogueActor {
  portraitSrc?: string;
}

const LIANQIAO_PORTRAIT_SRC = '/assets/characters/women/yueshi.png';
const EMPEROR_PORTRAIT_SRC = '/assets/characters/men/rongan.png';

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 27), 0);
const toXunIndex = (year: number, month: number, xun: number): number => year * 36 + (month - 1) * 3 + xun;

const buildLianQiaoActor = (favor: number, affection: number): MiaoYinSceneActor => ({
  id: 'lianqiao',
  name: '连翘',
  identity: '妙音堂伶人',
  residence: '妙音堂',
  personality: '最懂收音与留白，语气轻柔却不浮，善听人心里的停顿，也极在意谁是真懂曲、谁只是看热闹。',
  summary: '妙音堂中的伶人，擅长行腔、定板与看人情绪。她对曲意与人心都极敏感，愿亲近谁，往往不会说得太明。',
  currentGoodwill: favor,
  currentAffection: affection,
  actorKind: 'lianqiao',
});

const buildEmperorActor = (): MiaoYinSceneActor => ({
  id: 'rongan',
  name: '容安',
  identity: '皇帝',
  residence: '养心殿',
  personality: '帝王心术极深，喜怒不轻露，即便起了兴趣，先显出来的也总是试探与裁量。',
  summary: '当今皇帝。看人先看分寸，再看胆量，最后才轮到情意本身。',
  currentGoodwill: 0,
  currentAffection: 0,
  actorKind: 'emperor',
});

const buildConsortActor = (consort: ConcubineProfile): MiaoYinSceneActor => ({
  id: consort.id,
  name: consort.name,
  identity: getConcubineDisplayRankText(consort),
  residence: consort.residence,
  personality: consort.personality,
  summary: consort.summary,
  currentGoodwill: consort.stats.relationToPlayer,
  currentAffection: consort.stats.affection,
  actorKind: 'consort',
  portraitSrc: getConcubinePortraitPath(consort.portraitId),
});

export function MiaoYinHallView({ concubines }: MiaoYinHallViewProps) {
  const {
    state,
    hiddenStats,
    time,
    inventory,
    musicHallProgress,
    palaceBanquetProgress,
    patchMusicHallProgress,
    patchPalaceBanquetProgress,
    applyStoryEffects,
    applyConsortRelationshipJudgement,
    grantInventoryItem,
    markNumericFeedbackEvent,
    npcActivity,
    resolveNpcActivityEntry,
  } = useGameFlowStore();
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [activeActor, setActiveActor] = useState<MiaoYinSceneActor | null>(null);
  const [dialogueTurn, setDialogueTurn] = useState<ConsortDialogueTurn | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sceneHint, setSceneHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [systemMessage, setSystemMessage] = useState('丝竹与板眼一层层压下去，妙音堂里最热闹的，反而常是没说出口的心思。');
  const [activeEncounterLabel, setActiveEncounterLabel] = useState('妙音堂偶遇');
  const [activeEncounterKind, setActiveEncounterKind] = useState<EncounterKind>('regular');
  const [pendingLianQiaoUnlock, setPendingLianQiaoUnlock] = useState(false);
  const [pendingUnlockReward, setPendingUnlockReward] = useState<InventoryItem[]>([]);
  const [showSignUpPicker, setShowSignUpPicker] = useState(false);
  const [showPracticePicker, setShowPracticePicker] = useState(false);
  const [actionResultText, setActionResultText] = useState('');
  const [pendingTimedActionOutcome, setPendingTimedActionOutcome] = useState<TimedLocationActionOutcome | null>(null);
  const [pendingEncounterSendOff, setPendingEncounterSendOff] = useState<ConsortSendOffNarrative | null>(null);

  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const saveId = useMemo(() => `local:${state.routeId}:${encodeURIComponent(state.name)}`, [state.name, state.routeId]);
  const dialogueOptions = dialogueTurn?.options ?? [];
  const isLianQiaoMet = Boolean(state.flags.isLianQiaoMet || musicHallProgress.lianQiaoMet);
  const scheduledConsortActivity = useMemo(() => {
    const scheduledEntries = getNpcActivitiesAtLocation(npcActivity, '妙音堂');
    const entry = scheduledEntries.find((candidate) => concubines.some((consort) => consort.id === candidate.actorConsortId));
    const consort = entry ? concubines.find((candidate) => candidate.id === entry.actorConsortId) : undefined;
    return entry && consort ? { entry, consort } : null;
  }, [concubines, npcActivity]);
  const currentSeed = `${state.routeId}:${time.year}-${time.month}-${time.xun}:${time.slotIndex}`;
  const currentXunIndex = toXunIndex(time.year, time.month, time.xun);
  const banquetYear = resolvePalaceBanquetYearForTime(time);
  const banquetEventTime = getPalaceBanquetEventTime(banquetYear);
  const palaceBanquetSeasonKey = resolvePalaceBanquetSeasonKeyForTime(time);
  const canSignUp = isPalaceBanquetRegistrationOpen(time);
  const submittedScore =
    palaceBanquetProgress.submittedScore?.seasonKey === palaceBanquetSeasonKey ? palaceBanquetProgress.submittedScore : undefined;
  const ownedMusicScores = useMemo(
    () => inventory.filter((item) => isMusicScoreItem(item) && item.quantity > 0),
    [inventory],
  );
  const ownedMusicScoreMastery = useMemo(
    () =>
      ownedMusicScores.map((item) => ({
        item,
        mastery: resolveMusicScoreMastery(item, musicHallProgress),
      })),
    [musicHallProgress, ownedMusicScores],
  );
  const submittedScoreMastery = submittedScore
    ? musicHallProgress.musicScoreMastery?.[submittedScore.itemId]
    : undefined;

  const buildPayload = (
    actor: MiaoYinSceneActor,
    topic: 'visit' | 'follow-up',
    actionId: string,
    actionLabel: string,
    overrides?: {
      actionResult?: string;
      selectedOptionId?: string;
      selectedOptionLabel?: string;
      historyOverride?: HistoryEntry[];
    },
  ) => {
    const activeHistory = trimDialogueHistory(overrides?.historyOverride ?? history);

    return {
      saveId,
      sessionId: `session:miaoyin:${actor.id}:${state.routeId}:${encodeURIComponent(state.name)}`,
      requestId: createDialogueId(`request-miaoyin-${actor.id}`),
      sceneId: `miaoyin:${actor.id}`,
      routeId: state.routeId,
      playerName: state.name,
      playerRank: playerRankLabel,
      playerResidence: state.residenceName,
      playerOpeningTendency: state.openingTendency,
      canPunish: false,
      topic,
      actionId,
      actionLabel,
      actionResult: overrides?.actionResult,
      selectedOptionId: overrides?.selectedOptionId,
      selectedOptionLabel: overrides?.selectedOptionLabel,
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
        id: actor.id,
        name: actor.name,
        rank: actor.identity,
        residence: actor.residence,
        stateLabel: '寻常',
        personality: actor.personality,
        summary: actor.summary,
        currentGoodwill: actor.currentGoodwill,
        currentAffection: actor.currentAffection,
        emperorFavor: actor.actorKind === 'emperor' ? state.favor : 0,
        stress: 0,
        allies: [] as string[],
        rivals: [] as string[],
      },
      timeContext: time,
    } as const;
  };

  const runNarrativeTurn = async (
    actor: MiaoYinSceneActor,
    topic: 'visit' | 'follow-up',
    actionId: string,
    actionLabel: string,
    overrides?: {
      actionResult?: string;
      selectedOptionId?: string;
      selectedOptionLabel?: string;
      historyOverride?: HistoryEntry[];
    },
  ) => {
    const payload = buildPayload(actor, topic, actionId, actionLabel, overrides);
    const nextTurn = await requestMiaoYinLocalDialogue(payload, actor);
    const speakerLabel = `${nextTurn.speakerIdentity} · ${nextTurn.speakerName}`;
    traceDialogue({
      npcId: actor.id,
      sceneId: payload.sceneId,
      sessionId: payload.sessionId,
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

    setDialogueTurn(nextTurn);
    setSceneHint(nextTurn.sceneHint ?? '');
    setHistory((currentHistory) =>
      trimDialogueHistory([...(overrides?.historyOverride ?? currentHistory), { speaker: speakerLabel, text: nextTurn.text }]),
    );
  };

  const finalizeLianQiaoUnlockIfNeeded = () => {
    if (!pendingLianQiaoUnlock) {
      return;
    }

    const rewardBundle = pendingUnlockReward.length > 0 ? pendingUnlockReward : buildMusicScoreRewardBundle(`${currentSeed}:default-reward`, 1);
    for (const item of rewardBundle) {
      grantInventoryItem(item);
    }

    applyStoryEffects({ flags: { isLianQiaoMet: true, 'bondNpcUnlocked:lianqiao': true } });
    patchMusicHallProgress({ lianQiaoMet: true });
    setPendingLianQiaoUnlock(false);
    setPendingUnlockReward([]);
    setSystemMessage(`你已在妙音堂正式结识连翘。她替你留下了${rewardBundle.length}张曲谱。`);
  };

  const beginEncounter = async (
    actor: MiaoYinSceneActor,
    actionId: string,
    actionLabel: string,
    actionResult: string,
    encounterKind: EncounterKind,
  ) => {
    setBusy(true);
    setActiveActor(actor);
    setDialogueTurn(null);
    setHistory([]);
    setSceneHint('');
    setActiveEncounterLabel(actionLabel);
    setActiveEncounterKind(encounterKind);
    setPendingEncounterSendOff(null);

    try {
      await runNarrativeTurn(actor, 'visit', actionId, actionLabel, {
        actionResult,
        historyOverride: [],
      });
    } finally {
      setBusy(false);
    }
  };

  const showActionResult = (text: string, outcome: TimedLocationActionOutcome) => {
    setSystemMessage(text);
    setActionResultText(text);
    setPendingTimedActionOutcome(outcome.shouldSleep ? outcome : null);
  };

  const holdTimedActionOutcome = (outcome: TimedLocationActionOutcome) => {
    setActionResultText('');
    setPendingTimedActionOutcome(outcome.shouldSleep ? outcome : null);
  };

  const closeActionResult = () => {
    const outcome = pendingTimedActionOutcome;
    setActionResultText('');
    setPendingTimedActionOutcome(null);
    finishTimedLocationAction(outcome);
  };

  const closeEncounter = () => {
    const outcome = pendingTimedActionOutcome;
    finalizeLianQiaoUnlockIfNeeded();
    setActiveActor(null);
    setDialogueTurn(null);
    setHistory([]);
    setSceneHint('');
    setActiveEncounterKind('regular');
    setBusy(false);
    setPendingTimedActionOutcome(null);
    setPendingEncounterSendOff(null);
    finishTimedLocationAction(outcome);
  };

  useEffect(() => {
    if (activeActor || busy || showSignUpPicker || showPracticePicker || !isLianQiaoMet || musicHallProgress.lianQiaoAffection <= 60) {
      return;
    }

    const lastGiftXunIndex = musicHallProgress.lastGiftXunIndex ?? -999999;
    if (currentXunIndex - lastGiftXunIndex < 3) {
      return;
    }

    const giftItem = buildRandomMusicScoreItem(`${currentSeed}:lianqiao-gift:${currentXunIndex}`);
    patchMusicHallProgress({ lastGiftXunIndex: currentXunIndex });
    grantInventoryItem(giftItem);
    setSystemMessage(`连翘托人送来了一张${giftItem.color ?? giftItem.rarity}色曲谱《${giftItem.name}》。`);
    void beginEncounter(
      buildLianQiaoActor(musicHallProgress.lianQiaoFavor, musicHallProgress.lianQiaoAffection),
      'gift-event',
      '连翘赠礼',
      `连翘隔了三旬又托人送来一张${giftItem.name}。`,
      'gift-event',
    );
  }, [
    activeActor,
    busy,
    currentSeed,
    currentXunIndex,
    grantInventoryItem,
    isLianQiaoMet,
    musicHallProgress.lianQiaoAffection,
    musicHallProgress.lianQiaoFavor,
    musicHallProgress.lastGiftXunIndex,
    patchMusicHallProgress,
    showPracticePicker,
    showSignUpPicker,
  ]);

  const handleListen = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    const nextCount = musicHallProgress.listenCount + 1;
    const stressRelief = (hashSeed(`${currentSeed}:listen-stress:${nextCount}`) % 2) + 1;
    const actionOutcome = beginTimedLocationAction();
    patchMusicHallProgress({ listenCount: nextCount });
    applyStoryEffects({ stress: -stressRelief });

    try {
      const ambient = await requestMiaoYinAmbientLocal({
        routeId: state.routeId,
        playerName: state.name,
        playerRank: playerRankLabel,
        location: '妙音堂',
        action: 'listen',
        stateHint: `累计听曲${nextCount}次`,
        timeContext: time,
      });
      const resultText = buildLocationActionNarrative({
          locationId: 'miaoyin-hall',
          actionId: 'listen',
          actionLabel: '听曲',
          resultText: `${ambient} 压力-${stressRelief}。`,
      });

      if (!musicHallProgress.lianQiaoFirstMet && nextCount >= 3) {
        patchMusicHallProgress({ lianQiaoFirstMet: true, lastEncounterNpcId: 'lianqiao' });
        setSystemMessage(resultText);
        holdTimedActionOutcome(actionOutcome);
        await beginEncounter(
          buildLianQiaoActor(musicHallProgress.lianQiaoFavor, musicHallProgress.lianQiaoAffection),
          'first-meet',
          '连翘初见',
          '你在妙音堂听曲至第三回时，第一次与连翘正面撞见。',
          'first-meet',
        );
        return;
      }

      if (!isLianQiaoMet && nextCount >= 6) {
        patchMusicHallProgress({ lastEncounterNpcId: 'lianqiao' });
        setPendingLianQiaoUnlock(true);
        setSystemMessage(resultText);
        holdTimedActionOutcome(actionOutcome);
        await beginEncounter(
          buildLianQiaoActor(musicHallProgress.lianQiaoFavor, musicHallProgress.lianQiaoAffection),
          'meet-lianqiao',
          '连翘结识',
          '你在妙音堂听曲到第六回后，连翘终于主动将话递给了你。',
          'unlock',
        );
        return;
      }

      const emperorRoll = hashSeed(`${currentSeed}:emperor-listen:${nextCount}`) % 100 < 20;
      if (state.favor > 40 && emperorRoll) {
        setSystemMessage(resultText);
        holdTimedActionOutcome(actionOutcome);
        await beginEncounter(
          buildEmperorActor(),
          'emperor-invite',
          '皇帝邀约',
          '你在妙音堂听曲时，被皇帝容安留意到了。',
          'emperor',
        );
        return;
      }

      showActionResult(resultText, actionOutcome);
    } finally {
      setBusy(false);
    }
  };

  const handleStroll = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    const actionOutcome = beginTimedLocationAction();
    const nextCount = musicHallProgress.strollCount + 1;
    patchMusicHallProgress({ strollCount: nextCount });

    try {
      {
        const ambient = await requestMiaoYinAmbientLocal({
          routeId: state.routeId,
          playerName: state.name,
          playerRank: playerRankLabel,
          location: '妙音堂',
          action: 'stroll-idle',
          stateHint: `闲逛第${nextCount}次`,
          timeContext: time,
        });
        patchMusicHallProgress({ lastAmbientText: ambient });
        showActionResult(
          buildLocationActionNarrative({
            locationId: 'miaoyin-hall',
            actionId: 'stroll',
            actionLabel: '闲逛',
            resultText: ambient,
          }),
          actionOutcome,
        );
        return;
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenLianQiao = async () => {
    if (busy) {
      return;
    }

    patchMusicHallProgress({ lastEncounterNpcId: 'lianqiao' });
    await beginEncounter(
      buildLianQiaoActor(musicHallProgress.lianQiaoFavor, musicHallProgress.lianQiaoAffection),
      'chat-lianqiao',
      '与连翘说话',
      '你拨开半幅珠帘，主动朝连翘走了过去。',
      'regular',
    );
  };

  const handleOpenPractice = () => {
    if (busy) {
      return;
    }

    if (!isLianQiaoMet) {
      setSystemMessage('你还没有正式结识连翘，暂时无人能替你细拆谱中关窍。');
      return;
    }

    if (ownedMusicScores.length === 0) {
      setSystemMessage('你手里还没有可学的曲谱。');
      return;
    }

    setShowPracticePicker(true);
  };

  const handlePracticeMusicScore = (itemId: string) => {
    if (busy) {
      return;
    }

    const selectedItem = ownedMusicScores.find((item) => item.itemId === itemId);
    if (!selectedItem) {
      setSystemMessage('这张曲谱已经不在手里了。');
      setShowPracticePicker(false);
      return;
    }

    const actionOutcome = beginTimedLocationAction();
    const resolution = resolveMusicScorePractice({
      item: selectedItem,
      state,
      musicHallProgress,
      time,
      seed: `${currentSeed}:practice`,
    });
    applyStoryEffects({ stats: { talent: 2 } });
    patchMusicHallProgress({
      lastPracticedMusicScoreId: itemId,
      musicScoreMastery: {
        ...(musicHallProgress.musicScoreMastery ?? {}),
        [itemId]: resolution.next,
      },
    });
    setShowPracticePicker(false);
    showActionResult(
      buildLocationActionNarrative({
        locationId: 'miaoyin-hall',
        actionId: 'practice',
        actionLabel: '学谱',
        resultText: `《${selectedItem.name}》完成度由${resolution.previous.masteryPercent}%升至${resolution.next.masteryPercent}%，难度${resolution.next.difficulty}，表现上限${resolution.next.performanceCap ?? 0}。`,
      }),
      actionOutcome,
    );
    markNumericFeedbackEvent('chamber-action');
  };

  const handleOpenSignUp = () => {
    if (busy) {
      return;
    }

    if (!canSignUp) {
      setSystemMessage(
        `宫宴报名册尚未开启。本届宫宴定于${banquetEventTime.month}月第${banquetEventTime.xun}旬${banquetEventTime.slot}，妙音堂会在宫宴前一个月收谱。`,
      );
      return;
    }

    if (submittedScore) {
      setSystemMessage(`你本届宫宴已经递交《${submittedScore.name}》，掌册宫人说名录暂不重复改写。`);
      return;
    }

    if (ownedMusicScores.length === 0) {
      setSystemMessage('你手里还没有可用的曲谱，先去攒下几张，再来妙音堂报名。');
      return;
    }

    setShowSignUpPicker(true);
  };

  const handleSubmitMusicScore = async (itemId: string) => {
    if (busy) {
      return;
    }

    const selectedItem = ownedMusicScores.find((item) => item.itemId === itemId);
    if (!selectedItem) {
      setSystemMessage('这张曲谱已经不在手里了。');
      setShowSignUpPicker(false);
      return;
    }

    setShowSignUpPicker(false);
    const mastery = resolveMusicScoreMastery(selectedItem, musicHallProgress);

    setBusy(true);
    patchMusicHallProgress({
      signUpCount: musicHallProgress.signUpCount + 1,
      lastSubmittedMusicScoreId: itemId,
    });
    patchPalaceBanquetProgress({
      currentSeasonKey: palaceBanquetSeasonKey,
      submissionCount: palaceBanquetProgress.submissionCount + 1,
      submittedScore: {
        itemId,
        name: selectedItem.name,
        color: selectedItem.color,
        rarity: selectedItem.rarity,
        difficulty: mastery.difficulty,
        submittedAt: time,
        seasonKey: palaceBanquetSeasonKey,
      },
    });

    try {
      const ambient = await requestMiaoYinAmbientLocal({
        routeId: state.routeId,
        playerName: state.name,
        playerRank: playerRankLabel,
        location: '妙音堂',
        action: 'sign-up',
        stateHint: `提交曲谱${selectedItem.name}`,
        timeContext: time,
      });
      setSystemMessage(
        buildLocationActionNarrative({
          locationId: 'miaoyin-hall',
          actionId: 'sign-up',
          actionLabel: '报名',
          resultText: `${ambient} 你本回登记的曲谱是${selectedItem.name}，当前完成度${mastery.masteryPercent}%。曲谱仍留在手中，后续还可继续向连翘学谱。`,
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleOptionSelect = async (optionId: string) => {
    if (busy || !dialogueTurn || !activeActor) {
      return;
    }

    const option = dialogueOptions.find((item) => item.id === optionId);
    if (!option) {
      return;
    }

    const nextHistory = trimDialogueHistory([
      ...history,
      {
        speaker: `${playerRankLabel} · ${state.name}`,
        text: option.label,
      },
    ]);

    setBusy(true);

    try {
      const judgement = await requestRelationshipJudgementLocal(
        {
          routeId: state.routeId,
          npcId: activeActor.id,
          sceneType: `妙音堂·${activeEncounterLabel}`,
          optionText: option.label,
          npcProfile: `${activeActor.identity} ${activeActor.name}。${activeActor.summary}。性格：${activeActor.personality}`,
          currentFavor: activeActor.currentGoodwill,
          currentAffection: activeActor.currentAffection,
          recentContext: nextHistory.map((entry) => `${entry.speaker}：${entry.text}`),
        },
        option.localToneTag,
      );

      if (activeActor.actorKind === 'consort') {
        const summary = applyConsortRelationshipJudgement(activeActor.id, 'greet', judgement);
        const nextActor = {
          ...activeActor,
          currentGoodwill: clampToRange(activeActor.currentGoodwill + summary.appliedFavorDelta, -100, 100),
          currentAffection: clampToRange(activeActor.currentAffection + summary.appliedAffectionDelta, 0, 100),
        };
        setActiveActor(nextActor);
        if (summary.actionCountThisXun >= CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN) {
          setPendingEncounterSendOff(
            buildConsortPublicEncounterSendOffNarrativeEntry(`${nextActor.identity} ${nextActor.name}`, '妙音堂'),
          );
        }

        const settlementNotice = summary.actionLimitHit
          ? '本旬与她的互动回合已用尽，关系不再变化。'
          : '本地关系结算已落地。';

        await runNarrativeTurn(nextActor, 'follow-up', 'miaoyin-follow-up', activeEncounterLabel, {
          actionResult: `${judgement.reason} ${settlementNotice}`,
          selectedOptionId: option.id,
          selectedOptionLabel: option.label,
          historyOverride: nextHistory,
        });
        return;
      }

      if (activeActor.actorKind === 'lianqiao') {
      const nextFavor = clampToRange(musicHallProgress.lianQiaoFavor + judgement.favorDelta, -100, 100);
      const nextAffection = clampToRange(musicHallProgress.lianQiaoAffection + judgement.affectionDelta, 0, 100);
        patchMusicHallProgress({
          lianQiaoFavor: nextFavor,
          lianQiaoAffection: nextAffection,
          lastToneTag: judgement.toneTag,
          lastEncounterNpcId: activeActor.id,
        });
        if (activeEncounterKind === 'unlock') {
          const rewardCount = judgement.toneTag === 'friendly' || judgement.toneTag === 'flirt' ? 3 : 1;
          setPendingUnlockReward(buildMusicScoreRewardBundle(`${currentSeed}:lianqiao-unlock:${option.id}`, rewardCount));
        }

        const nextActor = {
          ...activeActor,
          currentGoodwill: nextFavor,
          currentAffection: nextAffection,
        };
        setActiveActor(nextActor);

        await runNarrativeTurn(
          nextActor,
          'follow-up',
          activeEncounterKind === 'gift-event' ? 'gift-follow-up' : 'lianqiao-follow-up',
          activeEncounterLabel,
          {
            actionResult:
              activeEncounterKind === 'unlock'
                ? `${judgement.reason} 连翘已经记住了你这一轮的回应。`
                : `${judgement.reason} 连翘把你的态度收进了这一折余音里。`,
            selectedOptionId: option.id,
            selectedOptionLabel: option.label,
            historyOverride: nextHistory,
          },
        );
        return;
      }

      const emperorFavorDelta = clampToRange(judgement.favorDelta + judgement.affectionDelta, -1, 1);
      applyStoryEffects({ favor: emperorFavorDelta });
      await runNarrativeTurn(activeActor, 'follow-up', 'emperor-follow-up', activeEncounterLabel, {
        actionResult: `${judgement.reason} 这一句已落进圣意里。`,
        selectedOptionId: option.id,
        selectedOptionLabel: option.label,
        historyOverride: nextHistory,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleNextAction = async () => {
    if (busy || !dialogueTurn || !activeActor || dialogueOptions.length > 0) {
      return;
    }

    if (dialogueTurn.phase !== 'continue' || dialogueTurn.mode !== 'line') {
      if (pendingEncounterSendOff) {
        setDialogueTurn({
          ...dialogueTurn,
          mode: 'line',
          phase: 'finish',
          speakerIdentity: pendingEncounterSendOff.speakerIdentity || '场景旁白',
          speakerName: pendingEncounterSendOff.speakerName || pendingEncounterSendOff.narrationName || '妙音堂偶遇',
          text: pendingEncounterSendOff.text,
          options: [],
          sceneHint: pendingEncounterSendOff.sceneHint || '偶遇已经收束，不宜在外景强留。',
        });
        setSceneHint(pendingEncounterSendOff.sceneHint || '偶遇已经收束，不宜在外景强留。');
        setPendingEncounterSendOff(null);
        return;
      }
      closeEncounter();
      return;
    }

    setBusy(true);

    try {
      await runNarrativeTurn(activeActor, 'follow-up', 'keep-talking', activeEncounterLabel, {
        actionResult: '你没有急着表态，只把这句话轻轻接住，等对方继续往下说。',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="miaoyin-view" aria-label="妙音堂场景">
      {!activeActor ? (
        <header className="miaoyin-view__header">
          <div className="miaoyin-view__heading">
            <span>妙音堂 · 丝竹留声</span>
            <p>这里最擅长收住人的心绪。曲终之后，真正留下来的，往往不是最后一个音，而是谁在余韵里回头看了你一眼。</p>
          </div>
        </header>
      ) : null}

      {!activeActor ? (
        <section className="miaoyin-view__menu" aria-label="妙音堂主界面">
          <div className="miaoyin-view__menu-buttons">
            <button type="button" onClick={handleOpenSignUp} disabled={busy}>
              报名
            </button>
            <button type="button" onClick={() => void handleListen()} disabled={busy}>
              听曲
            </button>
            {isLianQiaoMet ? (
              <button type="button" onClick={handleOpenPractice} disabled={busy}>
                学谱
              </button>
            ) : null}
            <button type="button" onClick={() => void handleStroll()} disabled={busy}>
              闲逛
            </button>
            {isLianQiaoMet ? (
              <button type="button" onClick={() => void handleOpenLianQiao()} disabled={busy}>
                连翘
              </button>
            ) : null}
          </div>

          <div className="miaoyin-view__note">
            <strong>{`累计听曲：${musicHallProgress.listenCount} 次｜已报名：${musicHallProgress.signUpCount} 次`}</strong>
            <p>
              {submittedScore
                ? `本届宫宴已登记：《${submittedScore.name}》，当前完成度${submittedScoreMastery?.masteryPercent ?? 0}%，表现上限${
                    submittedScoreMastery?.performanceCap ?? 0
                  }。`
                : `本届宫宴：${banquetEventTime.month}月第${banquetEventTime.xun}旬${banquetEventTime.slot}，${
                    canSignUp ? '报名册已开。' : '报名册未开。'
                  }`}
            </p>
            <p>{systemMessage}</p>
          </div>
        </section>
      ) : (
        <section className="miaoyin-view__encounter" aria-label={`${activeActor.name} 妙音堂对话`}>
          <aside className="miaoyin-view__actions" aria-label="妙音堂对话操作">
            <button type="button" onClick={closeEncounter} disabled={busy}>
              返回妙音堂
            </button>
            <p>{sceneHint || '丝竹声一起，很多话看似轻，其实都被人记得极深。'}</p>
          </aside>

          <GlobalDialogueStage
            sceneLabel={`${activeActor.name} 妙音堂对话场景`}
            portraitLabel={`${activeActor.name} 立绘`}
            portrait={
              activeActor.actorKind === 'lianqiao' ? (
                <AutoCutoutPortrait
                  src={LIANQIAO_PORTRAIT_SRC}
                  alt={activeActor.name}
                  threshold={22}
                  sampleInset={18}
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--miaoyin global-dialogue-stage__portrait-media--lianqiao"
                />
              ) : activeActor.actorKind === 'emperor' ? (
                <AutoCutoutPortrait
                  src={EMPEROR_PORTRAIT_SRC}
                  alt={activeActor.name}
                  threshold={22}
                  sampleInset={18}
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--miaoyin global-dialogue-stage__portrait-media--emperor"
                />
              ) : (
                <img
                  src={activeActor.portraitSrc ?? ''}
                  alt={activeActor.name}
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--miaoyin"
                />
              )
            }
            ariaLabel="妙音堂对话框"
            className={`global-dialogue-stage--miaoyin global-dialogue-stage--with-side-panel ${
              activeActor.actorKind === 'emperor' ? 'global-dialogue-stage--emperor' : ''
            }`}
            dialogueClassName={`palace-dialogue-box--miaoyin-encounter ${
              activeActor.actorKind === 'emperor' ? 'palace-dialogue-box--emperor-encounter' : ''
            }`}
            characterIdentity={dialogueTurn?.speakerIdentity ?? activeActor.identity}
            characterName={dialogueTurn?.speakerName ?? activeActor.name}
            content={dialogueTurn?.text ?? '帘影与余音都还没散，对方像是在等你先把这一句落下来。'}
            options={dialogueOptions as ConsortDialogueOption[]}
            onSelectOption={(optionId) => {
              void handleOptionSelect(optionId);
            }}
            onNextAction={
              dialogueOptions.length === 0
                ? () => {
                    void handleNextAction();
                  }
                : undefined
            }
            busy={busy}
          />
        </section>
      )}

      {!activeActor && actionResultText ? (
        <LocationActionResultStage
          locationName="妙音堂"
          className="global-dialogue-stage--miaoyin"
          dialogueClassName="palace-dialogue-box--miaoyin-encounter"
          content={actionResultText}
          onNextAction={closeActionResult}
          busy={busy}
        />
      ) : null}

      {showSignUpPicker ? (
        <div className="miaoyin-view__picker-backdrop" role="dialog" aria-label="妙音堂曲谱报名">
          <div className="miaoyin-view__picker">
            <h3>登记曲谱报名</h3>
            <p>{`本届宫宴定于${banquetEventTime.month}月第${banquetEventTime.xun}旬${banquetEventTime.slot}。请选择一张曲谱登记，登记后本届不再重复改写，曲谱不会从手中消失。`}</p>
            <div className="miaoyin-view__picker-list">
              {ownedMusicScoreMastery.map(({ item, mastery }) => (
                <button key={item.itemId} type="button" onClick={() => void handleSubmitMusicScore(item.itemId)} disabled={busy}>
                  {`${item.name}｜${resolveMusicScoreQualityLabel(item.color, item.rarity)}｜完成度 ${mastery.masteryPercent}%｜表现上限 ${
                    mastery.performanceCap ?? 0
                  }`}
                </button>
              ))}
            </div>
            <button type="button" className="miaoyin-view__picker-cancel" onClick={() => setShowSignUpPicker(false)} disabled={busy}>
              暂不提交
            </button>
          </div>
        </div>
      ) : null}

      {showPracticePicker ? (
        <div className="miaoyin-view__picker-backdrop" role="dialog" aria-label="连翘学谱">
          <div className="miaoyin-view__picker">
            <h3>向连翘学谱</h3>
            <p>选择一张手中曲谱。学习进度受你的乐理、曲谱难度，以及连翘对你的关系影响。</p>
            <div className="miaoyin-view__picker-list">
              {ownedMusicScoreMastery.map(({ item, mastery }) => (
                <button key={item.itemId} type="button" onClick={() => handlePracticeMusicScore(item.itemId)} disabled={busy}>
                  {`${item.name}｜难度 ${mastery.difficulty}｜完成度 ${mastery.masteryPercent}%｜已学 ${mastery.practiceCount} 次`}
                </button>
              ))}
            </div>
            <button type="button" className="miaoyin-view__picker-cancel" onClick={() => setShowPracticePicker(false)} disabled={busy}>
              暂不学谱
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
