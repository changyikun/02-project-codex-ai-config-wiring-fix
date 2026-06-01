import {
  requestConsortDialogue,
  type ConsortDialogueRequestPayload,
} from '../../ai/consortDialogueAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import type { GameNumericsState, PalaceTimeState } from '../types';

export interface GongmenToolNpcProfile {
  id: string;
  identity: string;
  name: string;
  personality: string;
  summary: string;
}

export interface GongmenToolDialogueHistoryEntry {
  speaker: string;
  text: string;
}

interface RequestGongmenToolDialogueInput {
  saveId: string;
  sessionId: string;
  requestId: string;
  profile: GongmenToolNpcProfile;
  state: GameNumericsState;
  time: PalaceTimeState;
  history: GongmenToolDialogueHistoryEntry[];
}

export interface GongmenToolDialogueTurn {
  speakerIdentity: string;
  speakerName: string;
  text: string;
  sceneHint?: string;
  memoryCandidateCount: number;
  relationCandidateCount: number;
  sessionMemoryReadTurnCount: number;
  sessionMemoryReadCandidateCount: number;
  sessionMemoryWrittenCandidateCount: number;
  sessionMemoryReadRelationCandidateCount: number;
  sessionMemoryWrittenRelationCandidateCount: number;
  sessionMemoryCandidateCount: number;
  sessionMemoryRelationCandidateCount: number;
  sessionMemoryTurnCount: number;
  relationMemoryPromotedCount: number;
  relationMemoryRejectedCount: number;
  relationMemoryTotalEntryCount: number;
  usedFallback: boolean;
}

const trimHistory = (history: GongmenToolDialogueHistoryEntry[]): GongmenToolDialogueHistoryEntry[] => history.slice(-6);

const buildFallbackToolDialogue = (profile: GongmenToolNpcProfile): GongmenToolDialogueTurn => ({
  speakerIdentity: profile.identity,
  speakerName: profile.name,
  text:
    profile.name === '杜娘'
      ? '杜娘把袖中账册合上，笑意仍浅：“娘娘若只是闲谈，奴家自然奉陪。只是宫门风紧，买卖归买卖，闲话归闲话，哪一句都得留半分余地。”'
      : `${profile.name}略一垂眸，似是听清了你的来意，却没有立刻把话说满。`,
  sceneHint: 'AI 暂不可用，已用本地宫门闲谈 fallback 承接。',
  memoryCandidateCount: 0,
  relationCandidateCount: 0,
  sessionMemoryReadTurnCount: 0,
  sessionMemoryReadCandidateCount: 0,
  sessionMemoryWrittenCandidateCount: 0,
  sessionMemoryReadRelationCandidateCount: 0,
  sessionMemoryWrittenRelationCandidateCount: 0,
  sessionMemoryCandidateCount: 0,
  sessionMemoryRelationCandidateCount: 0,
  sessionMemoryTurnCount: 0,
  relationMemoryPromotedCount: 0,
  relationMemoryRejectedCount: 0,
  relationMemoryTotalEntryCount: 0,
  usedFallback: true,
});

export const requestGongmenToolDialogueWithFallback = async (
  input: RequestGongmenToolDialogueInput,
): Promise<GongmenToolDialogueTurn> => {
  const history = trimHistory(input.history);
  const payload: ConsortDialogueRequestPayload = {
    saveId: input.saveId,
    sessionId: input.sessionId,
    requestId: input.requestId,
    sceneId: `gongmen:${input.profile.id}`,
    routeId: input.state.routeId,
    playerName: input.state.name,
    playerRank: input.state.family || '宫中人',
    playerResidence: input.state.residenceName,
    playerOpeningTendency: input.state.openingTendency,
    canPunish: false,
    topic: 'follow-up',
    actionId: 'small-talk',
    actionLabel: '宫门闲谈',
    actionResult: '玩家只是与宫门工具 NPC 闲谈；不得触发购买、售卖、库存、银两、时辰或关系硬数值变化。',
    history,
    recentContext: history.map((entry) => `${entry.speaker}：${entry.text}`),
    playerContext: {
      favor: input.state.favor,
      stress: input.state.stress,
      prestige: input.state.prestige,
      trueHeart: input.state.trueHeart,
      silver: input.state.silver,
      stamina: input.state.stamina,
      stats: input.state.stats,
    },
    consortContext: {
      id: input.profile.id,
      name: input.profile.name,
      rank: input.profile.identity,
      residence: '宫门',
      stateLabel: '照常在宫门做买卖',
      personality: input.profile.personality,
      summary: input.profile.summary,
      currentGoodwill: 10,
      currentAffection: 0,
      emperorFavor: 0,
      stress: 0,
      allies: [],
      rivals: [],
    },
    timeContext: input.time,
  };

  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackToolDialogue(input.profile);
  }

  try {
    const response = await requestConsortDialogue(payload);
    const text = String(response.text ?? '').trim();
    if (!text) {
      return buildFallbackToolDialogue(input.profile);
    }

    return {
      speakerIdentity: response.speakerIdentity || input.profile.identity,
      speakerName: response.speakerName || input.profile.name,
      text,
      sceneHint: response.sceneHint,
      memoryCandidateCount: response.memoryCandidates?.length ?? 0,
      relationCandidateCount: response.relationCandidates?.length ?? 0,
      sessionMemoryReadTurnCount: response.sessionMemory?.readTurnCount ?? 0,
      sessionMemoryReadCandidateCount: response.sessionMemory?.readMemoryCandidateCount ?? 0,
      sessionMemoryWrittenCandidateCount: response.sessionMemory?.writtenMemoryCandidateCount ?? response.memoryCandidates?.length ?? 0,
      sessionMemoryReadRelationCandidateCount: response.sessionMemory?.readRelationCandidateCount ?? 0,
      sessionMemoryWrittenRelationCandidateCount:
        response.sessionMemory?.writtenRelationCandidateCount ?? response.relationCandidates?.length ?? 0,
      sessionMemoryCandidateCount: response.sessionMemory?.recentMemoryCandidateCount ?? 0,
      sessionMemoryRelationCandidateCount: response.sessionMemory?.recentRelationCandidateCount ?? 0,
      sessionMemoryTurnCount: response.sessionMemory?.recentTurnCount ?? 0,
      relationMemoryPromotedCount: response.relationMemory?.promotedCount ?? 0,
      relationMemoryRejectedCount: response.relationMemory?.rejectedCount ?? 0,
      relationMemoryTotalEntryCount: response.relationMemory?.totalEntryCount ?? 0,
      usedFallback: false,
    };
  } catch {
    return buildFallbackToolDialogue(input.profile);
  }
};
