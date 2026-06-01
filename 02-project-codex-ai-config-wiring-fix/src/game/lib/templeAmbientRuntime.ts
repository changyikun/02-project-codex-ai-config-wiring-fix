import {
  requestTempleAmbient,
  type TempleAmbientRequestPayload,
} from '../../ai/templeAmbientAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 23), 0);

const fallbackTextPool: Record<TempleAmbientRequestPayload['action'], string[]> = {
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

const buildFallbackText = (payload: TempleAmbientRequestPayload): string => {
  const pool = fallbackTextPool[payload.action];
  const seed = `${payload.routeId}:${payload.timeContext.year}-${payload.timeContext.month}-${payload.timeContext.xun}:${payload.timeContext.slotIndex}:${payload.action}:${payload.stateHint ?? ''}`;
  return pool[hashSeed(seed) % pool.length];
};

export const requestTempleAmbientWithFallback = async (
  payload: TempleAmbientRequestPayload,
): Promise<string> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackText(payload);
  }

  try {
    const response = await requestTempleAmbient(payload);
    return String(response.text ?? '').trim() || buildFallbackText(payload);
  } catch {
    return buildFallbackText(payload);
  }
};
