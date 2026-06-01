import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/u;
const ALLOW_METHODS = 'GET,POST,OPTIONS';
const ALLOW_HEADERS = 'Content-Type, Authorization';

const appendVaryHeader = (reply: FastifyReply, headerName: string) => {
  const currentValue = reply.getHeader('Vary');
  if (typeof currentValue !== 'string' || currentValue.length === 0) {
    reply.header('Vary', headerName);
    return;
  }

  if (!currentValue.split(',').map((item) => item.trim()).includes(headerName)) {
    reply.header('Vary', `${currentValue}, ${headerName}`);
  }
};

const applyCorsHeaders = (request: FastifyRequest, reply: FastifyReply): boolean => {
  const origin = request.headers.origin;
  if (!origin || !LOCAL_ORIGIN_PATTERN.test(origin)) {
    return false;
  }

  reply.header('Access-Control-Allow-Origin', origin);
  reply.header('Access-Control-Allow-Methods', ALLOW_METHODS);
  reply.header('Access-Control-Allow-Headers', ALLOW_HEADERS);
  appendVaryHeader(reply, 'Origin');
  return true;
};

export const registerLocalCors = async (app: FastifyInstance) => {
  app.addHook('onRequest', async (request, reply) => {
    const allowed = applyCorsHeaders(request, reply);
    if (request.method === 'OPTIONS' && allowed) {
      await reply.code(204).send();
    }
  });
};
