/**
 * Child-protection referral types (FR-22/23).
 *
 * A referral's subject is ALWAYS the adult who raised it (a parent/caregiver) —
 * NEVER a child (FR-24/NFR-15). There is no field anywhere here for a child's
 * name, age, or identity. Notes are minimal and treated as P3 (never a place to
 * smuggle child-identity data — enforced by review, data-model.md).
 */

export const REFERRAL_CATEGORIES = [
  'abuse',
  'exploitation',
  'self_harm',
  'pregnancy',
  'other',
] as const;
export type ReferralCategory = (typeof REFERRAL_CATEGORIES)[number];

export const REFERRAL_STATUSES = ['raised', 'acknowledged', 'actioned', 'closed'] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

/**
 * Allowed forward-only status transitions (FR-23). A referral moves
 * raised → acknowledged → actioned → closed; it never moves backward and never
 * skips (so every stage is auditable). A closed referral is terminal.
 */
export const REFERRAL_TRANSITIONS: Readonly<Record<ReferralStatus, readonly ReferralStatus[]>> = {
  raised: ['acknowledged'],
  acknowledged: ['actioned'],
  actioned: ['closed'],
  closed: [],
};

export interface Referral {
  id: string;
  /** The ADULT who raised / is the subject — never a child (FR-24). */
  raisedByParentId: string;
  category: ReferralCategory;
  status: ReferralStatus;
  /** Officer the case is assigned to (a staff actor id), if triaged yet. */
  assignedOfficerId?: string;
  createdAt: string;
  /** SLA deadline: createdAt + config.referralSlaHours (FR-23, D2). */
  dueBy: string;
  updatedAt: string;
}

/** An immutable audit event for each status change (FR-23, NFR-11). */
export interface ReferralEvent {
  id: string;
  referralId: string;
  toStatus: ReferralStatus;
  /** The staff/user id that made the change (audit actor). */
  actorId: string;
  /** Minimal note (P3). Never child identity. */
  note?: string;
  at: string;
}

/** A referral plus a derived `overdue` flag (past dueBy and not yet closed). */
export interface ReferralView extends Referral {
  overdue: boolean;
}
