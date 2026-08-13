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
import { auditRoutes } from './modules/audit/routes.js';
import { InMemoryAuditRepository, type AuditRepository } from './modules/audit/repository.js';
import { AuditService } from './modules/audit/service.js';
import type { AiClient } from './modules/coach/ai-client.js';
import { coachRoutes } from './modules/coach/routes.js';
import { contentRoutes } from './modules/content/routes.js';
import { InMemoryContentRepository, type ContentRepository } from './modules/content/repository.js';
import { feedbackRoutes } from './modules/feedback/routes.js';
import type { FeedbackRepository } from './modules/feedback/repository.js';
import { identityRoutes } from './modules/identity/routes.js';
import {
  InMemoryConsentRepository,
  InMemoryOtpRepository,
  InMemoryParentRepository,
  type ConsentRepository,
  type OtpRepository,
  type ParentRepository,
} from './modules/identity/repository.js';
import { meRoutes } from './modules/me/routes.js';
import { InMemoryAssessmentRepository, type AssessmentRepository } from './modules/me/repository.js';
import type { MessageGateway } from './modules/messaging/gateway.js';
import { nudgeRoutes } from './modules/nudges/routes.js';
import { InMemoryNudgeRepository, type NudgeRepository } from './modules/nudges/repository.js';
import { privacyRoutes } from './modules/privacy/routes.js';
import {
  InMemoryReferralRepository,
  type ReferralRepository,
} from './modules/safeguarding/referral-repository.js';
import { safeguardingRoutes } from './modules/safeguarding/routes.js';
import { sessionRoutes } from './modules/sessions/routes.js';
import { InMemorySessionRepository, type SessionRepository } from './modules/sessions/repository.js';
import { InMemoryFeedbackRepository } from './modules/feedback/repository.js';

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
  /** Inject M&E persistence + the shared parent repo (for aggregates). */
  me?: {
    assessmentRepo: AssessmentRepository;
    parentRepo: ParentRepository;
  };
  /** Inject persistent referral case storage. Defaults to in-memory. */
  safeguarding?: {
    referralRepo: ReferralRepository;
  };
  /** Inject persistent content-feedback storage. Defaults to in-memory. */
  feedback?: {
    feedbackRepo: FeedbackRepository;
  };
  /** Inject persistent audit storage (NFR-11). Defaults to in-memory. */
  audit?: {
    auditRepo: AuditRepository;
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

  // Shared repositories (modular monolith: exactly ONE instance per store, so
  // every module — and the data-export view, NFR-17 — sees the same data). In
  // production these all resolve to the injected Postgres repos over one pool.
  const parentRepo: ParentRepository =
    deps.identity?.parentRepo ?? deps.me?.parentRepo ?? deps.nudges?.parentRepo ?? new InMemoryParentRepository();
  const consentRepo: ConsentRepository = deps.identity?.consentRepo ?? new InMemoryConsentRepository();
  const otpRepo: OtpRepository = deps.identity?.otpRepo ?? new InMemoryOtpRepository();
  const contentRepo: ContentRepository = deps.content?.contentRepo ?? new InMemoryContentRepository();
  const feedbackRepo = deps.feedback?.feedbackRepo ?? new InMemoryFeedbackRepository();
  const assessmentRepo: AssessmentRepository = deps.me?.assessmentRepo ?? new InMemoryAssessmentRepository();
  const referralRepo: ReferralRepository = deps.safeguarding?.referralRepo ?? new InMemoryReferralRepository();
  const sessionRepo: SessionRepository = deps.sessions?.sessionRepo ?? new InMemorySessionRepository();
  const nudgeRepo: NudgeRepository = deps.nudges?.nudgeRepo ?? new InMemoryNudgeRepository();
  const gateway = deps.nudges?.gateway;
  const auditRepo: AuditRepository = deps.audit?.auditRepo ?? new InMemoryAuditRepository();
  // One shared audit writer, injected into every module that performs an
  // audited action (NFR-11). Modules never construct their own.
  const audit = new AuditService(auditRepo);

  // Modules (ADR-0011). Each fails fast if its config is invalid.
  await app.register(safeguardingRoutes, { config, referralRepo, audit });
  await app.register(identityRoutes, { config, parentRepo, consentRepo, otpRepo, audit });
  await app.register(coachRoutes, { config, ...(deps.coach ?? {}) });
  await app.register(contentRoutes, { config, contentRepo, audit });
  await app.register(nudgeRoutes, { config, nudgeRepo, parentRepo, ...(gateway ? { gateway } : {}) });
  await app.register(sessionRoutes, { config, sessionRepo });
  await app.register(meRoutes, { config, assessmentRepo, parentRepo });
  await app.register(feedbackRoutes, { config, contentRepo, feedbackRepo });
  await app.register(privacyRoutes, {
    config,
    parents: parentRepo,
    consents: consentRepo,
    assessments: assessmentRepo,
    feedback: feedbackRepo,
    referrals: referralRepo,
    sessions: sessionRepo,
    audit,
  });
  await app.register(auditRoutes, { config, auditRepo });

  await app.ready();
  return app;
}
