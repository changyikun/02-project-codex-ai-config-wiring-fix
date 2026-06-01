import Redis from 'ioredis';
import type { CalcAgentResponse, CalcEventPayload, NarrativeAgentResponse } from '../types/contracts';

export interface CacheBusAdapter {
  mode: 'memory' | 'redis';
  setCalcResult: (traceId: string, value: CalcAgentResponse, ttlSec: number) => Promise<string>;
  getCalcResult: (traceId: string) => Promise<CalcAgentResponse | null>;
  setNarrativeResult: (traceId: string, value: NarrativeAgentResponse, ttlSec: number) => Promise<string>;
  getNarrativeResult: (traceId: string) => Promise<NarrativeAgentResponse | null>;
  publishCalcCompleted: (payload: CalcEventPayload) => Promise<void>;
  subscribeCalcCompleted: (handler: (payload: CalcEventPayload) => Promise<void>) => Promise<void>;
}

export class MemoryCacheBus implements CacheBusAdapter {
  public readonly mode = 'memory';
  private readonly calcStore = new Map<string, CalcAgentResponse>();
  private readonly narrativeStore = new Map<string, NarrativeAgentResponse>();
  private readonly subscribers: Array<(payload: CalcEventPayload) => Promise<void>> = [];

  async setCalcResult(traceId: string, value: CalcAgentResponse): Promise<string> {
    const key = `ai:calc:${traceId}`;
    this.calcStore.set(key, value);
    return key;
  }

  async getCalcResult(traceId: string): Promise<CalcAgentResponse | null> {
    return this.calcStore.get(`ai:calc:${traceId}`) ?? null;
  }

  async setNarrativeResult(traceId: string, value: NarrativeAgentResponse): Promise<string> {
    const key = `ai:narrative:${traceId}`;
    this.narrativeStore.set(key, value);
    return key;
  }

  async getNarrativeResult(traceId: string): Promise<NarrativeAgentResponse | null> {
    return this.narrativeStore.get(`ai:narrative:${traceId}`) ?? null;
  }

  async publishCalcCompleted(payload: CalcEventPayload): Promise<void> {
    await Promise.all(this.subscribers.map((handler) => handler(payload)));
  }

  async subscribeCalcCompleted(handler: (payload: CalcEventPayload) => Promise<void>): Promise<void> {
    this.subscribers.push(handler);
  }
}

export class RedisCacheBus implements CacheBusAdapter {
  public readonly mode = 'redis';

  private readonly publisher: Redis;
  private readonly client: Redis;
  private readonly subscriber: Redis;
  private readonly channel = 'ai.calc.completed';

  constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl);
    this.client = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    this.attachFriendlyErrorHint();
  }

  private attachFriendlyErrorHint(): void {
    let warned = false;
    const warnOnce = (error: Error) => {
      if (warned) {
        return;
      }
      warned = true;
      console.warn(
        `[cache] Redis connection failed: ${error.message}. For local dialogue testing, set REDIS_URL=memory://local if Redis is not needed.`,
      );
    };

    this.publisher.on('error', warnOnce);
    this.client.on('error', warnOnce);
    this.subscriber.on('error', warnOnce);
  }

  async setCalcResult(traceId: string, value: CalcAgentResponse, ttlSec: number): Promise<string> {
    const key = `ai:calc:${traceId}`;
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSec);
    return key;
  }

  async getCalcResult(traceId: string): Promise<CalcAgentResponse | null> {
    const raw = await this.client.get(`ai:calc:${traceId}`);
    return raw ? (JSON.parse(raw) as CalcAgentResponse) : null;
  }

  async setNarrativeResult(traceId: string, value: NarrativeAgentResponse, ttlSec: number): Promise<string> {
    const key = `ai:narrative:${traceId}`;
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSec);
    return key;
  }

  async getNarrativeResult(traceId: string): Promise<NarrativeAgentResponse | null> {
    const raw = await this.client.get(`ai:narrative:${traceId}`);
    return raw ? (JSON.parse(raw) as NarrativeAgentResponse) : null;
  }

  async publishCalcCompleted(payload: CalcEventPayload): Promise<void> {
    await this.publisher.publish(this.channel, JSON.stringify(payload));
  }

  async subscribeCalcCompleted(handler: (payload: CalcEventPayload) => Promise<void>): Promise<void> {
    await this.subscriber.subscribe(this.channel);
    this.subscriber.on('message', async (_channel, message) => {
      await handler(JSON.parse(message) as CalcEventPayload);
    });
  }
}

export const createCacheBus = (redisUrl: string): CacheBusAdapter => {
  if (redisUrl.startsWith('memory://')) {
    return new MemoryCacheBus();
  }

  return new RedisCacheBus(redisUrl);
};
