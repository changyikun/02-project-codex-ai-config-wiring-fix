import { ERROR_CODES } from '../../types/contracts';
import type { CalcAgentRequest, CalcAgentResponse } from '../../types/contracts';

export class AiContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const withRetries = async <T>(factory: () => Promise<T>, retries = 3): Promise<T> => {
  let lastError: unknown;
  for (let index = 0; index < retries; index += 1) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
    }
  }

  throw new AiContractError(ERROR_CODES.NARRATIVE_GENERATION_FAILED, '重试 3 次后仍未成功。', true, 500, lastError);
};

export const buildFallbackCalcResult = (payload: CalcAgentRequest): Omit<CalcAgentResponse, 'cacheKey'> => {
  const probability = Math.min(
    95,
    Math.max(
      5,
      Number((
        payload.player.baseStats.intellect * 0.28 +
        payload.player.baseStats.intrigue * 0.33 +
        payload.player.baseStats.prestige * 0.2 +
        (payload.weights?.reward ?? 0.5) * 22 -
        (payload.weights?.risk ?? 0.5) * 14
      ).toFixed(4)),
    ),
  );

  return {
    traceId: payload.traceId,
    success: probability >= 50,
    probability,
    deltas: {
      silver: Number((probability > 55 ? -18.25 : -8.5).toFixed(4)),
      stamina: Number((probability > 55 ? -10.125 : -6.375).toFixed(4)),
      favor: Number((probability > 55 ? 6.75 : 1.25).toFixed(4)),
      prestige: Number((probability > 55 ? 4.5 : 0.75).toFixed(4)),
    },
    metrics: [
      { key: 'favor', value: Number(payload.player.baseStats.favor.toFixed(4)), description: '当前圣心偏向值' },
      { key: 'prestige', value: Number(payload.player.baseStats.prestige.toFixed(4)), description: '当前名望权重' },
      { key: 'probability', value: probability, description: '事件综合成功率' },
    ],
    anomalyDetected: false,
    rollbackSuggested: false,
    generatedAt: new Date().toISOString(),
  };
};
