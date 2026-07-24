import { useMemo, useRef, useState } from 'react';
import {
  buildRandomDanceScoreItem,
  buildRandomMusicScoreItem,
  isDanceScoreItem,
  isMusicScoreItem,
} from '../../game/data/inventoryPresets';
import {
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
  getConcubineRankWeightByLabel,
} from '../../game/data/concubineRoster';
import { getRouteProfileById } from '../../game/data/routeProfiles';
import { buildLocationActionNarrative } from '../../game/lib/actionNarrativeRuntime';
import { isConsortGiftItem } from '../../game/lib/consortVisitRuntime';
import {
  resolveMusicScoreMastery,
  resolveMusicScorePractice,
  resolvePracticeScoreQualityLabel,
} from '../../game/lib/musicScoreRuntime';
import { getNumericRuleValue } from '../../game/numerics/numericCatalog';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import {
  MIAOYIN_DANCER_NPC_ID,
  MIAOYIN_DANCER_NPC_NAME,
  MIAOYIN_MUSICIAN_NPC_ID,
  MIAOYIN_MUSICIAN_NPC_NAME,
  PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN,
  createPermanentNpcRelationship,
} from '../../game/lib/permanentNpcRuntime';
import { getBondUnlockFlagForNpc, requireNonConsortNpcProfile } from '../../game/npcs/npcCatalog';
import {
  getPalaceBanquetEventTime,
  isPalaceBanquetRegistrationOpen,
  resolvePalaceBanquetSeasonKeyForTime,
  resolvePalaceBanquetYearForTime,
} from '../../game/lib/palaceBanquetSchedule';
import { getPalaceBanquetEligibleScores } from '../../game/lib/palaceBanquetRuntime';
import { renderNarrativeEntry } from '../../game/narrative/narrativeCatalog';
import { narrativeEntryToDialogueFields } from '../../game/narrative/narrativeDialogueAdapter';
import {
  advanceRandomEventLine,
  beginRandomEventSession,
  createSeededRandomEventRandom,
  getRandomEventCurrentLine,
  getRandomEventCurrentOptions,
  pickRandomEventFromPoolsBySeed,
  selectRandomEventOption,
  type RandomEventSession,
} from '../../game/random-events/randomEventRuntime';
import {
  pickLostItemNameMarkBySeed,
  pickLostItemOwnerBySeed,
} from '../../game/lib/lostItemReturnRuntime';
import { randomEventCatalog, type RandomEventLine } from '../../game/random-events/randomEventCatalog';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { ConcubineProfile, InventoryItem, PermanentNpcRelationshipState } from '../../game/types';
import { ConsortAudiencePanel } from '../consorts/ConsortAudiencePanel';
import { AudienceInteractionShell, type AudienceMetaRow } from '../consorts/AudienceInteractionShell';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { LocationActionResultStage } from './LocationActionResultStage';
import { MapSubsceneView, type SubsceneActionEntry, type SubsceneNpcEntry } from './MapSubsceneView';
import { useBlockingNarrativeLock } from './useBlockingNarrativeLock';
import { useLocationActionFlow, type TimedLocationActionOutcome } from './useLocationActionFlow';

interface MiaoYinHallViewProps {
  concubines: ConcubineProfile[];
}

type MiaoYinNpcId = typeof MIAOYIN_MUSICIAN_NPC_ID | typeof MIAOYIN_DANCER_NPC_ID;
type MiaoYinGiftMode = 'gift';

interface MiaoYinNpcProfile {
  id: MiaoYinNpcId;
  name: string;
  identity: string;
  portrait: string;
  firstMeetNarrativeId: string;
  idleNarrativeId: string;
  talkNarrativeId: string;
  giftNarrativeId: string;
  guidanceNarrativeId: string;
}

const MIAOYIN_COMMON_POOL_ID = 'location.miaoyin.common';
const MIAOYIN_MUSIC_POOL_ID = 'location.miaoyin.music';
const MIAOYIN_DANCE_POOL_ID = 'location.miaoyin.dance';
const MIAOYIN_STROLL_POOLS = [MIAOYIN_COMMON_POOL_ID, MIAOYIN_MUSIC_POOL_ID, MIAOYIN_DANCE_POOL_ID] as const;
const MIAOYIN_MUSICIAN_PIPA_TALK_POOL_ID = 'npc.miaoyin-musician.pipa-pick';
const MIAOYIN_NPC_UNLOCK_EVENT_COUNT = 2;
const MIAOYIN_NPC_HIGH_AFFINITY_THRESHOLD = 30;
const MIAOYIN_GUIDANCE_AFFINITY_GAIN = 2;
const MIAOYIN_TALK_AFFINITY_GAIN = 1;
const MIAOYIN_SCORE_REWARD_AFFINITY_STEP = getNumericRuleValue('miaoyin_score_reward_affinity_step');
const MIAOYIN_LAN_HANDKERCHIEF_TEMPLATE_ITEM_ID = 'miaoyin-lan-handkerchief';
const miaoyinMusicianCatalogProfile = requireNonConsortNpcProfile(MIAOYIN_MUSICIAN_NPC_ID);
const miaoyinDancerCatalogProfile = requireNonConsortNpcProfile(MIAOYIN_DANCER_NPC_ID);
export const MIAOYIN_DANCER_PORTRAIT_SRC = miaoyinDancerCatalogProfile.portraitSrc ?? '';
export const MIAOYIN_MUSICIAN_PORTRAIT_SRC = miaoyinMusicianCatalogProfile.portraitSrc ?? '';

