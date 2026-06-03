import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { GalgameRuntimeService } from '../modules/galgameRuntime/service';

const runtimeStateSchema = z.object({
  name: z.string(),
  age: z.number(),
  family: z.string(),
  pointsLeft: z.number(),
  routeId: z.enum(['lanyinxuguo', 'fushengrumeng', 'yingluoyeting', 'chenyuansucuo']),
  silver: z.number(),
  prestige: z.number(),
  stress: z.number(),
  favor: z.number(),
  trueHeart: z.number(),
  stats: z.record(z.string(), z.number()),
  flags: z.record(z.string(), z.boolean()),
});

const saveEnvelopeSchema = z.object({
  save: z.object({
    data: runtimeStateSchema,
    checksum: z.string(),
    savedAt: z.string(),
  }),
});

export const registerGalgameRoutes = async (app: FastifyInstance, service: GalgameRuntimeService): Promise<void> => {
  app.post('/api/v1/game/record-attributes', async (request, reply) => {
    const parsed = runtimeStateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'GAME_4001', message: parsed.error.flatten() });
    return service.recordAttributes(parsed.data);
  });

  app.post('/api/v1/game/briefing', async (request, reply) => {
    const parsed = runtimeStateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'GAME_4002', message: parsed.error.flatten() });
    return service.createBriefing(parsed.data);
  });

  app.post('/api/v1/game/dialogue-turn', async (request, reply) => {
    const body = z.object({ state: runtimeStateSchema, summary: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ code: 'GAME_4003', message: body.error.flatten() });
    return service.getDialogueTurn(body.data.state, body.data.summary);
  });

  app.post('/api/v1/game/apply-choice', async (request, reply) => {
    const body = z.object({ state: runtimeStateSchema, optionLabel: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ code: 'GAME_4004', message: body.error.flatten() });
    return service.applyChoice(body.data.state, body.data.optionLabel);
  });

  app.post('/api/v1/game/activity', async (request, reply) => {
    const body = z.object({ state: runtimeStateSchema, activity: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ code: 'GAME_4005', message: body.error.flatten() });
    return service.applyActivity(body.data.state, body.data.activity);
  });

  app.post('/api/v1/game/map-event', async (request, reply) => {
    const body = z.object({ state: runtimeStateSchema, area: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ code: 'GAME_4006', message: body.error.flatten() });
    return service.applyMapEvent(body.data.state, body.data.area);
  });

  app.post('/api/v1/game/verify-save', async (request, reply) => {
    const body = saveEnvelopeSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ code: 'GAME_4007', message: body.error.flatten() });
    return { valid: service.verifySave(body.data.save) };
  });
};
