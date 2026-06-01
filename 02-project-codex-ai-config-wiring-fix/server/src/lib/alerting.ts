import { setTimeout as wait } from 'node:timers/promises';

export interface AlertingPort {
  notify: (title: string, payload: Record<string, unknown>) => Promise<void>;
}

export class LoggerAlertingAdapter implements AlertingPort {
  async notify(title: string, payload: Record<string, unknown>): Promise<void> {
    await wait(1);
    console.error(`[ALERT] ${title}`, payload);
  }
}