const MIAOYIN_NPC_PROFILES: Record<MiaoYinNpcId, MiaoYinNpcProfile> = {
  [MIAOYIN_MUSICIAN_NPC_ID]: {
    id: MIAOYIN_MUSICIAN_NPC_ID,
    name: MIAOYIN_MUSICIAN_NPC_NAME,
    identity: miaoyinMusicianCatalogProfile.identityLabel,
    portrait: MIAOYIN_MUSICIAN_PORTRAIT_SRC,
    firstMeetNarrativeId: 'miaoyin.musician.first-meet',
    idleNarrativeId: 'miaoyin.musician.idle',
    talkNarrativeId: 'miaoyin.musician.talk',
    giftNarrativeId: 'miaoyin.musician.gift',
    guidanceNarrativeId: 'miaoyin.musician.guidance',
  },
  [MIAOYIN_DANCER_NPC_ID]: {
    id: MIAOYIN_DANCER_NPC_ID,
    name: MIAOYIN_DANCER_NPC_NAME,
    identity: miaoyinDancerCatalogProfile.identityLabel,
    portrait: MIAOYIN_DANCER_PORTRAIT_SRC,
    firstMeetNarrativeId: 'miaoyin.dancer.first-meet',
    idleNarrativeId: 'miaoyin.dancer.idle',
    talkNarrativeId: 'miaoyin.dancer.talk',
    giftNarrativeId: 'miaoyin.dancer.gift',
    guidanceNarrativeId: 'miaoyin.dancer.guidance',
  },
};

const countTriggeredEventsInPool = (triggerCounts: Record<string, number>, poolId: string): number =>
  (randomEventCatalog.eventsByPool[poolId] ?? []).reduce((sum, eventId) => sum + Number(triggerCounts[eventId] ?? 0), 0);

const buildMiaoyinNpcTalkPoolIds = (npcId: MiaoYinNpcId, affinity: number): string[] => {
  const isHighAffinity = affinity >= MIAOYIN_NPC_HIGH_AFFINITY_THRESHOLD;
  const poolPrefix = `npc.${npcId}`;
  return [
    `${poolPrefix}.common`,
    `${poolPrefix}.${isHighAffinity ? 'high-affinity' : 'low-affinity'}`,
    ...(npcId === MIAOYIN_MUSICIAN_NPC_ID && isHighAffinity ? [MIAOYIN_MUSICIAN_PIPA_TALK_POOL_ID] : []),
  ];
};

const buildRelationLabel = (affinity: number): string => {
  if (affinity >= 60) {
    return '相熟';
  }
  if (affinity >= 30) {
    return '常来';
  }
  if (affinity > 0) {
    return '认得';
  }
  return '初识';
};

const toXunKey = (year: number, month: number, xun: number): string => `${year}-${month}-${xun}`;

