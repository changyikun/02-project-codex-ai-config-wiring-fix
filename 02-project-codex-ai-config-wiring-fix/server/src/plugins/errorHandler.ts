import type { FastifyInstance } from 'fastify';
import { ERROR_CODES, type ErrorEnvelope } from '../types/contracts';

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const message = error instanceof Error ? error.message : '未知服务端错误。';
    const body: ErrorEnvelope = {
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message,
        retryable: false,
      },
    };

    reply.code(500).send(body);
  });
};
