/**
 * Content service: authoring drafts, moving them through the approval workflow
 * (FR-20), and serving only published modules to parents (FR-16/19).
 */

import { AppError } from '../../lib/problem.js';
import type { Role } from '../identity/types.js';
import type {
  ContentRepository,
  CreateItemInput,
  PublishedFilter,
  ReviewItem,
} from './repository.js';
import type { ContentStatus, ContentVersion, PublishedModule } from './types.js';
import { assertCanTransition } from './workflow.js';

export interface Actor {
  parentId: string;
  role: Role;
}

export class ContentService {
  constructor(
    private readonly repo: ContentRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async createDraft(input: CreateItemInput): Promise<ContentVersion> {
    if (!input.title?.trim()) throw new AppError(400, 'Invalid input', 'title is required');
    if (!input.body?.trim()) throw new AppError(400, 'Invalid input', 'body is required');
    const { version } = await this.repo.createItemWithDraft(input);
    return version;
  }

  /** Move a version to a new status, enforcing the state machine + role gate. */
  async transition(versionId: string, to: ContentStatus, actor: Actor): Promise<ContentVersion> {
    const version = await this.repo.getVersion(versionId);
    if (!version) throw new AppError(404, 'Not Found', 'content version not found');

    const transition = assertCanTransition(version.status, to, actor.role);

    const updated: ContentVersion = { ...version, status: to };
    if (transition.stamps === 'clinical') updated.clinicalApprovedBy = actor.parentId;
    if (transition.stamps === 'cultural') updated.culturalApprovedBy = actor.parentId;
    if (to === 'published') updated.publishedAt = this.now();

    return this.repo.saveVersion(updated);
  }

  async listPublished(filter: PublishedFilter): Promise<PublishedModule[]> {
    return this.repo.listPublished(filter);
  }

  async getPublishedModule(itemId: string): Promise<PublishedModule> {
    const module = await this.repo.getPublishedModule(itemId);
    if (!module) throw new AppError(404, 'Not Found', 'no published module for this item');
    return module;
  }

  /**
   * The review queue for staff (FR-20). Defaults to items awaiting a decision
   * (in review or approved-but-unpublished); pass explicit statuses to filter.
   */
  async reviewQueue(statuses?: readonly ContentStatus[]): Promise<ReviewItem[]> {
    const wanted = statuses && statuses.length > 0
      ? statuses
      : (['draft', 'clinical_review', 'cultural_review', 'approved'] as ContentStatus[]);
    return this.repo.listByStatus(wanted);
  }
}
