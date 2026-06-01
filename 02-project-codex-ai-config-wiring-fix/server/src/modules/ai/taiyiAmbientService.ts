import type { ServerEnv } from '../../config/env';
import type { EponeClient } from '../../clients/eponeClient';
import type { TaiyiAmbientRequest, TaiyiAmbientResponse } from '../../types/contracts';
import { taiyiAmbientResponseSchema } from '../../types/schemas';
import { buildPalaceDialoguePrompt } from './dialogueSystemPrompt';

const fallbackTextPool: Record<TaiyiAmbientRequest['action'], string[]> = {
  'stroll-idle': [
    '药香混着水声在廊下缓缓铺开，来往医官各忙各的，并无人停步同你搭话。',
    '你沿着晒药架与回廊走了一圈，只见药童低头分拣药材，太医院里一时并无旁事惊动。',
    '太医院里只闻药碾轻响与铜炉微沸，宫人来去匆匆，却没有谁为你停下脚步。',
    '你在药房外驻足片刻，空气里尽是苦香与热汽，四下安静得只剩翻脉案的细碎声响。',
  ],
  consult: [
    '你在案边陪着看完一轮脉案，药理关窍像被轻轻拨开一层，心里也更有底了。',
    '几册旧脉案与一回会诊听下来，你对药性配伍又明白了一分，连看方都顺了些。',
    '你跟着医官把这一轮会诊看完，药香与脉案里的门道慢慢落进心里，药理也随之精进。',
  ],
};

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 21), 0);

const buildFallback = (payload: TaiyiAmbientRequest): TaiyiAmbientResponse => {
  const pool = fallbackTextPool[payload.action];
  const seed = `${payload.routeId}:${payload.timeContext.year}-${payload.timeContext.month}-${payload.timeContext.xun}:${payload.timeContext.slotIndex}:${payload.action}:${payload.stateHint ?? ''}`;
  return {
    text: pool[hashSeed(seed) % pool.length],
  };
};

export class TaiyiAmbientService {
  constructor(private readonly env: ServerEnv, private readonly textAiClient: EponeClient) {}

  async generate(payload: TaiyiAmbientRequest): Promise<TaiyiAmbientResponse> {
    try {
      const draft = taiyiAmbientResponseSchema.parse(
        await this.textAiClient.completeJson<TaiyiAmbientResponse>(
          this.env.narrativeModel,
          buildPalaceDialoguePrompt(
            '你是宫廷养成游戏的 taiyi-ambient-ai，负责输出太医院场景里的短句环境文本 JSON。',
            '你只输出一条 text，不得输出对白分支、数值结果或玩家决定。',
            '场景固定是太医院，氛围要克制、清冷、带药香、水声、脉案与宫廷秩序感。',
            'action=stroll-idle 表示闲逛未遇人时的空场反馈；action=consult 表示旁听会诊后的短句反馈。',
            'text 长度控制在 24 到 48 字，尽量多变，但不能写成现代文案、提示语或客服腔。',
            '不得直接宣告病愈、毒发、怀孕、流产或命运改变，不得替系统决定任何真实诊断结果。',
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
