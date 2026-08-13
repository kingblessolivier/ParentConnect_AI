/**
 * Audit routes (NFR-11). Admin-only, read-only.
 *
 * There is deliberately no write endpoint: events are recorded by the modules
 * that perform the audited action, never submitted by a client. And there is no
 * delete endpoint — the log is append-only end to end (security-design.md).
 */

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import { AppError } from '../../lib/problem.js';
import { authenticate, requireRole } from '../identity/auth.js';
import { InMemoryAuditRepository, type AuditRepository } from './repository.js';
import { AuditService } from './service.js';
import type { AuditAction, AuditEntity, AuditQuery } from './types.js';

export interface AuditOptions {
  config: AppConfig;
  auditRepo?: AuditRepository;
}

const ACTIONS: readonly AuditAction[] = [
  'user.role_changed',
  'content.transitioned',
  'referral.transitioned',
  'referral_directory.updated',
  'access.denied',
  'privacy.erased',
  'retention.applied',
];

const ENTITIES: readonly AuditEntity[] = [
  'user',
  'content_version',
  'referral',
  'referral_directory',
  'route',
  'account',
  'retention',
];

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

export function parseAuditQuery(raw: Record<string, unknown>): AuditQuery {
  const query: AuditQuery = { limit: DEFAULT_LIMIT };

  if (raw.action !== undefined) {
    if (!ACTIONS.includes(raw.action as AuditAction)) {
      throw new AppError(400, 'Invalid input', `action must be one of ${ACTIONS.join(', ')}`);
    }
    query.action = raw.action as AuditAction;
  }
  if (raw.entity !== undefined) {
    if (!ENTITIES.includes(raw.entity as AuditEntity)) {
      throw new AppError(400, 'Invalid input', `entity must be one of ${ENTITIES.join(', ')}`);
    }
    query.entity = raw.entity as AuditEntity;
  }
  if (raw.actorId !== undefined) {
    if (typeof raw.actorId !== 'string') throw new AppError(400, 'Invalid input', 'actorId must be a string');
    query.actorId = raw.actorId;
  }
  if (raw.since !== undefined) {
    if (typeof raw.since !== 'string' || Number.isNaN(Date.parse(raw.since))) {
      throw new AppError(400, 'Invalid input', 'since must be an ISO timestamp');
    }
    query.since = raw.since;
  }
  if (raw.limit !== undefined) {
    const limit = Number(raw.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new AppError(400, 'Invalid input', `limit must be an integer 1–${MAX_LIMIT}`);
    }
    query.limit = limit;
  }
  return query;
}

export async function auditRoutes(app: FastifyInstance, opts: AuditOptions): Promise<void> {
  const repo = opts.auditRepo ?? new InMemoryAuditRepository();
  const service = new AuditService(repo);

  app.get('/api/v1/admin/audit', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    const query = parseAuditQuery((request.query ?? {}) as Record<string, unknown>);
    return service.list(query);
  });
}
