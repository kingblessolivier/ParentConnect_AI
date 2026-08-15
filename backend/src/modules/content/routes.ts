/**
 * Content routes (plugin).
 *  - Parents: list & read PUBLISHED modules only (FR-16/19).
 *  - Reviewers/admins: author drafts and drive the approval workflow (FR-20).
 */

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import { AppError } from '../../lib/problem.js';
import type { AuditService } from '../audit/service.js';
import { authenticate, requireRole } from '../identity/auth.js';
import { AGE_BANDS, LANGUAGES, type AgeBand, type Language, type Role } from '../identity/types.js';
import {
  InMemoryContentRepository,
  isContentStatus,
  type ContentRepository,
  type CreateItemInput,
  type PublishedFilter,
} from './repository.js';
import type { ContentStatus } from './types.js';
import { ContentService } from './service.js';
import { CONTENT_TOPICS, type ContentTopic } from './types.js';

export interface ContentOptions {
  config: AppConfig;
  contentRepo?: ContentRepository;
  /** Records editorial decisions to the system-wide audit log (NFR-11). */
  audit?: AuditService;
}

const AUTHOR_ROLES: readonly Role[] = ['reviewer', 'admin'];

function parseFilter(query: Record<string, unknown>): PublishedFilter {
  const filter: PublishedFilter = {};
  if (query.topic !== undefined) {
    if (!CONTENT_TOPICS.includes(query.topic as ContentTopic)) {
      throw new AppError(400, 'Invalid input', 'unknown topic');
    }
    filter.topic = query.topic as ContentTopic;
  }
  if (query.ageBand !== undefined) {
    if (query.ageBand !== 'all' && !AGE_BANDS.includes(query.ageBand as AgeBand)) {
      throw new AppError(400, 'Invalid input', 'unknown ageBand');
    }
    filter.ageBand = query.ageBand as AgeBand | 'all';
  }
  if (query.language !== undefined) {
    if (!LANGUAGES.includes(query.language as Language)) {
      throw new AppError(400, 'Invalid input', 'unknown language');
    }
    filter.language = query.language as Language;
  }
  return filter;
}

function parseDraft(body: Record<string, unknown>): CreateItemInput {
  if (!CONTENT_TOPICS.includes(body.topic as ContentTopic)) {
    throw new AppError(400, 'Invalid input', 'topic is required and must be valid');
  }
  const ageBand = body.ageBand;
  if (ageBand !== 'all' && !AGE_BANDS.includes(ageBand as AgeBand)) {
    throw new AppError(400, 'Invalid input', "ageBand must be a band or 'all'");
  }
  if (!LANGUAGES.includes(body.language as Language)) {
    throw new AppError(400, 'Invalid input', 'language is required and must be valid');
  }
  if (typeof body.title !== 'string') throw new AppError(400, 'Invalid input', 'title is required');
  if (typeof body.body !== 'string') throw new AppError(400, 'Invalid input', 'body is required');

  const input: CreateItemInput = {
    topic: body.topic as ContentTopic,
    ageBand: ageBand as AgeBand | 'all',
    language: body.language as Language,
    title: body.title,
    body: body.body,
  };
  if (typeof body.audioUri === 'string') input.audioUri = body.audioUri;
  if (Array.isArray(body.illustrationUris)) {
    input.illustrationUris = body.illustrationUris.filter((u): u is string => typeof u === 'string');
  }
  return input;
}

export async function contentRoutes(app: FastifyInstance, opts: ContentOptions): Promise<void> {
  const repo = opts.contentRepo ?? new InMemoryContentRepository();
  const service = new ContentService(repo);

  // --- Parent-facing: published content only ---
  app.get('/api/v1/content', async (request) => {
    authenticate(request, opts.config.jwtSecret);
    return service.listPublished(parseFilter((request.query ?? {}) as Record<string, unknown>));
  });

  app.get('/api/v1/content/:itemId', async (request) => {
    authenticate(request, opts.config.jwtSecret);
    const { itemId } = request.params as { itemId: string };
    return service.getPublishedModule(itemId);
  });

  // --- CMS: authoring + approval workflow (FR-20) ---

  // Review queue for reviewers/admins: items awaiting a decision (FR-20).
  // `?status=clinical_review,cultural_review` narrows it; default = all pending.
  app.get('/api/v1/cms/items', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, AUTHOR_ROLES);
    const raw = (request.query as { status?: string }).status;
    const statuses = (raw ? raw.split(',') : [])
      .map((s) => s.trim())
      .filter((s): s is ContentStatus => isContentStatus(s));
    return service.reviewQueue(statuses);
  });

  app.post('/api/v1/cms/items', async (request, reply) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    requireRole(ctx, AUTHOR_ROLES);
    const version = await service.createDraft(
      parseDraft((request.body ?? {}) as Record<string, unknown>),
    );
    reply.code(201);
    return version;
  });

  app.post('/api/v1/cms/versions/:id/transition', async (request) => {
    const ctx = authenticate(request, opts.config.jwtSecret);
    const { id } = request.params as { id: string };
    const { to } = (request.body ?? {}) as { to?: unknown };
    if (!isContentStatus(to)) throw new AppError(400, 'Invalid input', 'to must be a content status');
    // The workflow enforces which roles may perform this specific transition.
    const version = await service.transition(id, to, { parentId: ctx.parentId, role: ctx.role });
    // Clinical/cultural sign-off must be attributable after the fact (NFR-11/23).
    opts.audit?.recordSafely(
      {
        actorId: ctx.parentId,
        actorRole: ctx.role,
        action: 'content.transitioned',
        entity: 'content_version',
        entityId: id,
        metadata: { to },
      },
      (err) => app.log.error({ err }, 'audit write failed: content.transitioned'),
    );
    return version;
  });
}
