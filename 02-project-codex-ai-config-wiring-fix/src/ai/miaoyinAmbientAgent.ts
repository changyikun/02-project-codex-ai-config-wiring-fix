import type { PalaceTimeState } from '../game/types';
import { buildApiUrl } from './apiBaseUrl';

export interface MiaoYinAmbientRequestPayload {
  routeId: string;
  playerName: string;
  playerRank: string;
  location: string;
  action: 'listen' | 'stroll-idle' | 'sign-up';
  stateHint?: string;
  timeContext: PalaceTimeState;
}

export interface MiaoYinAmbientResponsePayload {
  text: string;
}

export const requestMiaoYinAmbient = async (
  payload: MiaoYinAmbientRequestPayload,
): Promise<MiaoYinAmbientResponsePayload> => {
  const response = await fetch(buildApiUrl('/api/v1/ai/miaoyin-ambient'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`妙音堂环境文本 AI 调用失败: ${response.status}`);
  }

  return response.json() as Promise<MiaoYinAmbientResponsePayload>;
};
