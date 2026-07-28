/**
 * Content feedback service (FR-34).
 *
 * A rating may only target a PUBLISHED module (so parents can't rate drafts or
 * non-existent content), carries an integer 1–5 and an optional short comment,
 * and is anonymous to the parent (never a child, NFR-15). Admins read only
 * aggregates + comments — never who rated what beyond the anonymous parent id.
 */

import { AppError } from '../../lib/problem.js';
import type { ContentRepository } from '../content/repository.js';
import type { FeedbackRepository } from './repository.js';
import { summarise } from './summary.js';
import { MAX_STARS, MIN_STARS, type Rating, type RatingSummary } from './types.js';

/** The slice of the content repo we need: confirm an item is published. */
type PublishedLookup = Pick<ContentRepository, 'getPublishedModule'>;

export interface RateInput {
  stars: unknown;
  comment?: unknown;
}

function parseStars(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < MIN_STARS || raw > MAX_STARS) {
    throw new AppError(400, 'Invalid input', `stars must be an integer ${MIN_STARS}–${MAX_STARS}`);
  }
  return raw;
}

function parseComment(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') throw new AppError(400, 'Invalid input', 'comment must be text');
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (trimmed.length > 500) throw new AppError(400, 'Invalid input', 'comment must be ≤500 characters');
  return trimmed;
}

export class FeedbackService {
  constructor(
    private readonly repo: FeedbackRepository,
    private readonly content: PublishedLookup,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async rate(parentId: string, itemId: string, input: RateInput): Promise<Rating> {
    if (!(await this.content.getPublishedModule(itemId))) {
      throw new AppError(404, 'Not Found', 'no published content with that id');
    }
    const stars = parseStars(input.stars);
    const comment = parseComment(input.comment);
    return this.repo.upsert(itemId, parentId, stars, comment, this.now());
  }

  async myRating(parentId: string, itemId: string): Promise<Rating | null> {
    return this.repo.getForParent(itemId, parentId);
  }

  async summaryForItem(itemId: string): Promise<RatingSummary> {
    return summarise(itemId, await this.repo.listForItem(itemId));
  }

  /** Comments left on an item (admin view, FR-34), newest first. */
  async commentsForItem(itemId: string): Promise<Rating[]> {
    return (await this.repo.listForItem(itemId))
      .filter((r) => r.comment !== undefined)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Per-item aggregates across all rated content (admin dashboard, FR-34). */
  async allSummaries(): Promise<RatingSummary[]> {
    const byItem = new Map<string, Rating[]>();
    for (const r of await this.repo.listAll()) {
      const list = byItem.get(r.itemId) ?? [];
      list.push(r);
      byItem.set(r.itemId, list);
    }
    return [...byItem.entries()]
      .map(([itemId, ratings]) => summarise(itemId, ratings))
      .sort((a, b) => a.itemId.localeCompare(b.itemId));
  }
}
