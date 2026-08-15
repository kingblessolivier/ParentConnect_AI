/**
 * Safeguarding module routes (plugin):
 *  - the referral **directory** (FR-21) — always available, no AI/DB dependency;
 *  - child-protection referral **case management** (FR-22/23) — raise a
 *    confidential referral and track it forward through its lifecycle.
 *
 * Module-plugin convention (ADR-0011/0017): each module exports an async
 * Fastify plugin registered by the app factory.
 */

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import type { AuditService } from '../audit/service.js';
import { authenticate, requireRole } from '../identity/auth.js';
import type { Role } from '../identity/types.js';
import { InMemoryDirectoryRepository, type DirectoryRepository } from './directory-repository.js';
import { DirectoryService } from './directory-service.js';
import {
  filterByDistrict,
  loadReferralDirectory,
  type ReferralContact,
} from './referral-directory.js';
import { InMemoryReferralRepository, type ReferralRepository } from './referral-repository.js';
import { ReferralService } from './referral-service.js';

export interface SafeguardingOptions {
  config: AppConfig;
  /** Inject persistent referral storage. Defaults to in-memory. */
  referralRepo?: ReferralRepository;
  /** Inject persistent directory-override storage (FR-33). Defaults to in-memory. */
  directoryRepo?: DirectoryRepository;
  /** Mirrors status changes into the system-wide audit log (NFR-11). */
  audit?: AuditService;
}

// Who may raise a confidential referral (FR-22) and who may triage/track it
// (FR-23). No other role can read individual referral records (NFR-10).
const RAISER_ROLES = ['parent', 'chw', 'champion', 'cpo', 'admin'] as const;
const OFFICER_ROLES = ['cpo', 'admin'] as const;

export async function safeguardingRoutes(
  app: FastifyInstance,
  opts: SafeguardingOptions,
): Promise<void> {
  // Loaded once at boot. A missing/empty directory throws here, which fails
  // startup — intentional (ADR-0010): never run without a referral pathway.
  const baseline: ReferralContact[] = loadReferralDirectory(opts.config.configDir);

  const referrals = new ReferralService(
    opts.referralRepo ?? new InMemoryReferralRepository(),
    opts.config.referralSlaHours,
  );

  const directoryService = new DirectoryService(
    opts.directoryRepo ?? new InMemoryDirectoryRepository(),
    baseline,
    (err) => app.log.error({ err }, 'referral directory storage unavailable; serving file baseline'),
  );

  app.get(
    '/api/v1/referral-directory',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: { district: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request) => {
      const { district } = request.query as { district?: string };
      // Admin overrides when present, file baseline otherwise — and the
      // baseline again if storage is down, so this endpoint keeps working
      // regardless of AI/DB state (NFR-06).
      return filterByDistrict(await directoryService.effective(), district);
    },
  );

  // --- Admin: edit the directory without a redeploy (FR-33) ---

  app.get('/api/v1/admin/referral-directory', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    return directoryService.listForAdmin();
  });

  app.post('/api/v1/admin/referral-directory', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    const entry = await directoryService.create(request.body, new Date().toISOString());
    auditDirectory(ctx, 'created', entry.id);
    reply.code(201);
    return entry;
  });

  app.put('/api/v1/admin/referral-directory/:id', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    const { id } = request.params as { id: string };
    const entry = await directoryService.update(id, request.body, new Date().toISOString());
    auditDirectory(ctx, 'updated', id);
    return entry;
  });

  app.delete('/api/v1/admin/referral-directory/:id', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    const { id } = request.params as { id: string };
    await directoryService.remove(id);
    auditDirectory(ctx, 'removed', id);
    // Removing the last override is safe: the file baseline takes over.
    return { removed: true, usingBaseline: (await directoryService.listForAdmin()).usingBaseline };
  });

  function auditDirectory(ctx: { parentId: string; role: Role }, change: string, id: string): void {
    opts.audit?.recordSafely(
      {
        actorId: ctx.parentId,
        actorRole: ctx.role,
        action: 'referral_directory.updated',
        entity: 'referral_directory',
        entityId: id,
        metadata: { change },
      },
      (err) => app.log.error({ err }, 'audit write failed: referral_directory.updated'),
    );
  }

  // Raise a confidential child-protection referral (FR-22). Subject is the
  // adult; no child identity is ever accepted (FR-24, enforced in the service).
  app.post('/api/v1/referrals', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, RAISER_ROLES);
    const body = (request.body ?? {}) as { category?: unknown; note?: unknown };
    const view = await referrals.raise(ctx.parentId, { category: body.category, note: body.note });
    reply.code(201);
    return view;
  });

  // A raiser sees the status of referrals they raised (FR-23 visibility).
  app.get('/api/v1/referrals/mine', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, RAISER_ROLES);
    return referrals.listForParent(ctx.parentId);
  });

  // Officers see the full caseload with overdue flags (FR-23, SLA).
  app.get('/api/v1/referrals', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, OFFICER_ROLES);
    return referrals.list();
  });

  app.get('/api/v1/referrals/:id', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, OFFICER_ROLES);
    const { id } = request.params as { id: string };
    return referrals.detail(id);
  });

  // Advance a referral's status (raised→acknowledged→actioned→closed, FR-23).
  // Each change is an immutable audit event stamped with the acting officer.
  app.post('/api/v1/referrals/:id/transition', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, OFFICER_ROLES);
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as {
      toStatus?: unknown;
      note?: unknown;
      assignedOfficerId?: unknown;
    };
    const updated = await referrals.transition(id, ctx.parentId, {
      toStatus: body.toStatus,
      note: body.note,
      assignedOfficerId: body.assignedOfficerId,
    });
    // Also mirrored into the system-wide log so a CPO's actions are visible in
    // one place alongside admin/clinical events (NFR-11). The note is NOT
    // copied — it may describe a disclosure (NFR-10/15).
    opts.audit?.recordSafely(
      {
        actorId: ctx.parentId,
        actorRole: ctx.role,
        action: 'referral.transitioned',
        entity: 'referral',
        entityId: id,
        metadata: { to: updated.status },
      },
      (err) => app.log.error({ err }, 'audit write failed: referral.transitioned'),
    );
    return updated;
  });
}
