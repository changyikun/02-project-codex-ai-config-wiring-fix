import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { FoundationService } from '../modules/foundation/service';
import {
  applyGlobalStressLifeListener,
  applyNpcMadnessCheck,
  createLanyinStartState,
  endingValidationTable,
  validateLanyinEndings,
} from '../modules/foundation/lanyinxuguo';

const initSchema = z.object({
  characterId: z.string().min(1),
  routeId: z.enum(['lanyinxuguo', 'fushengrumeng', 'yingluoyeting', 'chenyuansucuo']),
  familyBackgroundId: z.string().min(1),
  routeFlags: z
    .object({
      chenyuansucuoCompleted: z.boolean().optional(),
    })
    .optional(),
});

const fortuneSingleSchema = z.object({
  characterId: z.string().min(1),
  delta: z.union([z.literal(1), z.literal(-1)]),
  operator: z.string().min(1),
});

const fortuneBatchSchema = z.object({
  operator: z.string().min(1),
  items: z.array(
    z.object({
      characterId: z.string().min(1),
      delta: z.number().int().min(-20).max(20),
    }),
  ),
});

const tickSchema = z.object({
  characterId: z.string().min(1),
  reliefApplied: z.number().int().min(0).optional(),
});

const rollbackSchema = z.object({
  snapshotId: z.string().min(1),
  operator: z.string().min(1),
});
const routeStressUpsertSchema = z.object({
  routeId: z.enum(['lanyinxuguo', 'fushengrumeng', 'yingluoyeting', 'chenyuansucuo']),
  routeName: z.string().min(1),
  baseStressIncreasePerMonth: z.number().int().min(0),
  reliefThreshold: z.number().int().min(0),
  operator: z.string().min(1).optional(),
});

const promotionSchema = z.object({
  characterId: z.string().min(1),
  queenVacant: z.boolean(),
  queenIllOrOutOfFavor: z.boolean(),
  targetRank: z.enum(['贵妃', '皇贵妃', '皇后']),
});
const lanyinStartSchema = z.object({
  name: z.string().min(1).optional(),
  familyBackgroundId: z.enum(['zhen_state_duke', 'official_3', 'official_2', 'official_1']).optional(),
  aptitudePoints: z.number().int().min(48).max(51).optional(),
  age: z.number().int().min(15).max(23).optional(),
  emperorFavor: z.number().int().min(40).max(60).optional(),
  emperorTrueHeart: z.number().int().min(20).max(50).optional(),
});
const stressLifeSchema = z.object({
  stress: z.number(),
  life: z.number(),
  xunPassed: z.number().int().min(1).default(1),
});
const npcMadnessSchema = z.object({
  npcId: z.string().min(1),
  stress: z.number(),
  isMad: z.boolean(),
  canServeEmperor: z.boolean(),
  madnessProbability: z.number().min(0).max(1),
  randomValue: z.number().min(0).max(1),
});
const endingValidateSchema = z.object({
  emperorAlive: z.boolean(),
  emperorDeposed: z.boolean(),
  emperorDead: z.boolean(),
  selfEnthroned: z.boolean(),
  hasCrownPrince: z.boolean(),
  prestige: z.number(),
  politics: z.number(),
  ambition: z.number(),
  emperorFavor: z.number(),
  trueHeart: z.number(),
  fatherOfficialRank: z.enum(['正一品', '从一品', '正二品', '从二品', '正三品', '从三品', '正四品', '从四品', '正五品', '从五品']),
  courtLoyalty: z.number(),
  hasTigerTally: z.boolean(),
  heirAge: z.number().optional(),
  intrigue: z.number(),
  eventFlags: z.object({
    trueHeartHardToGet: z.boolean(),
    emperorDismissedHarem: z.boolean(),
    fakeDeathTriggered: z.boolean(),
    fakeDeathFlowCompleted: z.boolean(),
    escapedPalace: z.boolean(),
  }),
  haremCount: z.number().int(),
  allConsortsFavorAbove70: z.boolean(),
  medicine: z.number(),
  physique: z.number(),
  craftedFakeDeathMedicine: z.boolean(),
  taiyiFavor: z.number(),
  taiyiWillingAssist: z.boolean(),
  foziFavor: z.number(),
  foziWillingAssist: z.boolean(),
});

