/**
 * Referral repository (FR-22/23): interface + in-memory implementation.
 *
 * The store keeps referrals and their append-only event log. The domain rules
 * (valid transitions, SLA, overdue) live in the service, so this is a thin
 * persistence seam the Postgres implementation drops into (ADR-0002).
 */

import { randomUUID } from 'node:crypto';
import type {
  Referral,
  ReferralCategory,
  ReferralEvent,
  ReferralStatus,
} from './referral-types.js';

export interface CreateReferralInput {
  raisedByParentId: string;
  category: ReferralCategory;
  createdAt: string;
  dueBy: string;
  note?: string;
}

export interface ReferralRepository {
  create(input: CreateReferralInput): Promise<Referral>;
  get(id: string): Promise<Referral | null>;
  list(): Promise<Referral[]>;
  listForParent(parentId: string): Promise<Referral[]>;
  /** Apply a status change and append its audit event atomically. */
  transition(
    id: string,
    toStatus: ReferralStatus,
    actorId: string,
    at: string,
    note?: string,
    assignedOfficerId?: string,
  ): Promise<Referral>;
  listEvents(referralId: string): Promise<ReferralEvent[]>;
}

export class InMemoryReferralRepository implements ReferralRepository {
  private readonly referrals = new Map<string, Referral>();
  private readonly events: ReferralEvent[] = [];

  async create(input: CreateReferralInput): Promise<Referral> {
    const referral: Referral = {
      id: randomUUID(),
      raisedByParentId: input.raisedByParentId,
      category: input.category,
      status: 'raised',
      createdAt: input.createdAt,
      dueBy: input.dueBy,
      updatedAt: input.createdAt,
    };
    this.referrals.set(referral.id, referral);
    this.events.push({
      id: randomUUID(),
      referralId: referral.id,
      toStatus: 'raised',
      actorId: input.raisedByParentId,
      at: input.createdAt,
      ...(input.note ? { note: input.note } : {}),
    });
    return referral;
  }

  async get(id: string): Promise<Referral | null> {
    return this.referrals.get(id) ?? null;
  }

  async list(): Promise<Referral[]> {
    return [...this.referrals.values()];
  }

  async listForParent(parentId: string): Promise<Referral[]> {
    return [...this.referrals.values()].filter((r) => r.raisedByParentId === parentId);
  }

  async transition(
    id: string,
    toStatus: ReferralStatus,
    actorId: string,
    at: string,
    note?: string,
    assignedOfficerId?: string,
  ): Promise<Referral> {
    const referral = this.referrals.get(id);
    if (!referral) throw new Error(`referral ${id} not found`);
    referral.status = toStatus;
    referral.updatedAt = at;
    if (assignedOfficerId) referral.assignedOfficerId = assignedOfficerId;
    this.events.push({
      id: randomUUID(),
      referralId: id,
      toStatus,
      actorId,
      at,
      ...(note ? { note } : {}),
    });
    return referral;
  }

  async listEvents(referralId: string): Promise<ReferralEvent[]> {
    return this.events
      .filter((e) => e.referralId === referralId)
      .sort((a, b) => a.at.localeCompare(b.at));
  }
}
