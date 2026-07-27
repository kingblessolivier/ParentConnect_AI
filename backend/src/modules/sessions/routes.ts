/**
 * Community-session routes (plugin).
 *  - Facilitators (CHW/champion/admin): schedule, get guides, record attendance
 *    & outcomes (FR-25/26/27).
 *  - Parents: see the sessions they attended (FR-28).
 *
 * Attendance recording is idempotent by clientId, so a facilitator's device can
 * safely replay records captured offline (FR-27, NFR-07).
 */

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import { AppError } from '../../lib/problem.js';
import { authenticate, requireRole } from '../identity/auth.js';
import type { Role } from '../identity/types.js';
import { CONTENT_TOPICS, type ContentTopic } from '../content/types.js';
import { InMemorySessionRepository, type SessionRepository } from './repository.js';
import { SessionService } from './service.js';

export interface SessionOptions {
  config: AppConfig;
  sessionRepo?: SessionRepository;
}

const FACILITATOR_ROLES: readonly Role[] = ['chw', 'champion', 'admin'];

export async function sessionRoutes(app: FastifyInstance, opts: SessionOptions): Promise<void> {
  const repo = opts.sessionRepo ?? new InMemorySessionRepository();
  const service = new SessionService(repo);

  app.post('/api/v1/sessions', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, FACILITATOR_ROLES);
    const b = (request.body ?? {}) as Record<string, unknown>;
    if (!CONTENT_TOPICS.includes(b.topic as ContentTopic)) {
      throw new AppError(400, 'Invalid input', 'topic is required and must be valid');
    }
    if (typeof b.district !== 'string' || typeof b.sector !== 'string') {
      throw new AppError(400, 'Invalid input', 'district and sector are required');
    }
    const scheduledAt = typeof b.scheduledAt === 'string' ? b.scheduledAt : new Date().toISOString();
    const session = await service.schedule({
      facilitatorId: ctx.parentId,
      district: b.district,
      sector: b.sector,
      topic: b.topic as ContentTopic,
      scheduledAt,
    });
    reply.code(201);
    return session;
  });

  app.get('/api/v1/sessions', async (request) => {
    authenticate(request, opts.config.jwtSecret);
    const { district } = (request.query ?? {}) as { district?: string };
    return service.listSessions(district);
  });

  app.get('/api/v1/sessions/guide/:topic', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, FACILITATOR_ROLES);
    const { topic } = request.params as { topic: ContentTopic };
    return service.guide(topic);
  });

  app.post('/api/v1/sessions/:id/attendance', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, FACILITATOR_ROLES);
    const { id } = request.params as { id: string };
    const b = (request.body ?? {}) as { parentId?: unknown; clientId?: unknown };
    if (typeof b.parentId !== 'string') throw new AppError(400, 'Invalid input', 'parentId is required');
    if (typeof b.clientId !== 'string') throw new AppError(400, 'Invalid input', 'clientId is required');
    const attendance = await service.recordAttendance(id, b.parentId, b.clientId);
    reply.code(201);
    return attendance;
  });

  app.post('/api/v1/sessions/:id/outcome', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, FACILITATOR_ROLES);
    const { id } = request.params as { id: string };
    const { notes } = (request.body ?? {}) as { notes?: unknown };
    if (typeof notes !== 'string') throw new AppError(400, 'Invalid input', 'notes is required');
    return service.recordOutcome(id, notes);
  });

  // Parent: the sessions I attended (FR-28).
  app.get('/api/v1/me/sessions', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    return service.listSessionsForParent(ctx.parentId);
  });
}
