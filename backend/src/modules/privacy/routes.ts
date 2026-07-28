/**
 * Data-subject rights routes (plugin, NFR-17).
 *
 * The account holder can view/export everything held about them and erase
 * their account (right to be forgotten). Auth is required; a caller only ever
 * acts on their OWN data (NFR-10).
 */

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import { authenticate } from '../identity/auth.js';
import { DataRightsService, type DataRightsDeps } from './service.js';

export interface PrivacyOptions extends DataRightsDeps {
  config: AppConfig;
}

export async function privacyRoutes(app: FastifyInstance, opts: PrivacyOptions): Promise<void> {
  const service = new DataRightsService(opts);

  // View + export the caller's own data (NFR-17). Delivered as a downloadable
  // JSON document so parents (or an assisted CHW) can keep a copy.
  app.get('/api/v1/me/data-export', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    const data = await service.export(ctx.parentId);
    reply.header('content-disposition', 'attachment; filename="my-parentconnect-data.json"');
    return data;
  });

  // Erase the caller's account and personal records (NFR-17). Child-protection
  // referrals are retained (anonymised; safeguarding basis) — see the service.
  app.delete('/api/v1/me', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    return service.erase(ctx.parentId);
  });
}
