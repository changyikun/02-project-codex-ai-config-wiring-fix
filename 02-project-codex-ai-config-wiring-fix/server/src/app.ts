import Fastify from 'fastify';
import { readEnv, type ServerEnv } from './config/env';
import { EponeClient } from './clients/eponeClient';
import { LoggerAlertingAdapter } from './lib/alerting';
import { createCacheBus } from './lib/redis';
import { registerErrorHandler } from './plugins/errorHandler';
import { registerAiRoutes } from './routes/aiRoutes';
import { CalcAgentService } from './modules/ai/calcService';
import { NarrativeAgentService } from './modules/ai/narrativeService';
import { NarrativeWorker } from './modules/ai/narrativeWorker';
import { ConsortDialogueService } from './modules/ai/consortDialogueService';
import { OpeningDialogueService } from './modules/ai/openingDialogueService';
import { RelationshipJudgeService } from './modules/ai/relationshipJudgeService';
import { TaiyiAmbientService } from './modules/ai/taiyiAmbientService';
import { MiaoYinAmbientService } from './modules/ai/miaoyinAmbientService';
import { TempleAmbientService } from './modules/ai/templeAmbientService';
import { FoundationConfigRegistry } from './modules/foundation/configRegistry';
import { FoundationRepository } from './modules/foundation/repository';
import { FoundationService } from './modules/foundation/service';
import { RelationMemoryService } from './modules/memory/relationMemoryService';
import { SessionMemoryService } from './modules/memory/sessionMemoryService';
import { registerLocalCors } from './plugins/localCors';
import { registerFoundationRoutes } from './routes/foundationRoutes';

export const buildApp = async (runtimeEnv: ServerEnv = readEnv()) => {
  const app = Fastify({ logger: true });
  const cacheBus = createCacheBus(runtimeEnv.redisUrl);
  const statAiClient = new EponeClient({
    apiKey: runtimeEnv.statAiApiKey || runtimeEnv.eponeApiKey,
    baseUrl: runtimeEnv.statAiBaseUrl || runtimeEnv.eponeBaseUrl,
    timeoutMs: runtimeEnv.aiTimeoutMs,
    wireApi: runtimeEnv.statAiWireApi,
    reasoningEffort: runtimeEnv.aiReasoningEffort,
    disableResponseStorage: runtimeEnv.disableResponseStorage,
  });
  const textAiClient = new EponeClient({
    apiKey: runtimeEnv.textAiApiKey || runtimeEnv.eponeApiKey,
    baseUrl: runtimeEnv.textAiBaseUrl || runtimeEnv.eponeBaseUrl,
    timeoutMs: runtimeEnv.aiTimeoutMs,
    wireApi: runtimeEnv.textAiWireApi,
    reasoningEffort: runtimeEnv.aiReasoningEffort,
    disableResponseStorage: runtimeEnv.disableResponseStorage,
  });
  const relationshipJudgeAiClient = new EponeClient({
    apiKey: runtimeEnv.relationshipJudgeApiKey || runtimeEnv.textAiApiKey || runtimeEnv.eponeApiKey,
    baseUrl: runtimeEnv.relationshipJudgeBaseUrl || runtimeEnv.textAiBaseUrl || runtimeEnv.eponeBaseUrl,
    timeoutMs: runtimeEnv.aiTimeoutMs,
    wireApi: runtimeEnv.relationshipJudgeWireApi,
    reasoningEffort: runtimeEnv.aiReasoningEffort,
    disableResponseStorage: runtimeEnv.disableResponseStorage,
  });
  const alerting = new LoggerAlertingAdapter();
  const calcService = new CalcAgentService(runtimeEnv, cacheBus, statAiClient, alerting);
  const narrativeService = new NarrativeAgentService(runtimeEnv, cacheBus, textAiClient, alerting);
  const openingDialogueService = new OpeningDialogueService(runtimeEnv, textAiClient);
  const sessionMemoryService = new SessionMemoryService();
  const relationMemoryService = new RelationMemoryService();
  const consortDialogueService = new ConsortDialogueService(
    runtimeEnv,
    textAiClient,
    sessionMemoryService,
    relationMemoryService,
  );
  const relationshipJudgeService = new RelationshipJudgeService(runtimeEnv, relationshipJudgeAiClient);
  const taiyiAmbientService = new TaiyiAmbientService(runtimeEnv, textAiClient);
  const miaoyinAmbientService = new MiaoYinAmbientService(runtimeEnv, textAiClient);
  const templeAmbientService = new TempleAmbientService(runtimeEnv, textAiClient);
  const worker = new NarrativeWorker(cacheBus, narrativeService, alerting);
  const foundationRegistry = new FoundationConfigRegistry();
  const foundationRepository = new FoundationRepository();
  const foundationService = new FoundationService(foundationRegistry, foundationRepository, app.log);

  registerErrorHandler(app);
  await registerLocalCors(app);
  await registerAiRoutes(app, {
    calcService,
    narrativeService,
    openingDialogueService,
    consortDialogueService,
    relationshipJudgeService,
    taiyiAmbientService,
    miaoyinAmbientService,
    templeAmbientService,
  });
  await registerFoundationRoutes(app, foundationService);
  await worker.start();

  return app;
};