export const registerFoundationRoutes = async (app: FastifyInstance, service: FoundationService): Promise<void> => {
  app.get('/api/v1/foundation/config', async () => service.getConfigSnapshot());

  app.post('/api/v1/foundation/config/reload', async () => service.reloadConfig('gm'));
  app.post('/api/v1/foundation/config/route-stress', async (request, reply) => {
    const parsed = routeStressUpsertSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4006', message: parsed.error.flatten() });
    }
    const { operator, ...config } = parsed.data;
    return service.upsertRouteStressConfig(config, operator ?? 'gm');
  });

  app.post('/api/v1/foundation/characters/init', async (request, reply) => {
    const parsed = initSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4000', message: parsed.error.flatten() });
    }
    return service.initializeCharacter(parsed.data);
  });

  app.get<{ Params: { characterId: string } }>('/api/v1/foundation/characters/:characterId', async (request) => {
    return service.getCharacter(request.params.characterId);
  });

  app.post('/api/v1/foundation/fortune/adjust', async (request, reply) => {
    const parsed = fortuneSingleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4001', message: parsed.error.flatten() });
    }
    return service.adjustFortune(parsed.data);
  });

  app.post('/api/v1/foundation/fortune/adjust-batch', async (request, reply) => {
    const parsed = fortuneBatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4002', message: parsed.error.flatten() });
    }
    return service.batchAdjustFortune(parsed.data);
  });

  app.post('/api/v1/foundation/monthly-tick', async (request, reply) => {
    const parsed = tickSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4003', message: parsed.error.flatten() });
    }
    return service.monthlyTick(parsed.data);
  });

  app.post('/api/v1/foundation/promotion/validate', async (request, reply) => {
    const parsed = promotionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4004', message: parsed.error.flatten() });
    }
    const character = await service.getCharacter(parsed.data.characterId);
    return service.validatePromotion({
      character,
      queenVacant: parsed.data.queenVacant,
      queenIllOrOutOfFavor: parsed.data.queenIllOrOutOfFavor,
      targetRank: parsed.data.targetRank,
    });
  });

  app.post<{ Body: { characterId: string } }>('/api/v1/foundation/prince-candidate/validate', async (request) => {
    const character = await service.getCharacter(request.body.characterId);
    return service.validateCrownPrinceCandidate(character);
  });

  app.post<{ Body: { characterId: string } }>('/api/v1/foundation/line-clear/rewrite', async (request) => {
    return service.markLineClearRewrite(request.body.characterId);
  });

  app.post('/api/v1/foundation/rollback', async (request, reply) => {
    const parsed = rollbackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4005', message: parsed.error.flatten() });
    }
    return service.rollback(parsed.data.snapshotId, parsed.data.operator);
  });

  app.get('/api/v1/foundation/lanyinxuguo/endings/table', async () => endingValidationTable);

  app.post('/api/v1/foundation/lanyinxuguo/start-template', async (request, reply) => {
    const parsed = lanyinStartSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4007', message: parsed.error.flatten() });
    }
    return createLanyinStartState(parsed.data);
  });

  app.post('/api/v1/foundation/lanyinxuguo/stress-life/tick', async (request, reply) => {
    const parsed = stressLifeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4008', message: parsed.error.flatten() });
    }
    return applyGlobalStressLifeListener(
      {
        stress: parsed.data.stress,
        life: parsed.data.life,
      },
      parsed.data.xunPassed,
    );
  });

  app.post('/api/v1/foundation/lanyinxuguo/npc-madness/check', async (request, reply) => {
    const parsed = npcMadnessSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4009', message: parsed.error.flatten() });
    }
    return applyNpcMadnessCheck(
      {
        npcId: parsed.data.npcId,
        stress: parsed.data.stress,
        isMad: parsed.data.isMad,
        canServeEmperor: parsed.data.canServeEmperor,
      },
      parsed.data.madnessProbability,
      parsed.data.randomValue,
    );
  });

  app.post('/api/v1/foundation/lanyinxuguo/endings/validate', async (request, reply) => {
    const parsed = endingValidateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'FOUNDATION_4010', message: parsed.error.flatten() });
    }
    return validateLanyinEndings(parsed.data);
  });
};
