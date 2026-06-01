import {
  requestMiaoYinAmbient,
  type MiaoYinAmbientRequestPayload,
} from '../../ai/miaoyinAmbientAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 33), 0);

const fallbackTextPool: Record<MiaoYinAmbientRequestPayload['action'], string[]> = {
  listen: [
    '丝竹隔着帘影缓缓流开，你把这一折听到尾声时，连心口那点郁气也松了些。',
    '堂中板眼稳稳落下，你听着清音回转，眉间原先绷着的神色也跟着缓了一截。',
    '你在妙音堂静静听完一轮，梁间余音未散，心绪却已比来时安稳许多。',
  ],
  'stroll-idle': [
    '妙音堂里只闻弦索与檀板相和，宫人来去虽多，却并无人上前同你搭话。',
    '你沿回廊走了一圈，只见乐工低头调弦、伶人守着拍子，这一回并无旁事生出。',
    '帘影轻晃，丝竹未停，妙音堂里的喧闹都被礼数压住，只余清音在堂中回旋。',
    '你在堂前停了片刻，听见一层层余音从珠帘后透出来，四下并无人惊动你。',
  ],
  'sign-up': [
    '你将曲谱交到掌册宫人手里，对方依礼记下名录，只待宫宴近时再排演次序。',
    '报名册页被低低翻过一张，你递上的曲谱已经记入名下，后头只等排演定调。',
    '掌册宫人收下曲谱后温声应诺，名录里已添上你的名字，只待日后登场。',
  ],
};

const buildFallbackText = (payload: MiaoYinAmbientRequestPayload): string => {
  const pool = fallbackTextPool[payload.action];
  const seed = `${payload.routeId}:${payload.timeContext.year}-${payload.timeContext.month}-${payload.timeContext.xun}:${payload.timeContext.slotIndex}:${payload.action}:${payload.stateHint ?? ''}`;
  return pool[hashSeed(seed) % pool.length];
};

export const requestMiaoYinAmbientWithFallback = async (
  payload: MiaoYinAmbientRequestPayload,
): Promise<string> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackText(payload);
  }

  try {
    const response = await requestMiaoYinAmbient(payload);
    return String(response.text ?? '').trim() || buildFallbackText(payload);
  } catch {
    return buildFallbackText(payload);
  }
};
