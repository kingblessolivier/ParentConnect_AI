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
import type { AiClient } from './modules/coach/ai-client.js';
import { coachRoutes } from './modules/coach/routes.js';
import { contentRoutes } from './modules/content/routes.js';
import type { ContentRepository } from './modules/content/repository.js';
import { identityRoutes } from './modules/identity/routes.js';
import type {
  ConsentRepository,
  OtpRepository,
  ParentRepository,
} from './modules/identity/repository.js';
import type { MessageGateway } from './modules/messaging/gateway.js';
import { nudgeRoutes } from './modules/nudges/routes.js';
import type { NudgeRepository } from './modules/nudges/repository.js';
import { safeguardingRoutes } from './modules/safeguarding/routes.js';
import { sessionRoutes } from './modules/sessions/routes.js';
import type { SessionRepository } from './modules/sessions/repository.js';

export interface AppDeps {
  /** Inject persistent repositories (e.g. Postgres). Defaults to in-memory. */
  identity?: {
    parentRepo: ParentRepository;
    consentRepo: ConsentRepository;
    otpRepo: OtpRepository;
  };
  /** Inject a custom AI client (e.g. a fake in tests). Defaults to HTTP. */
  coach?: {
    aiClient: AiClient;
  };
  /** Inject a persistent content repository. Defaults to in-memory. */
  content?: {
    contentRepo: ContentRepository;
  };
  /** Inject nudge persistence + the shared parent repo + a real gateway. */
  nudges?: {
    nudgeRepo: NudgeRepository;
    parentRepo: ParentRepository;
    gateway?: MessageGateway;
  };
  /** Inject a persistent session repository. Defaults to in-memory. */
  sessions?: {
    sessionRepo: SessionRepository;
  };
}

export async function buildApp(config: AppConfig, deps: AppDeps = {}): Promise<FastifyInstance> {
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
  await app.register(identityRoutes, { config, ...(deps.identity ?? {}) });
  await app.register(coachRoutes, { config, ...(deps.coach ?? {}) });
  await app.register(contentRoutes, { config, ...(deps.content ?? {}) });
  await app.register(nudgeRoutes, { config, ...(deps.nudges ?? {}) });
  await app.register(sessionRoutes, { config, ...(deps.sessions ?? {}) });

  await app.ready();
  return app;
}
