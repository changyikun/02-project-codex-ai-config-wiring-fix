import type { ServerEnv } from '../../config/env';
import type { EponeClient } from '../../clients/eponeClient';
import type { TempleAmbientRequest, TempleAmbientResponse } from '../../types/contracts';
import { templeAmbientResponseSchema } from '../../types/schemas';
import { buildPalaceDialoguePrompt } from './dialogueSystemPrompt';

const fallbackTextPool: Record<TempleAmbientRequest['action'], string[]> = {
  worship: [
    '你在香烟与木鱼声里合掌行礼，殿中梵音低回，心绪也跟着沉静了几分。',
    '佛前金灯微晃，你依礼叩拜一回，只觉殿内檀香温缓，连呼吸都慢了下来。',
    '你在蒲团前俯身礼佛，四下钟磬余音未散，原先浮在心头的杂念也被压住些许。',
  ],
  pray: [
    '你在佛前低声祈福，香灰缓缓坠下，像是连愿心都被这片静气托稳了。',
    '你将心愿压在掌心里默默祝祷，殿中灯火不言，只把一层安定轻轻覆在心上。',
    '你拈香祝祷片刻，耳边只剩风过檐铃，原本紊乱的思绪倒被理顺了一截。',
  ],
  'stroll-idle': [
    '殿内香烟缭绕，寂静无声，唯有经幡在高处轻轻拂动。',
    '你沿回廊缓步走了一圈，只见佛前灯影安稳，并无人上前惊动这一殿清静。',
    '宝华殿里檀香未散，僧值与宫人都各守其位，四下只余极轻的木鱼回音。',
    '你在殿前驻足片刻，金像沉静无言，连来往脚步都像被这一处清气压低了声息。',
  ],
};

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 17), 0);

const buildFallback = (payload: TempleAmbientRequest): TempleAmbientResponse => {
  const pool = fallbackTextPool[payload.action];
  const seed = `${payload.routeId}:${payload.timeContext.year}-${payload.timeContext.month}-${payload.timeContext.xun}:${payload.timeContext.slotIndex}:${payload.action}:${payload.stateHint ?? ''}`;
  return {
    text: pool[hashSeed(seed) % pool.length],
  };
};

export class TempleAmbientService {
  constructor(private readonly env: ServerEnv, private readonly textAiClient: EponeClient) {}

  async generate(payload: TempleAmbientRequest): Promise<TempleAmbientResponse> {
    try {
      const draft = templeAmbientResponseSchema.parse(
        await this.textAiClient.completeJson<TempleAmbientResponse>(
          this.env.narrativeModel,
          buildPalaceDialoguePrompt(
            '你是宫廷养成游戏的 temple-ambient-ai，负责输出宝华殿场景里的短句环境文本 JSON。',
            '你只输出一条 text，不得输出对白分支、数值结果或玩家决定。',
            '场景固定是宝华殿，氛围要清静、克制、带一点香火与宫廷肃穆感。',
            'action=worship 表示礼佛后的短句反馈；action=pray 表示祈福后的短句反馈；action=stroll-idle 表示闲逛未遇人时的空场反馈。',
            'text 长度控制在 24 到 48 字，尽量多变，但不能写成现代文案、提示语或客服腔。',
            '不得替玩家许愿成功，不得直接宣告命运改变，不得写成神怪显灵。',
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
