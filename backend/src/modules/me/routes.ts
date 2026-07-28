/**
 * M&E routes (plugin).
 *  - Parents: submit baseline/follow-up assessments, see their own change.
 *  - Admins: disaggregated indicator dashboard + CSV export.
 *
 * Dashboards/exports return only anonymised aggregates (NFR-10/19).
 */

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import { authenticate, requireRole } from '../identity/auth.js';
import { InMemoryParentRepository, type ParentRepository } from '../identity/repository.js';
import { InMemoryAssessmentRepository, type AssessmentRepository } from './repository.js';
import { MeService, parseDimension } from './service.js';
import type { AssessmentType } from './types.js';

export interface MeOptions {
  config: AppConfig;
  assessmentRepo?: AssessmentRepository;
  parentRepo?: ParentRepository;
}

export async function meRoutes(app: FastifyInstance, opts: MeOptions): Promise<void> {
  const assessments = opts.assessmentRepo ?? new InMemoryAssessmentRepository();
  const parents = opts.parentRepo ?? new InMemoryParentRepository();
  const service = new MeService(assessments, parents);

  app.post('/api/v1/assessments/:type', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    const { type } = request.params as { type: AssessmentType };
    const body = (request.body ?? {}) as { scores?: unknown };
    const result = await service.submit(ctx.parentId, type, body.scores);
    reply.code(201);
    return { id: result.id, type: result.type, completedAt: result.completedAt };
  });

  app.get('/api/v1/assessments/mine', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    return service.parentReport(ctx.parentId);
  });

  app.get('/api/v1/dashboards/overview', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    return service.overview();
  });

  app.get('/api/v1/dashboards/indicators', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    const dimension = parseDimension((request.query as { by?: unknown }).by ?? 'district');
    return { dimension, rows: await service.indicators(dimension) };
  });

  app.get('/api/v1/export/indicators.csv', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    const dimension = parseDimension((request.query as { by?: unknown }).by ?? 'district');
    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition', `attachment; filename="indicators-${dimension}.csv"`);
    return service.indicatorsCsv(dimension);
  });
}
