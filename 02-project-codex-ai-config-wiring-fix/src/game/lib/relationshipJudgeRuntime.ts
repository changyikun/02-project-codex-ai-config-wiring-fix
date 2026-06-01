import {
  requestRelationshipJudge,
  type RelationshipJudgeRequestPayload,
  type RelationshipJudgeResponsePayload,
} from '../../ai/relationshipJudgeAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import type { RelationshipJudgeOutcome, RelationshipToneTag } from '../types';

const toneDeltaMap: Record<RelationshipToneTag, Pick<RelationshipJudgeOutcome, 'favorDelta' | 'affectionDelta'>> = {
  friendly: { favorDelta: 1, affectionDelta: 0 },
  flirt: { favorDelta: 0, affectionDelta: 1 },
  cold: { favorDelta: -1, affectionDelta: 0 },
  reject: { favorDelta: 0, affectionDelta: -1 },
  neutral: { favorDelta: 0, affectionDelta: 0 },
};

const toneReasonMap: Record<RelationshipToneTag, string> = {
  friendly: '这句更像主动示好，系统按友好处理。',
  flirt: '这句留了明显暧昧余地，系统按倾情微增处理。',
  cold: '这句刻意拉开了距离，系统按冷淡处理。',
  reject: '这句明确表现出拒斥，系统按拒斥处理。',
  neutral: '这句更多是在维持场面，系统按中性处理。',
};

const isToneTag = (value: unknown): value is RelationshipToneTag => {
  return value === 'friendly' || value === 'flirt' || value === 'cold' || value === 'reject' || value === 'neutral';
};

const normalizeJudgeResponse = (
  response: RelationshipJudgeResponsePayload,
  fallbackToneTag: RelationshipToneTag,
  optionText: string,
): RelationshipJudgeOutcome => {
  const toneTag = isToneTag(response.toneTag) ? response.toneTag : fallbackToneTag;
  const mapped = toneDeltaMap[toneTag];

  return {
    toneTag,
    favorDelta: mapped.favorDelta,
    affectionDelta: mapped.affectionDelta,
    reason: String(response.reason ?? '').trim() || toneReasonMap[toneTag],
    confidence: Number.isFinite(response.confidence) ? Math.max(0, Math.min(1, response.confidence)) : 0.5,
    source: 'ai',
    optionText,
  };
};

export const buildLocalRelationshipJudgement = (
  fallbackToneTag: RelationshipToneTag,
  optionText: string,
): RelationshipJudgeOutcome => {
  const mapped = toneDeltaMap[fallbackToneTag];
  return {
    toneTag: fallbackToneTag,
    favorDelta: mapped.favorDelta,
    affectionDelta: mapped.affectionDelta,
    reason: toneReasonMap[fallbackToneTag],
    confidence: 0,
    source: 'fallback',
    optionText,
  };
};

export const requestRelationshipJudgementWithFallback = async (
  payload: RelationshipJudgeRequestPayload,
  fallbackToneTag: RelationshipToneTag,
): Promise<RelationshipJudgeOutcome> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildLocalRelationshipJudgement(fallbackToneTag, payload.optionText);
  }

  try {
    const response = await requestRelationshipJudge(payload);
    return normalizeJudgeResponse(response, fallbackToneTag, payload.optionText);
  } catch {
    return buildLocalRelationshipJudgement(fallbackToneTag, payload.optionText);
  }
};
