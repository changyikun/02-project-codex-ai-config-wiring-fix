import type { RelationshipJudgeRequestPayload } from '../../ai/relationshipJudgeAgent';
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

export const buildLocalRelationshipJudgement = (
  localToneTag: RelationshipToneTag,
  optionText: string,
): RelationshipJudgeOutcome => {
  const mapped = toneDeltaMap[localToneTag];
  return {
    toneTag: localToneTag,
    favorDelta: mapped.favorDelta,
    affectionDelta: mapped.affectionDelta,
    reason: toneReasonMap[localToneTag],
    confidence: 0,
    source: 'local',
    optionText,
  };
};

export const requestRelationshipJudgementLocal = async (
  payload: RelationshipJudgeRequestPayload,
  localToneTag: RelationshipToneTag,
): Promise<RelationshipJudgeOutcome> => {
  return buildLocalRelationshipJudgement(localToneTag, payload.optionText);
};
