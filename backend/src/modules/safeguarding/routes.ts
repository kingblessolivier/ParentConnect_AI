/**
 * Safeguarding module routes (plugin). First slice: the referral directory
 * (FR-21). More safeguarding routes (raise/track referrals, FR-22/23) land in
 * a later slice with the database.
 *
 * Module-plugin convention (ADR-0011/0017): each module exports an async
 * Fastify plugin registered by the app factory.
 */

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import {
  filterByDistrict,
  loadReferralDirectory,
  type ReferralContact,
} from './referral-directory.js';

export interface SafeguardingOptions {
  config: AppConfig;
}

export async function safeguardingRoutes(
  app: FastifyInstance,
  opts: SafeguardingOptions,
): Promise<void> {
  // Loaded once at boot. A missing/empty directory throws here, which fails
  // startup — intentional (ADR-0010): never run without a referral pathway.
  const directory: ReferralContact[] = loadReferralDirectory(opts.config.configDir);

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
      // Available regardless of AI/DB state (NFR-06).
      return filterByDistrict(directory, district);
    },
  );
}
