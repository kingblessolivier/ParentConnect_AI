/**
 * Content feedback routes (plugin, FR-34).
 *  - Any authenticated user (typically a parent) rates a published module and
 *    reads its aggregate score.
 *  - Admins read the cross-content feedback dashboard (aggregates + comments).
 *
 * Ratings target only PUBLISHED content (enforced in the service) and expose
 * only anonymous aggregates outside the rater's own row (NFR-10/15).
 */

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import { authenticate, requireRole } from '../identity/auth.js';
import { InMemoryContentRepository, type ContentRepository } from '../content/repository.js';
import { InMemoryFeedbackRepository, type FeedbackRepository } from './repository.js';
import { FeedbackService } from './service.js';

export interface FeedbackOptions {
  config: AppConfig;
  feedbackRepo?: FeedbackRepository;
  /** Shared content repo, so ratings can only target published items. */
  contentRepo?: ContentRepository;
}

export async function feedbackRoutes(app: FastifyInstance, opts: FeedbackOptions): Promise<void> {
  const feedback = opts.feedbackRepo ?? new InMemoryFeedbackRepository();
  const content = opts.contentRepo ?? new InMemoryContentRepository();
  const service = new FeedbackService(feedback, content);

  // Rate a published module (FR-34). Upsert: one rating per parent per item.
  app.post('/api/v1/content/:itemId/ratings', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    const { itemId } = request.params as { itemId: string };
    const body = (request.body ?? {}) as { stars?: unknown; comment?: unknown };
    const rating = await service.rate(ctx.parentId, itemId, {
      stars: body.stars,
      comment: body.comment,
    });
    reply.code(201);
    return rating;
  });

  // A parent sees their own rating for an item.
  app.get('/api/v1/content/:itemId/ratings/mine', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    const { itemId } = request.params as { itemId: string };
    return service.myRating(ctx.parentId, itemId);
  });

  // Aggregate score for an item — anonymous, safe for any authenticated user.
  app.get('/api/v1/content/:itemId/ratings/summary', async (request) => {
    authenticate(request, opts.config.jwtSecret);
    const { itemId } = request.params as { itemId: string };
    return service.summaryForItem(itemId);
  });

  // Admin feedback dashboard: aggregates across all rated content.
  app.get('/api/v1/admin/content-feedback', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    return service.allSummaries();
  });

  // Admin drill-down: one item's aggregate + its comments.
  app.get('/api/v1/admin/content-feedback/:itemId', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, ['admin']);
    const { itemId } = request.params as { itemId: string };
    return {
      summary: await service.summaryForItem(itemId),
      comments: await service.commentsForItem(itemId),
    };
  });
}
