import type { PalaceTimeState } from '../game/types';
import { buildApiUrl } from './apiBaseUrl';

export interface TempleAmbientRequestPayload {
  routeId: string;
  playerName: string;
  playerRank: string;
  location: string;
  action: 'worship' | 'pray' | 'stroll-idle';
  stateHint?: string;
  timeContext: PalaceTimeState;
}

export interface TempleAmbientResponsePayload {
  text: string;
}

export const requestTempleAmbient = async (
  payload: TempleAmbientRequestPayload,
): Promise<TempleAmbientResponsePayload> => {
  const response = await fetch(buildApiUrl('/api/v1/ai/temple-ambient'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`宝华殿环境文本 AI 调用失败: ${response.status}`);
  }

  return response.json() as Promise<TempleAmbientResponsePayload>;
};
