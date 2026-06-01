export type AiWireApi = 'chat_completions' | 'responses';
export type AiReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface ServerEnv {
  port: number;
  redisUrl: string;
  eponeBaseUrl: string;
  eponeApiKey: string;
  textAiBaseUrl: string;
  textAiApiKey: string;
  textAiWireApi: AiWireApi;
  statAiBaseUrl: string;
  statAiApiKey: string;
  statAiWireApi: AiWireApi;
  relationshipJudgeBaseUrl: string;
  relationshipJudgeApiKey: string;
  relationshipJudgeWireApi: AiWireApi;
  calcModel: string;
  narrativeModel: string;
  relationshipJudgeModel: string;
  aiReasoningEffort?: AiReasoningEffort;
  disableResponseStorage: boolean;
  aiTimeoutMs: number;
  cacheTtlSec: number;
  alarmWebhookUrl?: string;
}

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/u, '');

const resolveAzureOpenAiBaseUrl = (): string | undefined => {
  const explicitBaseUrl = process.env.AZURE_OPENAI_BASE_URL;
  if (explicitBaseUrl) {
    return normalizeBaseUrl(explicitBaseUrl);
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    return undefined;
  }

  const normalized = normalizeBaseUrl(endpoint);
  return normalized.endsWith('/openai/v1') ? normalized : `${normalized}/openai/v1`;
};

const readWireApi = (value: string | undefined, fallback: AiWireApi): AiWireApi => {
  return value === 'responses' || value === 'chat_completions' ? value : fallback;
};

const readReasoningEffort = (value: string | undefined): AiReasoningEffort | undefined => {
  if (value === 'minimal' || value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh') {
    return value;
  }
  return undefined;
};

const readBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1' || value === 'yes';
};

export const readEnv = (): ServerEnv => ({
  port: Number(process.env.PORT ?? 8787),
  redisUrl: process.env.REDIS_URL ?? 'memory://local',
  eponeBaseUrl: process.env.EPONE_BASE_URL ?? 'https://epone.ggb.today',
  eponeApiKey: process.env.EPONE_API_KEY ?? '',
  textAiBaseUrl: process.env.TEXT_AI_BASE_URL ?? resolveAzureOpenAiBaseUrl() ?? process.env.EPONE_BASE_URL ?? 'https://api.deepseek.com',
  textAiApiKey: process.env.TEXT_AI_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? process.env.EPONE_API_KEY ?? '',
  textAiWireApi: readWireApi(process.env.TEXT_AI_WIRE_API ?? process.env.AI_WIRE_API, 'chat_completions'),
  statAiBaseUrl: process.env.STAT_AI_BASE_URL ?? process.env.EPONE_BASE_URL ?? 'https://api.deepseek.com',
  statAiApiKey: process.env.STAT_AI_API_KEY ?? process.env.EPONE_API_KEY ?? '',
  statAiWireApi: readWireApi(process.env.STAT_AI_WIRE_API, 'chat_completions'),
  relationshipJudgeBaseUrl:
    process.env.RELATIONSHIP_JUDGE_BASE_URL ??
    process.env.TEXT_AI_BASE_URL ??
    resolveAzureOpenAiBaseUrl() ??
    process.env.EPONE_BASE_URL ??
    'https://api.deepseek.com',
  relationshipJudgeApiKey:
    process.env.RELATIONSHIP_JUDGE_API_KEY ??
    process.env.TEXT_AI_API_KEY ??
    process.env.AZURE_OPENAI_API_KEY ??
    process.env.EPONE_API_KEY ??
    '',
  relationshipJudgeWireApi: readWireApi(
    process.env.RELATIONSHIP_JUDGE_WIRE_API ?? process.env.TEXT_AI_WIRE_API ?? process.env.AI_WIRE_API,
    readWireApi(process.env.TEXT_AI_WIRE_API ?? process.env.AI_WIRE_API, 'chat_completions'),
  ),
  calcModel: process.env.CALC_AGENT_MODEL ?? 'gpt-4o-mini',
  narrativeModel: process.env.NARRATE_AGENT_MODEL ?? 'gpt-4o-mini',
  relationshipJudgeModel: process.env.RELATIONSHIP_JUDGE_MODEL ?? process.env.NARRATE_AGENT_MODEL ?? 'gpt-4o-mini',
  aiReasoningEffort: readReasoningEffort(process.env.AI_REASONING_EFFORT),
  disableResponseStorage: readBoolean(process.env.DISABLE_RESPONSE_STORAGE, true),
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 30000),
  cacheTtlSec: Number(process.env.CACHE_TTL_SEC ?? 1800),
  alarmWebhookUrl: process.env.ALARM_WEBHOOK_URL,
});
