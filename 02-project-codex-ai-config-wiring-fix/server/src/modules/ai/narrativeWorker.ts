import type { CacheBusAdapter } from '../../lib/redis';
import type { NarrativeAgentService } from './narrativeService';
import type { AlertingPort } from '../../lib/alerting';

export class NarrativeWorker {
  constructor(
    private readonly cacheBus: CacheBusAdapter,
    private readonly narrativeService: NarrativeAgentService,
    private readonly alerting: AlertingPort,
  ) {}

  async start(): Promise<void> {
    await this.cacheBus.subscribeCalcCompleted(async (event) => {
      try {
        await this.narrativeService.generateFromTraceId(event.traceId);
      } catch (error) {
        await this.alerting.notify('narrative-worker-failed', {
          traceId: event.traceId,
          error: String(error),
        });
      }
    });
  }
}
