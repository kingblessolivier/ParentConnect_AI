/**
 * Nudge routes (plugin).
 *  - Admins: create campaigns, schedule nudges, trigger dispatch.
 *  - Parents: opt out / opt back in (NFR-17).
 *
 * In production a scheduled worker calls the dispatch service directly; the
 * admin dispatch endpoint is for manual/testing triggers.
 */

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import { AppError } from '../../lib/problem.js';
import { authenticate, requireRole } from '../identity/auth.js';
import {
  InMemoryParentRepository,
  type ParentRepository,
} from '../identity/repository.js';
import { AGE_BANDS, LANGUAGES, type AgeBand, type Language } from '../identity/types.js';
import { LogGateway, type MessageGateway } from '../messaging/gateway.js';
import { InMemoryNudgeRepository, type NudgeRepository } from './repository.js';
import { NudgeService } from './service.js';
import type { NudgeChannel } from './types.js';

export interface NudgeOptions {
  config: AppConfig;
  nudgeRepo?: NudgeRepository;
  parentRepo?: ParentRepository;
  gateway?: MessageGateway;
}

export async function nudgeRoutes(app: FastifyInstance, opts: NudgeOptions): Promise<void> {
  const nudgeRepo = opts.nudgeRepo ?? new InMemoryNudgeRepository();
  const parentRepo = opts.parentRepo ?? new InMemoryParentRepository();
  const gateway = opts.gateway ?? new LogGateway();
  const service = new NudgeService(nudgeRepo, parentRepo, gateway, opts.config.phoneEncKey);

  // --- Admin: campaigns & nudges ---
  app.post('/api/v1/admin/campaigns', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    const b = (request.body ?? {}) as Record<string, unknown>;
    if (typeof b.name !== 'string') throw new AppError(400, 'Invalid input', 'name is required');
    if (!AGE_BANDS.includes(b.segmentAgeBand as AgeBand)) {
      throw new AppError(400, 'Invalid input', 'segmentAgeBand must be a valid band');
    }
    if (!LANGUAGES.includes(b.segmentLanguage as Language)) {
      throw new AppError(400, 'Invalid input', 'segmentLanguage must be valid');
    }
    if (b.channel !== 'sms' && b.channel !== 'push') {
      throw new AppError(400, 'Invalid input', "channel must be 'sms' or 'push'");
    }
    const campaign = await service.createCampaign({
      name: b.name,
      segmentAgeBand: b.segmentAgeBand as AgeBand,
      segmentLanguage: b.segmentLanguage as Language,
      channel: b.channel as NudgeChannel,
    });
    reply.code(201);
    return campaign;
  });

  app.get('/api/v1/admin/campaigns', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    return service.listCampaigns();
  });

  app.post('/api/v1/admin/campaigns/:id/nudges', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    const { id } = request.params as { id: string };
    const b = (request.body ?? {}) as { body?: unknown; sendAt?: unknown };
    if (typeof b.body !== 'string') throw new AppError(400, 'Invalid input', 'body is required');
    const sendAtRaw = typeof b.sendAt === 'string' ? b.sendAt : new Date().toISOString();
    const sendAt = new Date(sendAtRaw);
    if (Number.isNaN(sendAt.getTime())) throw new AppError(400, 'Invalid input', 'sendAt is invalid');
    const nudge = await service.addNudge(id, b.body, sendAt.toISOString());
    reply.code(201);
    return nudge;
  });

  app.post('/api/v1/admin/nudges/dispatch', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    return service.dispatchDue();
  });

  // --- Parent: opt out / in (NFR-17) ---
  app.post('/api/v1/nudges/opt-out', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    await service.optOut(ctx.parentId);
    return { optedOut: true };
  });

  app.post('/api/v1/nudges/opt-in', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    await service.optIn(ctx.parentId);
    return { optedOut: false };
  });
}
