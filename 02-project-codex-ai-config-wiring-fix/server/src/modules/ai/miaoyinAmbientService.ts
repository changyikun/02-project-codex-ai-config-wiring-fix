import type { ServerEnv } from '../../config/env';
import type { EponeClient } from '../../clients/eponeClient';
import type { MiaoYinAmbientRequest, MiaoYinAmbientResponse } from '../../types/contracts';
import { miaoyinAmbientResponseSchema } from '../../types/schemas';
import { buildPalaceDialoguePrompt } from './dialogueSystemPrompt';

const fallbackTextPool: Record<MiaoYinAmbientRequest['action'], string[]> = {
  listen: [
    '丝竹隔着珠帘一层层漫开，你听到后来，原本压在心口的郁气也跟着松了半分。',
    '堂中清音回旋不绝，板眼一稳，连你眉间那点紧绷都被轻轻抚平了些。',
    '你在妙音堂静静听完一折，余音绕在梁间不散，心神也比来时沉静许多。',
  ],
  'stroll-idle': [
    '妙音堂里只余余音轻转，伶人与乐工各自守着节拍，并无人上前惊动你。',
    '你沿着回廊缓步走过，堂中弦索未断，帘影与拍板声把四下衬得愈发安静。',
    '檀板轻敲，丝竹隐隐，妙音堂里人来人往却各守规矩，这一回并无人同你搭话。',
    '你在堂前停了片刻，只见乐工调弦、宫人低头穿行，满堂清音里并无旁事横生。',
  ],
  'sign-up': [
    '你把曲谱递上后，案前掌册宫人低声应下，只待宫宴近时再照名次排演。',
    '报名册页被轻轻翻过一张，你递上的曲谱已记入名下，只等后头排演定调。',
    '掌册宫人将曲谱收好，依礼落了名录，这一回宫宴的名单里算是添上了你。',
  ],
};

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 23), 0);

const buildFallback = (payload: MiaoYinAmbientRequest): MiaoYinAmbientResponse => {
  const pool = fallbackTextPool[payload.action];
  const seed = `${payload.routeId}:${payload.timeContext.year}-${payload.timeContext.month}-${payload.timeContext.xun}:${payload.timeContext.slotIndex}:${payload.action}:${payload.stateHint ?? ''}`;
  return {
    text: pool[hashSeed(seed) % pool.length],
  };
};

export class MiaoYinAmbientService {
  constructor(private readonly env: ServerEnv, private readonly textAiClient: EponeClient) {}

  async generate(payload: MiaoYinAmbientRequest): Promise<MiaoYinAmbientResponse> {
    try {
      const draft = miaoyinAmbientResponseSchema.parse(
        await this.textAiClient.completeJson<MiaoYinAmbientResponse>(
          this.env.narrativeModel,
          buildPalaceDialoguePrompt(
            '你是宫廷养成游戏的 miaoyin-ambient-ai，负责输出妙音堂场景里的短句环境文本 JSON。',
            '你只输出一条 text，不得输出对白分支、数值结果或玩家决定。',
            '场景固定是妙音堂，氛围要兼有丝竹、板眼、珠帘、乐工、清音与宫廷礼制感。',
            'action=listen 表示听曲后的短句反馈；action=stroll-idle 表示闲逛未遇人时的空场反馈；action=sign-up 表示递交曲谱报名后的短句反馈。',
            'text 长度控制在 24 到 48 字，尽量多变，但不能写成现代文案、提示语或客服腔。',
            '不得直接宣告必定获胜、必定得宠、技艺暴涨或命运改变，也不得替系统决定宫宴结果。',
            '输出必须是严格 JSON，字段固定为 text。',
          ),
          payload,
        ),
      );
      return draft.text.trim() ? draft : buildFallback(payload);
    } catch {
      return buildFallback(payload);
    }
  }
}
