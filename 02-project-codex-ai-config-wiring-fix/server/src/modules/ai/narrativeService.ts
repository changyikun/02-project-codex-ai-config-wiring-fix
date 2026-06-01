import { narrativeAgentResponseSchema } from '../../types/schemas';
import type { ServerEnv } from '../../config/env';
import type { EponeClient } from '../../clients/eponeClient';
import type { CacheBusAdapter } from '../../lib/redis';
import type { AlertingPort } from '../../lib/alerting';
import type { CalcAgentResponse, NarrativeAgentResponse } from '../../types/contracts';
import { withRetries } from './shared';

const buildFallbackNarrative = (calc: CalcAgentResponse): NarrativeAgentResponse => ({
  traceId: calc.traceId,
  summary: '数值链路已完成，剧情采用本地回退模板生成。',
  lines: [
    {
      speaker: '旁白',
      emotion: calc.success ? '克制欣喜' : '谨慎隐忍',
      text: `本回合成功率为${calc.probability.toFixed(4)}%，牵动了声望${calc.deltas.prestige.toFixed(4)}点、圣心${calc.deltas.favor.toFixed(4)}点与体力${calc.deltas.stamina.toFixed(4)}点的变化。`,
    },
  ],
  referencedMetrics: calc.metrics.slice(0, 3),
  locale: 'zh-CN',
});

export class NarrativeAgentService {
  constructor(
    private readonly env: ServerEnv,
    private readonly cacheBus: CacheBusAdapter,
    private readonly eponeClient: EponeClient,
    private readonly alerting: AlertingPort,
  ) {}

  async generateFromTraceId(traceId: string): Promise<NarrativeAgentResponse> {
    const cached = await this.cacheBus.getNarrativeResult(traceId);
    if (cached) {
      return cached;
    }

    const calc = await this.cacheBus.getCalcResult(traceId);
    if (!calc) {
      throw new Error('Calculation payload has not been committed.');
    }

    const narrative = await withRetries(async () => {
      try {
        return narrativeAgentResponseSchema.parse(
          await this.eponeClient.completeJson<NarrativeAgentResponse>(
            this.env.narrativeModel,
            '你是剧情补全AI。必须根据输入中的阈值、概率、权重生成连贯叙事，至少引用3个数值节点，输出支持locale和emotion标签的JSON。',
            calc,
          ),
        );
      } catch (error) {
        await this.alerting.notify('narrative-agent-fallback', { traceId, error: String(error) });
        return buildFallbackNarrative(calc);
      }
    }, 3);

    await this.cacheBus.setNarrativeResult(traceId, narrative, this.env.cacheTtlSec);
    return narrative;
  }
}
