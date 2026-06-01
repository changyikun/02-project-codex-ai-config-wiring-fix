import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODES, type ErrorEnvelope } from '../types/contracts';
import {
  calcAgentRequestSchema,
  consortDialogueRequestSchema,
  miaoyinAmbientRequestSchema,
  openingDialogueRequestSchema,
  relationshipJudgeRequestSchema,
  taiyiAmbientRequestSchema,
  templeAmbientRequestSchema,
} from '../types/schemas';
import type {
  CalcAgentRequest,
  CalcAgentResponse,
  ConsortDialogueRequest,
  ConsortDialogueResponse,
  MiaoYinAmbientRequest,
  MiaoYinAmbientResponse,
  NarrativeAgentResponse,
  OpeningDialogueRequest,
  OpeningDialogueResponse,
  RelationshipJudgeRequest,
  RelationshipJudgeResponse,
  TaiyiAmbientRequest,
  TaiyiAmbientResponse,
  TempleAmbientRequest,
  TempleAmbientResponse,
} from '../types/contracts';

interface RouteDependencies {
  calcService: {
    execute: (payload: CalcAgentRequest) => Promise<CalcAgentResponse>;
  };
  narrativeService: {
    generateFromTraceId: (traceId: string) => Promise<NarrativeAgentResponse>;
  };
  openingDialogueService: {
    generate: (payload: OpeningDialogueRequest) => Promise<OpeningDialogueResponse>;
  };
  consortDialogueService: {
    generate: (payload: ConsortDialogueRequest) => Promise<ConsortDialogueResponse>;
  };
  relationshipJudgeService: {
    judge: (payload: RelationshipJudgeRequest) => Promise<RelationshipJudgeResponse>;
  };
  taiyiAmbientService: {
    generate: (payload: TaiyiAmbientRequest) => Promise<TaiyiAmbientResponse>;
  };
  templeAmbientService: {
    generate: (payload: TempleAmbientRequest) => Promise<TempleAmbientResponse>;
  };
  miaoyinAmbientService: {
    generate: (payload: MiaoYinAmbientRequest) => Promise<MiaoYinAmbientResponse>;
  };
}

export const registerAiRoutes = async (app: FastifyInstance, dependencies: RouteDependencies): Promise<void> => {
  app.get('/api/v1/ai/health', async () => ({ status: 'ok' }));

  app.post('/api/v1/ai/calc', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = calcAgentRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const body: ErrorEnvelope = {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: '请求体不符合 CalcAgent 契约。',
          retryable: false,
          details: parsed.error.flatten(),
        },
      };
      return reply.code(400).send(body);
    }

    const result = await dependencies.calcService.execute(parsed.data);
    return reply.code(200).send(result);
  });

  app.post('/api/v1/ai/opening-dialogue', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = openingDialogueRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const body: ErrorEnvelope = {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: '请求体不符合 OpeningDialogue 契约。',
          retryable: false,
          details: parsed.error.flatten(),
        },
      };
      return reply.code(400).send(body);
    }

    const result = await dependencies.openingDialogueService.generate(parsed.data);
    return reply.code(200).send(result);
  });

  app.post('/api/v1/ai/consort-dialogue', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = consortDialogueRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const body: ErrorEnvelope = {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: '请求体不符合 ConsortDialogue 契约。',
          retryable: false,
          details: parsed.error.flatten(),
        },
      };
      return reply.code(400).send(body);
    }

    const result = await dependencies.consortDialogueService.generate(parsed.data);
    return reply.code(200).send(result);
  });

  app.post('/api/v1/ai/relationship-judge', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = relationshipJudgeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const body: ErrorEnvelope = {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: '请求体不符合 RelationshipJudge 契约。',
          retryable: false,
          details: parsed.error.flatten(),
        },
      };
      return reply.code(400).send(body);
    }

    const result = await dependencies.relationshipJudgeService.judge(parsed.data);
    return reply.code(200).send(result);
  });

  app.post('/api/v1/ai/taiyi-ambient', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = taiyiAmbientRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const body: ErrorEnvelope = {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: '请求体不符合 TaiyiAmbient 契约。',
          retryable: false,
          details: parsed.error.flatten(),
        },
      };
      return reply.code(400).send(body);
    }

    const result = await dependencies.taiyiAmbientService.generate(parsed.data);
    return reply.code(200).send(result);
  });

  app.post('/api/v1/ai/temple-ambient', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = templeAmbientRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const body: ErrorEnvelope = {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: '请求体不符合 TempleAmbient 契约。',
          retryable: false,
          details: parsed.error.flatten(),
        },
      };
      return reply.code(400).send(body);
    }

    const result = await dependencies.templeAmbientService.generate(parsed.data);
    return reply.code(200).send(result);
  });

  app.post('/api/v1/ai/miaoyin-ambient', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = miaoyinAmbientRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const body: ErrorEnvelope = {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: '请求体不符合 MiaoYinAmbient 契约。',
          retryable: false,
          details: parsed.error.flatten(),
        },
      };
      return reply.code(400).send(body);
    }

    const result = await dependencies.miaoyinAmbientService.generate(parsed.data);
    return reply.code(200).send(result);
  });

  app.get<{ Params: { traceId: string } }>('/api/v1/ai/narrative/:traceId', async (request, reply) => {
    try {
      const result = await dependencies.narrativeService.generateFromTraceId(request.params.traceId);
      return reply.code(200).send(result);
    } catch {
      const body: ErrorEnvelope = {
        error: {
          code: ERROR_CODES.NARRATIVE_PENDING,
          message: '剧情结果尚未就绪，请稍后重试。',
          traceId: request.params.traceId,
          retryable: true,
        },
      };
      return reply.code(404).send(body);
    }
  });
};
