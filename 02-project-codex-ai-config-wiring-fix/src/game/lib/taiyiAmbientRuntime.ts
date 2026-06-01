import {
  requestTaiyiAmbient,
  type TaiyiAmbientRequestPayload,
} from '../../ai/taiyiAmbientAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 29), 0);

const fallbackTextPool: Record<TaiyiAmbientRequestPayload['action'], string[]> = {
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

const buildFallbackText = (payload: TaiyiAmbientRequestPayload): string => {
  const pool = fallbackTextPool[payload.action];
  const seed = `${payload.routeId}:${payload.timeContext.year}-${payload.timeContext.month}-${payload.timeContext.xun}:${payload.timeContext.slotIndex}:${payload.action}:${payload.stateHint ?? ''}`;
  return pool[hashSeed(seed) % pool.length];
};

export const requestTaiyiAmbientWithFallback = async (
  payload: TaiyiAmbientRequestPayload,
): Promise<string> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackText(payload);
  }

  try {
    const response = await requestTaiyiAmbient(payload);
    return String(response.text ?? '').trim() || buildFallbackText(payload);
  } catch {
    return buildFallbackText(payload);
  }
};
