import type { RelationshipToneTag } from '../game/types';
import { buildApiUrl } from './apiBaseUrl';

const RELATIONSHIP_JUDGE_TIMEOUT_MS = 30000;

export interface RelationshipJudgeRequestPayload {
  routeId: string;
  npcId: string;
  sceneType: string;
  optionText: string;
  npcProfile: string;
  currentFavor: number;
  currentAffection: number;
  recentContext: string[];
}

export interface RelationshipJudgeResponsePayload {
  toneTag: RelationshipToneTag;
  favorDelta: number;
  affectionDelta: number;
  reason: string;
  confidence: number;
}

export const requestRelationshipJudge = async (
  payload: RelationshipJudgeRequestPayload,
): Promise<RelationshipJudgeResponsePayload> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), RELATIONSHIP_JUDGE_TIMEOUT_MS);
  const response = await fetch(buildApiUrl('/api/v1/ai/relationship-judge'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).finally(() => {
    window.clearTimeout(timeoutId);
  });

  if (!response.ok) {
    throw new Error(`关系判定 AI 调用失败: ${response.status}`);
  }

  return response.json() as Promise<RelationshipJudgeResponsePayload>;
};
