import { ERROR_CODES } from '../../types/contracts';
import { calcAgentResponseSchema } from '../../types/schemas';
import type { ServerEnv } from '../../config/env';
import type { EponeClient } from '../../clients/eponeClient';
import type { CacheBusAdapter } from '../../lib/redis';
import type { AlertingPort } from '../../lib/alerting';
import type { CalcAgentRequest, CalcAgentResponse } from '../../types/contracts';
import { AiContractError, buildFallbackCalcResult } from './shared';

const round4 = (value: number): number => Math.round(value * 10000) / 10000;

const normalizeCalcResponse = (response: Omit<CalcAgentResponse, 'cacheKey'>, cacheKey: string): CalcAgentResponse => ({
  ...response,
  probability: round4(response.probability),
  deltas: {
    silver: round4(response.deltas.silver),
    stamina: round4(response.deltas.stamina),
    favor: round4(response.deltas.favor),
    prestige: round4(response.deltas.prestige),
  },
  metrics: response.metrics.map((item) => ({ ...item, value: round4(item.value) })),
  cacheKey,
});

const anomalyDetected = (response: Omit<CalcAgentResponse, 'cacheKey'>): boolean => {
  const values = [response.probability, ...Object.values(response.deltas), ...response.metrics.map((item) => item.value)];
  return values.some((value) => !Number.isFinite(value) || Math.abs(value) > 10000);
};

export class CalcAgentService {
  constructor(
    private readonly env: ServerEnv,
    private readonly cacheBus: CacheBusAdapter,
    private readonly eponeClient: EponeClient,
    private readonly alerting: AlertingPort,
  ) {}

  async execute(payload: CalcAgentRequest): Promise<CalcAgentResponse> {
    let draft = buildFallbackCalcResult(payload);

    try {
      draft = calcAgentResponseSchema.omit({ cacheKey: true }).parse(
        await this.eponeClient.completeJson<Omit<CalcAgentResponse, 'cacheKey'>>(
          this.env.calcModel,
          '你是数据计算AI。只输出结构化JSON。需要高精度数值运算、统计校验、输出4位小数，并包含异常检测与rollbackSuggested字段。',
          payload,
        ),
      );
    } catch (error) {
      await this.alerting.notify('calc-agent-fallback', { traceId: payload.traceId, error: String(error) });
    }

    if (anomalyDetected(draft)) {
      const rollback = buildFallbackCalcResult(payload);
      rollback.anomalyDetected = true;
      rollback.rollbackSuggested = true;
      draft = rollback;
    }

    const cacheKey = await this.cacheBus.setCalcResult(payload.traceId, normalizeCalcResponse(draft, `ai:calc:${payload.traceId}`), this.env.cacheTtlSec);
    const committed = normalizeCalcResponse(draft, cacheKey);

    try {
      await this.cacheBus.publishCalcCompleted({
        traceId: payload.traceId,
        cacheKey,
        generatedAt: committed.generatedAt,
      });
    } catch (error) {
      throw new AiContractError(ERROR_CODES.REDIS_WRITE_FAILED, 'Redis 事件发布失败。', true, 500, error);
    }

    return committed;
  }
}
