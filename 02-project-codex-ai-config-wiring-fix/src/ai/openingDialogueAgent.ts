import type { DialogueDataEffects, DialogueOption, PalaceTimeState } from '../game/types';
import { buildApiUrl } from './apiBaseUrl';

export interface OpeningDialogueNpcContext {
  npcId: string;
  identity: string;
  publicFace: string;
  hiddenCore: string;
  speechStyle: string[];
  sceneDuty: string[];
}

export interface OpeningDialogueRouteContext {
  playerRoleSummary: string;
  routePressure: string;
  mapFeatureSummary: string;
  choiceFocus: string;
}

export interface OpeningDialogueRequestPayload {
  routeId: string;
  playerName: string;
  family: string;
  playerTitle: string;
  residenceName: string;
  npcName: string;
  topic: string;
  turn: number;
  selectedOptionId?: string;
  selectedOptionLabel?: string;
  history: Array<{
    speaker: string;
    text: string;
  }>;
  playerContext: {
    currentRank: string;
    personality: string;
    routeLabel?: string;
    favor: number;
    stress: number;
    prestige: number;
    trueHeart: number;
    silver: number;
    stamina: number;
    stats: Record<string, number>;
  };
  npcContext: OpeningDialogueNpcContext;
  routeContext: OpeningDialogueRouteContext;
  timeContext: PalaceTimeState;
}

export interface OpeningDialogueResponsePayload {
  mode: 'line' | 'branch';
  phase: 'continue' | 'finish';
  speakerIdentity: string;
  speakerName: string;
  text: string;
  nextActionLabel: string;
  timeCost: number;
  dataEffects: DialogueDataEffects;
  options: DialogueOption[];
}

export const requestOpeningDialogue = async (
  payload: OpeningDialogueRequestPayload,
): Promise<OpeningDialogueResponsePayload> => {
  const response = await fetch(buildApiUrl('/api/v1/ai/opening-dialogue'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`开场对白 AI 调用失败: ${response.status}`);
  }

  return response.json() as Promise<OpeningDialogueResponsePayload>;
};
