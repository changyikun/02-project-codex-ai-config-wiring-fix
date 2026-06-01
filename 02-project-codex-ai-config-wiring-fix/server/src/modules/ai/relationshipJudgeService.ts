import { relationshipJudgeResponseSchema } from '../../types/schemas';
import type { ServerEnv } from '../../config/env';
import type { EponeClient } from '../../clients/eponeClient';
import type { RelationshipJudgeRequest, RelationshipJudgeResponse, RelationshipToneTag } from '../../types/contracts';

const toneDeltaMap: Record<RelationshipToneTag, Pick<RelationshipJudgeResponse, 'favorDelta' | 'affectionDelta'>> = {
  friendly: { favorDelta: 1, affectionDelta: 0 },
  flirt: { favorDelta: 0, affectionDelta: 1 },
  cold: { favorDelta: -1, affectionDelta: 0 },
  reject: { favorDelta: 0, affectionDelta: -1 },
  neutral: { favorDelta: 0, affectionDelta: 0 },
};

const buildResult = (toneTag: RelationshipToneTag, reason: string, confidence: number): RelationshipJudgeResponse => ({
  toneTag,
  favorDelta: toneDeltaMap[toneTag].favorDelta,
  affectionDelta: toneDeltaMap[toneTag].affectionDelta,
  reason,
  confidence: Math.max(0, Math.min(1, confidence)),
});

const inferFallbackTone = (optionText: string): RelationshipToneTag => {
  const normalized = optionText.replace(/\s+/g, '');

  if (/[拒退别免离避远]/.test(normalized) || normalized.includes('不必')) {
    return 'reject';
  }
  if (/[冷淡疏]/.test(normalized) || normalized.includes('照例') || normalized.includes('按礼') || normalized.includes('规矩')) {
    return 'cold';
  }
  if (/[笑暧]/.test(normalized) || normalized.includes('试探') || normalized.includes('靠近') || normalized.includes('相伴')) {
    return 'flirt';
  }
  if (normalized.includes('问安') || normalized.includes('关心') || normalized.includes('多谢') || normalized.includes('温声')) {
    return 'friendly';
  }
  return 'neutral';
};

const buildFallbackRelationshipResult = (payload: RelationshipJudgeRequest): RelationshipJudgeResponse => {
  const toneTag = inferFallbackTone(payload.optionText);
  const reasonMap: Record<RelationshipToneTag, string> = {
    friendly: '本地规则判定这句更偏示好问安，按友好微调。',
    flirt: '本地规则判定这句带有试探与暧昧余地，按倾情微调。',
    cold: '本地规则判定这句刻意收敛情绪，按冷淡微调。',
    reject: '本地规则判定这句明确拉开距离，按拒斥微调。',
    neutral: '本地规则判定这句仅维持场面，按中性处理。',
  };
  return buildResult(toneTag, reasonMap[toneTag], 0.28);
};

export class RelationshipJudgeService {
  constructor(private readonly env: ServerEnv, private readonly textAiClient: EponeClient) {}

  async judge(payload: RelationshipJudgeRequest): Promise<RelationshipJudgeResponse> {
    try {
      const draft = relationshipJudgeResponseSchema.parse(
        await this.textAiClient.completeJson<RelationshipJudgeResponse>(
          this.env.relationshipJudgeModel,
          [
            '你是宫廷养成游戏的 relationship-judge-ai。',
            '你不负责对白润色，也不负责真实剧情后果。',
            '你只需根据 optionText、npcProfile、sceneType 和 recentContext，判断玩家此句更偏 friendly、flirt、cold、reject、neutral 中的哪一种。',
            '输出必须是严格 JSON，字段固定为 toneTag、favorDelta、affectionDelta、reason、confidence。',
            'toneTag 只能取上述五种之一。',
            'favorDelta 与 affectionDelta 只能是 -1、0、1，且单次只能改动一个维度；neutral 时两个都必须为 0。',
            'friendly 只能对应 favorDelta=1 affectionDelta=0；flirt 只能对应 favorDelta=0 affectionDelta=1；cold 只能对应 favorDelta=-1 affectionDelta=0；reject 只能对应 favorDelta=0 affectionDelta=-1。',
            'reason 保持一句短解释，不超过 30 字。',
            'confidence 取 0 到 1 之间的小数。',
          ].join(''),
          payload,
        ),
      );

      return buildResult(draft.toneTag, draft.reason, draft.confidence);
    } catch {
      return buildFallbackRelationshipResult(payload);
    }
  }
}