export function MiaoYinHallView({ concubines }: MiaoYinHallViewProps) {
  const {
    state,
    hiddenStats,
    time,
    inventory,
    selectedRoute,
    customConsorts,
    musicHallProgress,
    palaceBanquetProgress,
    permanentNpcRelationships,
    randomEventProgress,
    patchMusicHallProgress,
    patchPalaceBanquetProgress,
    applyStoryEffects,
    markNumericFeedbackEvent,
    ensurePermanentNpcRelationship,
    markPermanentNpcMet,
    recordPermanentNpcInteractionAction,
    applyPermanentNpcAffinityDelta,
    applyRandomEventEffectForPermanentNpc,
    applyRandomEventEffectForPlayer,
    queueRandomEventUnlocks,
    completeRandomEventById,
    consumeInventoryItem,
    grantInventoryItem,
    npcActivity,
    resolveNpcActivityEntry,
    enterMapMain,
  } = useGameFlowStore();
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [activeNpcId, setActiveNpcId] = useState<MiaoYinNpcId | null>(null);
  const [activeGiftMode, setActiveGiftMode] = useState<MiaoYinGiftMode | null>(null);
  const [activeRandomSession, setActiveRandomSession] = useState<RandomEventSession | null>(null);
  const [activeRandomLine, setActiveRandomLine] = useState<RandomEventLine | null>(null);
  useBlockingNarrativeLock('miaoyin:random-event', Boolean(activeRandomSession));
  const [activeNpcDialogue, setActiveNpcDialogue] = useState<ReturnType<typeof narrativeEntryToDialogueFields> | null>(null);
  const [activeNpcConsumedInteraction, setActiveNpcConsumedInteraction] = useState(false);
  const [showSignUpPicker, setShowSignUpPicker] = useState(false);
  const [showPracticePicker, setShowPracticePicker] = useState(false);
  const [actionResultText, setActionResultText] = useState('');
  const [pendingTimedActionOutcome, setPendingTimedActionOutcome] = useState<TimedLocationActionOutcome | null>(null);
  const pendingTimedActionOutcomeRef = useRef<TimedLocationActionOutcome | null>(null);
  const [activeConsortAudience, setActiveConsortAudience] = useState<{
    entryId: string;
    consortId: string;
    summary: string;
  } | null>(null);

  const xunKey = toXunKey(time.year, time.month, time.xun);

  const setPendingTimedAction = (outcome: TimedLocationActionOutcome | null) => {
    pendingTimedActionOutcomeRef.current = outcome;
    setPendingTimedActionOutcome(outcome);
  };
  const playerRankLabel =
    hiddenStats.initialRank && getConcubineRankWeightByLabel(hiddenStats.initialRank) > 0 ? hiddenStats.initialRank : '宫妃';
  const playerPortraitSrc = selectedRoute?.portrait ?? getRouteProfileById(state.routeId)?.portrait;
  const allConsorts = useMemo(() => [...concubines, ...customConsorts], [concubines, customConsorts]);
  const activeNpcProfile = activeNpcId ? MIAOYIN_NPC_PROFILES[activeNpcId] : null;
  const activeNpcRelationship = activeNpcProfile
    ? permanentNpcRelationships[activeNpcProfile.id] ??
      createPermanentNpcRelationship(activeNpcProfile.id, activeNpcProfile.name, xunKey)
    : undefined;

  const musicPoolTriggerCount = countTriggeredEventsInPool(randomEventProgress.triggerCounts, MIAOYIN_MUSIC_POOL_ID);
  const dancePoolTriggerCount = countTriggeredEventsInPool(randomEventProgress.triggerCounts, MIAOYIN_DANCE_POOL_ID);
  const isMusicianUnlocked =
    Boolean(state.flags.isMiaoyinMusicianMet || musicHallProgress.musicianMet) ||
    musicPoolTriggerCount >= MIAOYIN_NPC_UNLOCK_EVENT_COUNT;
  const isDancerUnlocked = dancePoolTriggerCount >= MIAOYIN_NPC_UNLOCK_EVENT_COUNT;
  const canSignUp = isPalaceBanquetRegistrationOpen(time);
  const banquetYear = resolvePalaceBanquetYearForTime(time);
  const banquetEventTime = getPalaceBanquetEventTime(banquetYear);
  const palaceBanquetSeasonKey = resolvePalaceBanquetSeasonKeyForTime(time);
  const submittedScore =
    palaceBanquetProgress.submittedScore?.seasonKey === palaceBanquetSeasonKey ? palaceBanquetProgress.submittedScore : undefined;
  const ownedMusicScores = useMemo(
    () => inventory.filter((item) => isMusicScoreItem(item) && item.quantity > 0),
    [inventory],
  );
  const ownedDanceScores = useMemo(
    () => inventory.filter((item) => isDanceScoreItem(item) && item.quantity > 0),
    [inventory],
  );
  const ownedBanquetScores = useMemo(() => getPalaceBanquetEligibleScores(inventory), [inventory]);
  const ownedMusicScoreMastery = useMemo(
    () =>
      ownedMusicScores.map((item) => ({
        item,
        mastery: resolveMusicScoreMastery(item, musicHallProgress),
      })),
    [musicHallProgress, ownedMusicScores],
  );
  const ownedDanceScoreMastery = useMemo(
    () =>
      ownedDanceScores.map((item) => ({
        item,
        mastery: resolveMusicScoreMastery(item, musicHallProgress, musicHallProgress.danceScoreMastery),
      })),
    [musicHallProgress, ownedDanceScores],
  );
  const ownedBanquetScoreMastery = useMemo(
    () =>
      ownedBanquetScores.map((item) => {
        const scoreKind: 'music' | 'dance' = isDanceScoreItem(item) ? 'dance' : 'music';
        return {
          item,
          scoreKind,
          mastery: resolveMusicScoreMastery(
            item,
            musicHallProgress,
            scoreKind === 'dance' ? musicHallProgress.danceScoreMastery : musicHallProgress.musicScoreMastery,
          ),
        };
      }),
    [musicHallProgress, ownedBanquetScores],
  );
  const giftableInventory = useMemo(
    () => inventory.filter((item) => isConsortGiftItem(item) && !item.isQuestItem).sort((left, right) => left.price - right.price),
    [inventory],
  );
  const publicConsortEntries = useMemo(
    () =>
      getNpcActivitiesAtLocation(npcActivity, '妙音堂', { includeResolved: true })
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
  const randomOptions = activeRandomSession ? getRandomEventCurrentOptions(activeRandomSession) : [];
  const isPlayerRandomLine = Boolean(
    activeRandomLine &&
      (activeRandomLine.portraitKey === 'player' ||
        activeRandomLine.speakerName === state.name ||
        activeRandomLine.speakerIdentity === playerRankLabel),
  );

  const renderNpcDialogue = (
    narrativeId: string,
    variables: Record<string, string | number> = {},
  ): ReturnType<typeof narrativeEntryToDialogueFields> =>
    narrativeEntryToDialogueFields(
      renderNarrativeEntry(narrativeId, {
        playerName: state.name,
        playerRank: playerRankLabel,
        playerResidence: state.residenceName,
        targetName: activeNpcProfile?.name ?? '',
        targetRank: activeNpcProfile?.identity ?? '',
        itemName: variables.itemName ?? '',
        progress: variables.progress ?? '',
      }),
    );

  const appendNpcDialogueText = (
    dialogue: ReturnType<typeof narrativeEntryToDialogueFields>,
    extraText: string,
  ): ReturnType<typeof narrativeEntryToDialogueFields> =>
    extraText
      ? {
          ...dialogue,
          text: `${dialogue.text}\n\n${extraText}`,
        }
      : dialogue;

  const renderNpcExtraText = (narrativeId: string, variables: Record<string, string | number>): string =>
    renderNarrativeEntry(narrativeId, variables).text;

  const maybeGrantScoreForAffinity = (npcId: MiaoYinNpcId, nextAffinity: number): string => {
    const step = Math.max(1, MIAOYIN_SCORE_REWARD_AFFINITY_STEP);
    const checkpointKey =
      npcId === MIAOYIN_MUSICIAN_NPC_ID ? 'musicianScoreGiftAffinityCheckpoint' : 'dancerScoreGiftAffinityCheckpoint';
    const previousCheckpoint = Number(musicHallProgress[checkpointKey] ?? 0);
    const nextCheckpoint = Math.floor(Math.max(0, nextAffinity) / step) * step;
    if (nextCheckpoint <= previousCheckpoint) {
      return '';
    }

    const scoreItem =
      npcId === MIAOYIN_MUSICIAN_NPC_ID
        ? buildRandomMusicScoreItem(`${state.routeId}:${npcId}:${nextCheckpoint}:score-reward`)
        : buildRandomDanceScoreItem(`${state.routeId}:${npcId}:${nextCheckpoint}:score-reward`);
    grantInventoryItem(scoreItem);
    patchMusicHallProgress({ [checkpointKey]: nextCheckpoint } as Partial<typeof musicHallProgress>);

    return renderNpcExtraText(
      npcId === MIAOYIN_MUSICIAN_NPC_ID ? 'miaoyin.musician.score.affinity' : 'miaoyin.dancer.score.affinity',
      { scoreName: scoreItem.name },
    );
  };

  const grantFirstMeetScoreItem = (npcId: MiaoYinNpcId): InventoryItem => {
    const scoreItem =
      npcId === MIAOYIN_MUSICIAN_NPC_ID
        ? buildRandomMusicScoreItem(`${state.routeId}:${npcId}:${xunKey}:first-meet-score`)
        : buildRandomDanceScoreItem(`${state.routeId}:${npcId}:${xunKey}:first-meet-score`);
    grantInventoryItem(scoreItem);
    return scoreItem;
  };

  const grantFirstMeetScore = (npcId: MiaoYinNpcId): string => {
    const scoreItem = grantFirstMeetScoreItem(npcId);
    return renderNpcExtraText(
      npcId === MIAOYIN_MUSICIAN_NPC_ID ? 'miaoyin.musician.score.first-meet' : 'miaoyin.dancer.score.first-meet',
      { scoreName: scoreItem.name },
    );
  };

  const buildRandomEventVariables = (targetProfile?: MiaoYinNpcProfile, extra: Record<string, string | number> = {}) => ({
    playerName: state.name,
    playerSurname: state.name.slice(0, 1),
    playerRank: playerRankLabel,
    playerResidence: state.residenceName,
    playerAddress: state.name,
    targetName: targetProfile?.name ?? '',
    targetSurname: targetProfile?.name.slice(0, 1) ?? '',
    targetRank: targetProfile?.identity ?? '',
    targetResidence: '妙音堂',
    targetAddress: targetProfile?.name ?? '',
    locationName: '妙音堂',
    timeLabel: time.slot,
    ...extra,
  });

  const beginNpcRandomEvent = (eventId: string, targetProfile: MiaoYinNpcProfile, extra: Record<string, string | number> = {}) => {
    const session = beginRandomEventSession({
      eventId,
      variables: buildRandomEventVariables(targetProfile, extra),
    });
    setActiveGiftMode(null);
    setShowPracticePicker(false);
    setActiveNpcDialogue(null);
    setActiveRandomSession(session);
    setActiveRandomLine(getRandomEventCurrentLine(session) ?? null);
  };

  const markMusicianKnown = () => {
    applyStoryEffects({
      flags: {
        isMiaoyinMusicianMet: true,
        [getBondUnlockFlagForNpc(MIAOYIN_MUSICIAN_NPC_ID)]: true,
      },
    });
    patchMusicHallProgress({ musicianFirstMet: true, musicianMet: true });
  };

  const openNpc = (npcId: MiaoYinNpcId) => {
    const profile = MIAOYIN_NPC_PROFILES[npcId];
    const wasMet =
      Boolean(permanentNpcRelationships[profile.id]?.met) ||
      (npcId === MIAOYIN_MUSICIAN_NPC_ID && Boolean(state.flags.isMiaoyinMusicianMet || musicHallProgress.musicianMet));
    ensurePermanentNpcRelationship(profile.id, profile.name);
    markPermanentNpcMet(profile.id, profile.name);
    if (npcId === MIAOYIN_MUSICIAN_NPC_ID) {
      markMusicianKnown();
    } else if (npcId === MIAOYIN_DANCER_NPC_ID) {
      applyStoryEffects({ flags: { [getBondUnlockFlagForNpc(MIAOYIN_DANCER_NPC_ID)]: true } });
    }
    setActiveNpcId(npcId);
    setActiveGiftMode(null);
    setActiveNpcConsumedInteraction(false);
    setActiveRandomSession(null);
    setActiveRandomLine(null);
    const firstMeetScoreText = wasMet ? '' : grantFirstMeetScore(npcId);
    setActiveNpcDialogue(
      appendNpcDialogueText(
        narrativeEntryToDialogueFields(
          renderNarrativeEntry(wasMet ? profile.idleNarrativeId : profile.firstMeetNarrativeId, {
            playerName: state.name,
            playerRank: playerRankLabel,
            playerResidence: state.residenceName,
            targetName: profile.name,
            targetRank: profile.identity,
          }),
        ),
        firstMeetScoreText,
      ),
    );
  };

  const closeNpc = () => {
    if (activeNpcConsumedInteraction) {
      finishTimedLocationAction(beginTimedLocationAction());
    }
    setActiveNpcId(null);
    setActiveGiftMode(null);
    setActiveNpcDialogue(null);
    setActiveRandomSession(null);
    setActiveRandomLine(null);
    setActiveNpcConsumedInteraction(false);
    setShowPracticePicker(false);
  };

  const adjustNpcAffinity = (npcId: MiaoYinNpcId, npcName: string, delta: number): string => {
    applyPermanentNpcAffinityDelta(npcId, npcName, delta);
    if (npcId === MIAOYIN_MUSICIAN_NPC_ID) {
      patchMusicHallProgress({
        musicianFavor: Math.max(0, musicHallProgress.musicianFavor + delta),
        musicianAffection: Math.max(0, musicHallProgress.musicianAffection + Math.max(0, Math.floor(delta / 2))),
      });
    }
    const currentAffinity = Number(activeNpcRelationship?.affinity ?? 0);
    return maybeGrantScoreForAffinity(npcId, currentAffinity + delta);
  };

  const runNpcInteraction = (actionId: 'talk' | 'gift' | 'guidance'): boolean => {
    if (!activeNpcProfile) {
      return false;
    }
    const result = recordPermanentNpcInteractionAction(activeNpcProfile.id, activeNpcProfile.name, actionId);
    if (!result.success) {
      setActiveNpcDialogue(renderNpcDialogue('miaoyin.npc.limit'));
      return false;
    }
    setActiveNpcConsumedInteraction(true);
    return true;
  };

  const handleNpcTalk = () => {
    if (!activeNpcProfile || !runNpcInteraction('talk')) {
      return;
    }
    const currentAffinity = Number(activeNpcRelationship?.affinity ?? 0);
    const nextTalkCount = Number(activeNpcRelationship?.actionCountThisXun ?? 0) + 1;
    const pickedEvent = pickRandomEventFromPoolsBySeed({
      poolIds: buildMiaoyinNpcTalkPoolIds(activeNpcProfile.id, currentAffinity),
      progress: randomEventProgress,
      seed: `${state.routeId}:${xunKey}:${time.slotIndex}:${activeNpcProfile.id}:talk:${nextTalkCount}:${currentAffinity}`,
    });
    if (pickedEvent) {
      beginNpcRandomEvent(pickedEvent.eventId, activeNpcProfile);
      return;
    }
    const rewardText = adjustNpcAffinity(activeNpcProfile.id, activeNpcProfile.name, MIAOYIN_TALK_AFFINITY_GAIN);
    setActiveGiftMode(null);
    setActiveNpcDialogue(appendNpcDialogueText(renderNpcDialogue(activeNpcProfile.talkNarrativeId), rewardText));
  };

  const handleOpenGift = () => {
    setActiveGiftMode('gift');
    setActiveNpcDialogue(null);
  };

  const handleGift = (item: InventoryItem) => {
    if (!activeNpcProfile || !runNpcInteraction('gift')) {
      return;
    }
    if (!consumeInventoryItem(item.itemId)) {
      return;
    }
    const rewardText = adjustNpcAffinity(activeNpcProfile.id, activeNpcProfile.name, Math.max(1, item.favorDelta));
    setActiveGiftMode(null);
    setActiveNpcDialogue(appendNpcDialogueText(renderNpcDialogue(activeNpcProfile.giftNarrativeId, { itemName: item.name }), rewardText));
  };

  const handleGuidance = () => {
    if (!activeNpcProfile) {
      return;
    }
    const hasPracticeScore =
      activeNpcProfile.id === MIAOYIN_MUSICIAN_NPC_ID ? ownedMusicScores.length > 0 : ownedDanceScores.length > 0;
    if (!hasPracticeScore) {
      setActiveGiftMode(null);
      setActiveNpcDialogue(
        renderNpcDialogue(activeNpcProfile.id === MIAOYIN_MUSICIAN_NPC_ID ? 'miaoyin.musician.no-score' : 'miaoyin.dancer.no-score'),
      );
      return;
    }
    setActiveGiftMode(null);
    setShowPracticePicker(true);
    setActiveNpcDialogue(null);
  };

  const handlePracticeMusicScore = (itemId: string) => {
    if (!activeNpcProfile) {
      return;
    }
    const isMusicGuidance = activeNpcProfile.id === MIAOYIN_MUSICIAN_NPC_ID;
    const selectedItem = (isMusicGuidance ? ownedMusicScores : ownedDanceScores).find((item) => item.itemId === itemId);
    if (!selectedItem) {
      setShowPracticePicker(false);
      return;
    }
    if (!runNpcInteraction('guidance')) {
      setShowPracticePicker(false);
      return;
    }

    const resolution = resolveMusicScorePractice({
      item: selectedItem,
      state,
      musicHallProgress,
      time,
      seed: `${state.routeId}:${time.year}-${time.month}-${time.xun}:${time.slotIndex}:${activeNpcProfile.id}:guidance`,
      kind: isMusicGuidance ? 'music' : 'dance',
      supportValue: Number(activeNpcRelationship?.affinity ?? 0),
      masteryMap: isMusicGuidance ? musicHallProgress.musicScoreMastery : musicHallProgress.danceScoreMastery,
    });
    applyStoryEffects({ stats: isMusicGuidance ? { talent: 2 } : { temperament: 1 } });
    patchMusicHallProgress(
      isMusicGuidance
        ? {
            lastPracticedMusicScoreId: itemId,
            musicScoreMastery: {
              ...(musicHallProgress.musicScoreMastery ?? {}),
              [itemId]: resolution.next,
            },
          }
        : {
            lastPracticedDanceScoreId: itemId,
            danceScoreMastery: {
              ...(musicHallProgress.danceScoreMastery ?? {}),
              [itemId]: resolution.next,
            },
          },
    );
    const rewardText = adjustNpcAffinity(activeNpcProfile.id, activeNpcProfile.name, MIAOYIN_GUIDANCE_AFFINITY_GAIN);
    markNumericFeedbackEvent('chamber-action');
    setShowPracticePicker(false);
    setActiveNpcDialogue(
      appendNpcDialogueText(renderNpcDialogue(activeNpcProfile.guidanceNarrativeId, { progress: resolution.next.masteryPercent }), rewardText),
    );
  };

  const showActionResult = (text: string, outcome: TimedLocationActionOutcome) => {
    setActionResultText(text);
    setPendingTimedAction(outcome.shouldSleep ? outcome : null);
  };

  const closeActionResult = () => {
    const outcome = pendingTimedActionOutcomeRef.current ?? pendingTimedActionOutcome;
    setActionResultText('');
    setPendingTimedAction(null);
    finishTimedLocationAction(outcome);
  };

  const finishRandomEvent = (eventId: string) => {
    completeRandomEventById(eventId);
    const fallbackOutcome: TimedLocationActionOutcome | null =
      time.slot === '深夜'
        ? {
            previousTime: time,
            shouldSleep: true,
            reason: 'deep-night',
          }
        : null;
    const outcome = pendingTimedActionOutcomeRef.current ?? pendingTimedActionOutcome ?? fallbackOutcome;
    setActiveRandomSession(null);
    setActiveRandomLine(null);
    setPendingTimedAction(null);
    finishTimedLocationAction(outcome);
  };

  const handleRandomDialogueNext = () => {
    if (!activeRandomSession) {
      return;
    }
    if (activeRandomSession.stage !== 'lines') {
      return;
    }
    const advanceResult = advanceRandomEventLine(activeRandomSession);
    if (activeNpcProfile) {
      applyRandomEventEffectForPermanentNpc(activeNpcProfile.id, activeNpcProfile.name, advanceResult.effect);
    } else {
      applyRandomEventEffectForPlayer(advanceResult.effect);
    }
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
    if (activeNpcProfile) {
      applyRandomEventEffectForPermanentNpc(activeNpcProfile.id, activeNpcProfile.name, optionResult.effect);
    } else {
      applyRandomEventEffectForPlayer(optionResult.effect);
    }
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

  const handleStroll = () => {
    const actionOutcome = beginTimedLocationAction();
    const nextCount = musicHallProgress.strollCount + 1;
    patchMusicHallProgress({ strollCount: nextCount });

    const pickedEvent = pickRandomEventFromPoolsBySeed({
      poolIds: MIAOYIN_STROLL_POOLS,
      progress: randomEventProgress,
      seed: `${state.routeId}:${time.year}-${time.month}-${time.xun}:${time.slotIndex}:miaoyin-stroll:${nextCount}`,
    });

    if (!pickedEvent) {
      applyStoryEffects({ stress: -2 });
      markNumericFeedbackEvent('chamber-action');
      showActionResult(
        buildLocationActionNarrative({
          locationId: 'miaoyin-hall',
          actionId: 'stroll',
          actionLabel: '闲逛',
          resultText: '你在妙音堂里走了一圈，听见几处排演声断续传来。压力-2。',
        }),
        actionOutcome,
      );
      return;
    }

    const variableSeed = `${state.routeId}:${time.year}-${time.month}-${time.xun}:${time.slotIndex}:miaoyin-stroll:${nextCount}:${pickedEvent.eventId}`;
    const handkerchiefOwner = pickLostItemOwnerBySeed(allConsorts, `${variableSeed}:handkerchief-owner`);
    const handkerchiefMark = pickLostItemNameMarkBySeed(
      handkerchiefOwner?.name,
      `${variableSeed}:handkerchief-mark`,
      '兰',
    );
    const handkerchiefInstanceSuffix = Math.floor(
      createSeededRandomEventRandom(`${variableSeed}:handkerchief-item`)() * 1_000_000,
    ).toString(36);

    const session = beginRandomEventSession({
      eventId: pickedEvent.eventId,
      variables: {
        ...buildRandomEventVariables(undefined),
        handkerchiefMark,
        handkerchiefOwnerConsortId: handkerchiefOwner?.id ?? '',
        handkerchiefItemId: `${MIAOYIN_LAN_HANDKERCHIEF_TEMPLATE_ITEM_ID}-${nextCount}-${handkerchiefInstanceSuffix}`,
      },
    });
    setPendingTimedAction(actionOutcome.shouldSleep ? actionOutcome : null);
    setActiveRandomSession(session);
    setActiveRandomLine(getRandomEventCurrentLine(session) ?? null);
  };

  const handleOpenSignUp = () => {
    if (!canSignUp) {
      showActionResult(
        `宫宴报名册尚未开启。本届宫宴定于${banquetEventTime.month}月第${banquetEventTime.xun}旬${banquetEventTime.slot}，妙音堂会在宫宴前一个月收谱。`,
        { previousTime: time, shouldSleep: false, reason: 'deep-night' },
      );
      return;
    }
    if (submittedScore) {
      showActionResult(`你本届宫宴已经递交《${submittedScore.name}》，名录暂不重复改写。`, {
        previousTime: time,
        shouldSleep: false,
        reason: 'deep-night',
      });
      return;
    }
    if (ownedBanquetScores.length === 0) {
      showActionResult('你手里还没有可用的曲谱或舞谱。', {
        previousTime: time,
        shouldSleep: false,
        reason: 'deep-night',
      });
      return;
    }
    setShowSignUpPicker(true);
  };

  const handleSubmitMusicScore = (itemId: string) => {
    const selectedItem = ownedBanquetScores.find((item) => item.itemId === itemId);
    if (!selectedItem) {
      setShowSignUpPicker(false);
      return;
    }
    const scoreKind: 'music' | 'dance' = isDanceScoreItem(selectedItem) ? 'dance' : 'music';
    const scoreNoun = scoreKind === 'dance' ? '舞谱' : '曲谱';
    const mastery = resolveMusicScoreMastery(
      selectedItem,
      musicHallProgress,
      scoreKind === 'dance' ? musicHallProgress.danceScoreMastery : musicHallProgress.musicScoreMastery,
    );
    patchMusicHallProgress({
      signUpCount: musicHallProgress.signUpCount + 1,
      lastSubmittedBanquetScoreId: itemId,
      ...(scoreKind === 'music' ? { lastSubmittedMusicScoreId: itemId } : {}),
    });
    patchPalaceBanquetProgress({
      currentSeasonKey: palaceBanquetSeasonKey,
      submissionCount: palaceBanquetProgress.submissionCount + 1,
      submittedScore: {
        itemId,
        name: selectedItem.name,
        scoreKind,
        color: selectedItem.color,
        rarity: selectedItem.rarity,
        difficulty: mastery.difficulty,
        submittedAt: time,
        seasonKey: palaceBanquetSeasonKey,
      },
    });
    setShowSignUpPicker(false);
    showActionResult(
      buildLocationActionNarrative({
        locationId: 'miaoyin-hall',
        actionId: 'sign-up',
        actionLabel: '宴席报名',
        resultText: `你递交《${selectedItem.name}》，当前完成度${mastery.masteryPercent}%。${scoreNoun}仍留在手中。`,
      }),
      { previousTime: time, shouldSleep: false, reason: 'deep-night' },
    );
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

  const subsceneNpcEntries = useMemo<SubsceneNpcEntry[]>(() => {
    const entries: SubsceneNpcEntry[] = [];
    if (isMusicianUnlocked) {
      const profile = MIAOYIN_NPC_PROFILES[MIAOYIN_MUSICIAN_NPC_ID];
      entries.push({
        id: `fixed:${profile.id}`,
        kind: 'fixed',
        name: profile.name,
        identityLabel: profile.identity,
        portraitSrc: profile.portrait,
        onClick: () => openNpc(profile.id),
      });
    }
    if (isDancerUnlocked) {
      const profile = MIAOYIN_NPC_PROFILES[MIAOYIN_DANCER_NPC_ID];
      entries.push({
        id: `fixed:${profile.id}`,
        kind: 'fixed',
        name: profile.name,
        identityLabel: profile.identity,
        portraitSrc: profile.portrait,
        onClick: () => openNpc(profile.id),
      });
    }
    publicConsortEntries.forEach(({ entry, consort }) => {
      entries.push({
        id: `consort:${entry.id}`,
        kind: 'consort',
        name: consort.name,
        identityLabel: getConcubineDisplayRankText(consort),
        ariaLabel: entry.resolved
          ? `${getConcubineDisplayRankText(consort)} ${consort.name}仍在此处`
          : `与${getConcubineDisplayRankText(consort)} ${consort.name}交谈`,
        portraitSrc: getConcubinePortraitPath(consort.portraitId),
        interactableState: entry.resolved ? 'spent' : 'available',
        disabledReason: entry.resolved ? '本旬已交谈过' : undefined,
        onClick: entry.resolved ? undefined : () => handleStartConsortAudience(entry.id),
      });
    });
    return entries;
  }, [isDancerUnlocked, isMusicianUnlocked, publicConsortEntries]);

  const subsceneActions = useMemo<SubsceneActionEntry[]>(
    () => [
      {
        id: 'banquet-sign-up',
        label: '宴席报名',
        onClick: handleOpenSignUp,
      },
      {
        id: 'stroll',
        label: '闲逛',
        onClick: handleStroll,
      },
    ],
    [handleOpenSignUp, handleStroll],
  );

  if (activeConsortAudience && activeAudienceConsort) {
    return (
      <section className="miaoyin-view" aria-label={`${activeAudienceConsort.name} 妙音堂偶遇场景`}>
        <ConsortAudiencePanel
          consort={activeAudienceConsort}
          palaceLabel="妙音堂"
          hallLabel="偶遇"
          concubines={concubines}
          backLabel="返回"
          initialActionLabel="妙音堂偶遇"
          encounterPlace="public"
          initialActionResult={`${activeConsortAudience.summary}你看见${getConcubineDisplayRankText(
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

  if (activeNpcProfile && activeNpcRelationship) {
    const remainingInteractionCount = Math.max(
      0,
      PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN - Number(activeNpcRelationship.actionCountThisXun ?? 0),
    );
    const metaRows: AudienceMetaRow[] = [
      { label: '当前状态', value: activeNpcRelationship.met ? '已见过' : '初见' },
      { label: '对你态度', value: activeNpcRelationship.affinity },
      { label: '关系', value: buildRelationLabel(activeNpcRelationship.affinity) },
    ];
    if (activeNpcProfile.id === MIAOYIN_DANCER_NPC_ID) {
      metaRows.push({ label: '持有舞谱', value: `${ownedDanceScores.length}` });
    }

    const portrait = (
      <div
        className="harem-palace-view__audience-portrait-stage"
        aria-label={isPlayerRandomLine ? `${state.name}立绘` : `${activeNpcProfile.name}常驻立绘`}
      >
        <div className="harem-palace-view__audience-portrait-frame">
          {isPlayerRandomLine ? (
            playerPortraitSrc ? (
              <img
                src={playerPortraitSrc}
                alt={state.name}
                className="harem-palace-view__audience-portrait global-dialogue-stage__portrait-media--player"
              />
            ) : (
              <div className="harem-palace-view__audience-portrait harem-palace-view__audience-portrait--placeholder">
                {state.name}
              </div>
            )
          ) : (
            <img src={activeNpcProfile.portrait} alt={activeNpcProfile.name} className="harem-palace-view__audience-portrait" />
          )}
        </div>
      </div>
    );
    const dialogue = activeNpcDialogue ? (
      <GlobalDialogueStage
        sceneLabel={`${activeNpcProfile.name} 妙音堂对话场景`}
        portraitLabel={`${activeNpcProfile.name}常驻立绘`}
        ariaLabel={`${activeNpcProfile.name} 妙音堂对话`}
        className="global-dialogue-stage--consort global-dialogue-stage--with-side-panel"
        dialogueClassName="palace-dialogue-box--consort-audience"
        suppressPortrait
        characterIdentity={activeNpcDialogue.speakerIdentity}
        characterName={activeNpcDialogue.speakerName}
        content={activeNpcDialogue.text}
        onNextAction={() => setActiveNpcDialogue(null)}
        splitQuotedDialogue={false}
      />
    ) : activeRandomSession && activeRandomLine ? (
      <GlobalDialogueStage
        sceneLabel={`${activeNpcProfile.name} 妙音堂闲聊场景`}
        portraitLabel={isPlayerRandomLine ? `${state.name}立绘` : `${activeNpcProfile.name}常驻立绘`}
        ariaLabel={`${activeNpcProfile.name} 妙音堂闲聊事件`}
        className="global-dialogue-stage--consort global-dialogue-stage--with-side-panel"
        dialogueClassName="palace-dialogue-box--consort-audience"
        suppressPortrait
        characterIdentity={activeRandomLine.speakerIdentity}
        characterName={activeRandomLine.speakerName}
        content={activeRandomLine.text}
        options={randomOptions.map((option) => ({ id: option.optionId, label: option.optionLabel }))}
        onSelectOption={handleRandomOptionSelect}
        onNextAction={randomOptions.length === 0 ? handleRandomDialogueNext : undefined}
        splitQuotedDialogue={false}
      />
    ) : undefined;
    const actions = !activeNpcDialogue && !activeRandomSession ? (
      <aside className="harem-palace-view__audience-actions" aria-label="妙音堂互动操作">
        <span className="harem-palace-view__audience-action-note">
          {`本旬可互动 ${remainingInteractionCount}/${PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN}`}
        </span>
        <button type="button" onClick={handleNpcTalk}>
          闲聊（耗次）
        </button>
        <button type="button" className={activeGiftMode === 'gift' ? 'is-active' : ''} onClick={handleOpenGift}>
          送礼（耗次）
        </button>
        <button type="button" onClick={handleGuidance}>
          请求指导（耗次）
        </button>
        <button type="button" onClick={closeNpc}>
          返回
        </button>
      </aside>
    ) : null;
    const giftPicker =
      activeGiftMode === 'gift' ? (
        <section className="harem-palace-view__audience-picker harem-palace-view__audience-picker--gift" role="dialog" aria-label="妙音堂送礼">
          <header>
            <strong>挑选礼物</strong>
            <span>{`当前银两：${state.silver}`}</span>
            <button type="button" onClick={() => setActiveGiftMode(null)}>
              收起
            </button>
          </header>
          <div className="harem-palace-view__audience-picker-list">
            {giftableInventory.length > 0 ? (
              giftableInventory.map((item) => (
                <button key={item.itemId} type="button" aria-label={`赠予${activeNpcProfile.name} ${item.name}`} onClick={() => handleGift(item)}>
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
    const practiceEntries =
      activeNpcProfile.id === MIAOYIN_MUSICIAN_NPC_ID ? ownedMusicScoreMastery : ownedDanceScoreMastery;
    const practicePicker =
      showPracticePicker ? (
        <section
          className="harem-palace-view__audience-picker harem-palace-view__audience-picker--gift"
          role="dialog"
          aria-label={activeNpcProfile.id === MIAOYIN_MUSICIAN_NPC_ID ? '乐师指导曲谱' : '舞者指导舞谱'}
        >
          <header>
            <strong>{activeNpcProfile.id === MIAOYIN_MUSICIAN_NPC_ID ? '请乐师指点' : '请舞者指点'}</strong>
            <span>{`可选${activeNpcProfile.id === MIAOYIN_MUSICIAN_NPC_ID ? '曲谱' : '舞谱'}：${practiceEntries.length}`}</span>
            <button type="button" onClick={() => setShowPracticePicker(false)}>
              收起
            </button>
          </header>
          <div className="harem-palace-view__audience-picker-list">
            {practiceEntries.map(({ item, mastery }) => (
              <button key={item.itemId} type="button" onClick={() => handlePracticeMusicScore(item.itemId)}>
                {`${item.name}｜难度 ${mastery.difficulty}｜完成度 ${mastery.masteryPercent}%｜已学 ${mastery.practiceCount} 次`}
              </button>
            ))}
          </div>
        </section>
      ) : undefined;

    return (
      <AudienceInteractionShell
        ariaLabel={`${activeNpcProfile.identity} ${activeNpcProfile.name} 日常对话`}
        heading={`妙音堂 · ${activeNpcProfile.name}`}
        metaRows={metaRows}
        portrait={portrait}
        actions={actions}
        picker={giftPicker ?? practicePicker}
        dialogue={dialogue}
      />
    );
  }

  return (
    <section className="miaoyin-view" aria-label="妙音堂场景">
      <MapSubsceneView locationId="妙音堂" npcs={subsceneNpcEntries} actions={subsceneActions} onLeave={enterMapMain} />

      {actionResultText ? (
        <LocationActionResultStage
          locationName="妙音堂"
          className="global-dialogue-stage--miaoyin"
          dialogueClassName="palace-dialogue-box--miaoyin-encounter"
          content={actionResultText}
          onNextAction={closeActionResult}
        />
      ) : null}

      {activeRandomSession && activeRandomLine ? (
        <GlobalDialogueStage
          sceneLabel="妙音堂闲逛"
          portraitLabel={isPlayerRandomLine ? `${state.name}立绘` : '妙音堂场景立绘'}
          ariaLabel="妙音堂闲逛事件"
          className="global-dialogue-stage--miaoyin"
          dialogueClassName="palace-dialogue-box--miaoyin-encounter"
          characterIdentity={activeRandomLine.speakerIdentity}
          characterName={activeRandomLine.speakerName}
          content={activeRandomLine.text}
          options={randomOptions.map((option) => ({ id: option.optionId, label: option.optionLabel }))}
          onSelectOption={handleRandomOptionSelect}
          onNextAction={randomOptions.length === 0 ? handleRandomDialogueNext : undefined}
          splitQuotedDialogue={false}
        />
      ) : null}

      {showSignUpPicker ? (
        <div className="miaoyin-view__picker-backdrop" role="dialog" aria-label="妙音堂宫宴报名">
          <div className="miaoyin-view__picker">
            <h3>登记宫宴报名</h3>
            <p>{`本届宫宴定于${banquetEventTime.month}月第${banquetEventTime.xun}旬${banquetEventTime.slot}。请选择一张曲谱或舞谱登记。`}</p>
            <div className="miaoyin-view__picker-list">
              {ownedBanquetScoreMastery.map(({ item, scoreKind, mastery }) => (
                <button key={item.itemId} type="button" onClick={() => handleSubmitMusicScore(item.itemId)}>
                  {`${item.name}｜${resolvePracticeScoreQualityLabel(scoreKind, item.color, item.rarity)}｜完成度 ${mastery.masteryPercent}%｜表现上限 ${
                    mastery.performanceCap ?? 0
                  }`}
                </button>
              ))}
            </div>
            <button type="button" className="miaoyin-view__picker-cancel" onClick={() => setShowSignUpPicker(false)}>
              暂不提交
            </button>
          </div>
        </div>
      ) : null}

    </section>
  );
}
