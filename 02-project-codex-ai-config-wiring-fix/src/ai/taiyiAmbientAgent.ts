import type { PalaceTimeState } from '../game/types';
import { buildApiUrl } from './apiBaseUrl';

export interface TaiyiAmbientRequestPayload {
  routeId: string;
  playerName: string;
  playerRank: string;
  location: string;
  action: 'stroll-idle' | 'consult';
  stateHint?: string;
  timeContext: PalaceTimeState;
}

export interface TaiyiAmbientResponsePayload {
  text: string;
}

export const requestTaiyiAmbient = async (
  payload: TaiyiAmbientRequestPayload,
): Promise<TaiyiAmbientResponsePayload> => {
  const response = await fetch(buildApiUrl('/api/v1/ai/taiyi-ambient'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`太医院环境文本 AI 调用失败: ${response.status}`);
  }

  return response.json() as Promise<TaiyiAmbientResponsePayload>;
};
