import 'dotenv/config';
import { buildApp } from './app';
import { readEnv } from './config/env';

const start = async () => {
  const env = readEnv();
  if (env.redisUrl.startsWith('memory://')) {
    console.info('[startup] REDIS_URL is memory://; local AI dialogue does not require Redis.');
  }

  const app = await buildApp(env);
  await app.listen({ port: env.port, host: '0.0.0.0' });
};

start().catch((error) => {
  const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (errorCode === 'EADDRINUSE') {
    const env = readEnv();
    console.error(
      `[startup] API port ${env.port} is already in use. Stop the existing API process or set PORT to another value before running npm run dev:api.`,
    );
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});
