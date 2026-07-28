/**
 * Postgres implementation of the referral repository (ADR-0002).
 *
 * A status change writes the referral row and appends an append-only audit
 * event (FR-23, NFR-11). Repositories use the shared `Queryable` seam so the
 * SQL is exercised against pg-mem in tests and a real pool in production.
 */

import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../lib/db.js';
import type { CreateReferralInput, ReferralRepository } from './referral-repository.js';
import type {
  Referral,
  ReferralCategory,
  ReferralEvent,
  ReferralStatus,
} from './referral-types.js';

interface ReferralRow {
  id: string;
  raised_by_parent_id: string;
  category: ReferralCategory;
  status: ReferralStatus;
  assigned_officer_id: string | null;
  created_at: Date | string;
  due_by: Date | string;
  updated_at: Date | string;
}

interface EventRow {
  id: string;
  referral_id: string;
  to_status: ReferralStatus;
  actor_id: string;
  note: string | null;
  at: Date | string;
}

const iso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : new Date(v).toISOString();

function mapReferral(r: ReferralRow): Referral {
  return {
    id: r.id,
    raisedByParentId: r.raised_by_parent_id,
    category: r.category,
    status: r.status,
    ...(r.assigned_officer_id ? { assignedOfficerId: r.assigned_officer_id } : {}),
    createdAt: iso(r.created_at),
    dueBy: iso(r.due_by),
    updatedAt: iso(r.updated_at),
  };
}

function mapEvent(e: EventRow): ReferralEvent {
  return {
    id: e.id,
    referralId: e.referral_id,
    toStatus: e.to_status,
    actorId: e.actor_id,
    ...(e.note ? { note: e.note } : {}),
    at: iso(e.at),
  };
}

export class PgReferralRepository implements ReferralRepository {
  constructor(private readonly db: Queryable) {}

  private async appendEvent(
    referralId: string,
    toStatus: ReferralStatus,
    actorId: string,
    at: string,
    note?: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO referral_events (id, referral_id, to_status, actor_id, note, at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), referralId, toStatus, actorId, note ?? null, at],
    );
  }

  async create(input: CreateReferralInput): Promise<Referral> {
    const id = randomUUID();
    const r = await this.db.query<ReferralRow>(
      `INSERT INTO referrals (id, raised_by_parent_id, category, status, created_at, due_by, updated_at)
       VALUES ($1,$2,$3,'raised',$4,$5,$4) RETURNING *`,
      [id, input.raisedByParentId, input.category, input.createdAt, input.dueBy],
    );
    await this.appendEvent(id, 'raised', input.raisedByParentId, input.createdAt, input.note);
    return mapReferral(r.rows[0]!);
  }

  async get(id: string): Promise<Referral | null> {
    const r = await this.db.query<ReferralRow>('SELECT * FROM referrals WHERE id = $1', [id]);
    return r.rows[0] ? mapReferral(r.rows[0]) : null;
  }

  async list(): Promise<Referral[]> {
    const r = await this.db.query<ReferralRow>('SELECT * FROM referrals');
    return r.rows.map(mapReferral);
  }

  async listForParent(parentId: string): Promise<Referral[]> {
    const r = await this.db.query<ReferralRow>(
      'SELECT * FROM referrals WHERE raised_by_parent_id = $1',
      [parentId],
    );
    return r.rows.map(mapReferral);
  }

  async transition(
    id: string,
    toStatus: ReferralStatus,
    actorId: string,
    at: string,
    note?: string,
    assignedOfficerId?: string,
  ): Promise<Referral> {
    const r = await this.db.query<ReferralRow>(
      `UPDATE referrals
       SET status = $2, updated_at = $3,
           assigned_officer_id = COALESCE($4, assigned_officer_id)
       WHERE id = $1 RETURNING *`,
      [id, toStatus, at, assignedOfficerId ?? null],
    );
    await this.appendEvent(id, toStatus, actorId, at, note);
    return mapReferral(r.rows[0]!);
  }

  async listEvents(referralId: string): Promise<ReferralEvent[]> {
    const r = await this.db.query<EventRow>(
      'SELECT * FROM referral_events WHERE referral_id = $1 ORDER BY at ASC',
      [referralId],
    );
    return r.rows.map(mapEvent);
  }
}
