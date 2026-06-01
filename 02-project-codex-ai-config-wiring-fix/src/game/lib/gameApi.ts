import type {
  ActivityId,
  DialogueTurn,
  GameNumericsState,
  MapAreaId,
  NumericSaveEnvelope,
} from '../types';
import { buildApiUrl } from '../../ai/apiBaseUrl';

const postJson = async <T>(url: string, body: unknown): Promise<T> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(buildApiUrl(url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
};

export const gameApi = {
  recordAttributes: (state: GameNumericsState) =>
    postJson<{ state: GameNumericsState; save: NumericSaveEnvelope }>('/api/v1/game/record-attributes', state),
  createBriefing: (state: GameNumericsState) => postJson<{ summary: string }>('/api/v1/game/briefing', state),
  getDialogueTurn: (state: GameNumericsState, summary: string) =>
    postJson<DialogueTurn>('/api/v1/game/dialogue-turn', { state, summary }),
  applyChoice: (state: GameNumericsState, optionLabel: string) =>
    postJson<{ state: GameNumericsState; save: NumericSaveEnvelope }>('/api/v1/game/apply-choice', { state, optionLabel }),
  applyActivity: (state: GameNumericsState, activity: ActivityId) =>
    postJson<{ state: GameNumericsState; save: NumericSaveEnvelope }>('/api/v1/game/activity', { state, activity }),
  applyMapEvent: (state: GameNumericsState, area: MapAreaId) =>
    postJson<{ state: GameNumericsState; text: string }>('/api/v1/game/map-event', { state, area }),
  verifySave: (save: NumericSaveEnvelope) => postJson<{ valid: boolean }>('/api/v1/game/verify-save', { save }),
};
