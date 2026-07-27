/**
 * Fastify app factory (ADR-0017). Assembles the modular monolith from per-module
 * plugins and installs a single RFC 9457 error handler.
 *
 * `buildApp` awaits `app.ready()` so boot-time safety checks (e.g. a missing or
 * empty referral directory, ADR-0010) fail fast at startup rather than later.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config.js';
import { buildProblemResponse } from './lib/error-handler.js';
import { toProblem } from './lib/problem.js';
import { safeguardingRoutes } from './modules/safeguarding/routes.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.debug ? 'debug' : 'info',
      // Never log PII/P3 (NFR-10/15). Extend as request shapes grow.
      redact: ['req.headers.authorization', 'req.body.phone', 'req.body.otp'],
    },
  });

  // Single problem+json error handler (mapping logic in lib/error-handler.ts).
  app.setErrorHandler((error, request, reply) => {
    const { status, problem } = buildProblemResponse(error, request.url, config.debug);
    // Log unexpected (500) errors server-side; never leak internals (NFR-10).
    if (status >= 500) request.log.error(error);
    reply.code(status).type('application/problem+json').send(problem);
  });

  app.setNotFoundHandler((request, reply) => {
    reply
      .code(404)
      .type('application/problem+json')
      .send(toProblem(404, 'Not Found', `No route for ${request.method} ${request.url}`, request.url));
  });

  // Liveness (not personal data; safe pre-auth).
  app.get('/health', async () => ({ status: 'ok' }));

  // Modules (ADR-0011). Each fails fast if its config is invalid.
  await app.register(safeguardingRoutes, { config });

  await app.ready();
  return app;
}
