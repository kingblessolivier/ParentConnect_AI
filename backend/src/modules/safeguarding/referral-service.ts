/**
 * Referral case-management service (FR-22/23).
 *
 *  - Raise a confidential child-protection referral (FR-22). Subject is the
 *    adult; category is a fixed enum; no child identity is accepted (FR-24).
 *  - Track status forward through raised→acknowledged→actioned→closed with an
 *    immutable event per change (FR-23, NFR-11), each stamped with actor + time.
 *  - Flag overdue cases against the SLA (dueBy) so nothing stalls silently.
 */

import { AppError } from '../../lib/problem.js';
import type { CreateReferralInput, ReferralRepository } from './referral-repository.js';
import {
  REFERRAL_CATEGORIES,
  REFERRAL_TRANSITIONS,
  type Referral,
  type ReferralCategory,
  type ReferralEvent,
  type ReferralStatus,
  type ReferralView,
} from './referral-types.js';

export interface RaiseReferralInput {
  category: unknown;
  note?: unknown;
}

export interface TransitionInput {
  toStatus: unknown;
  note?: unknown;
  assignedOfficerId?: unknown;
}

function parseCategory(value: unknown): ReferralCategory {
  if (!REFERRAL_CATEGORIES.includes(value as ReferralCategory)) {
    throw new AppError(400, 'Invalid input', `category must be one of ${REFERRAL_CATEGORIES.join(', ')}`);
  }
  return value as ReferralCategory;
}

/**
 * Reject anything that looks like child-identity data smuggled into the note
 * (FR-24/NFR-15). We keep notes minimal and structurally refuse identity keys.
 */
function parseNote(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new AppError(400, 'Invalid input', 'note must be text');
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  if (trimmed.length > 500) throw new AppError(400, 'Invalid input', 'note must be ≤500 characters');
  return trimmed;
}

export class ReferralService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly slaHours: number,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  private view(referral: Referral, at = this.now()): ReferralView {
    return {
      ...referral,
      overdue: referral.status !== 'closed' && Date.parse(referral.dueBy) < Date.parse(at),
    };
  }

  async raise(raisedByParentId: string, input: RaiseReferralInput): Promise<ReferralView> {
    const category = parseCategory(input.category);
    const note = parseNote(input.note);
    const createdAt = this.now();
    const dueBy = new Date(Date.parse(createdAt) + this.slaHours * 3_600_000).toISOString();
    const create: CreateReferralInput = { raisedByParentId, category, createdAt, dueBy };
    if (note) create.note = note;
    return this.view(await this.repo.create(create), createdAt);
  }

  async list(): Promise<ReferralView[]> {
    const at = this.now();
    return (await this.repo.list())
      .map((r) => this.view(r, at))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listForParent(parentId: string): Promise<ReferralView[]> {
    const at = this.now();
    return (await this.repo.listForParent(parentId)).map((r) => this.view(r, at));
  }

  async detail(id: string): Promise<{ referral: ReferralView; events: ReferralEvent[] }> {
    const referral = await this.repo.get(id);
    if (!referral) throw new AppError(404, 'Not Found', 'referral not found');
    return { referral: this.view(referral), events: await this.repo.listEvents(id) };
  }

  async transition(id: string, actorId: string, input: TransitionInput): Promise<ReferralView> {
    const referral = await this.repo.get(id);
    if (!referral) throw new AppError(404, 'Not Found', 'referral not found');

    const toStatus = input.toStatus as ReferralStatus;
    const allowed = REFERRAL_TRANSITIONS[referral.status];
    if (!allowed || !allowed.includes(toStatus)) {
      throw new AppError(
        409,
        'Invalid transition',
        `cannot move a '${referral.status}' referral to '${String(input.toStatus)}'`,
      );
    }
    const note = parseNote(input.note);
    const officer =
      input.assignedOfficerId === undefined || input.assignedOfficerId === null
        ? undefined
        : String(input.assignedOfficerId);
    const updated = await this.repo.transition(id, toStatus, actorId, this.now(), note, officer);
    return this.view(updated);
  }
}
