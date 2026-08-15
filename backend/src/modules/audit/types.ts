/**
 * System-wide audit log types (NFR-11).
 *
 * Records **who did what to which entity, when** for admin, clinical, and
 * safeguarding actions, plus denied access attempts (security-design.md).
 *
 * Privacy (NFR-10/15): an audit event carries identifiers and an action name —
 * never message content, never a phone number, never anything about a child.
 * `metadata` is a small map of non-identifying scalars (e.g. a status change);
 * the service refuses anything larger so this can't quietly become a PII store.
 */

import type { Role } from '../identity/types.js';

export type AuditAction =
  /** An admin changed another account's role (FR-33). */
  | 'user.role_changed'
  /** Content moved through the editorial workflow (FR-20). */
  | 'content.transitioned'
  /** A child-protection referral changed status (FR-23). */
  | 'referral.transitioned'
  /** The deployment's referral directory was edited (FR-33). */
  | 'referral_directory.updated'
  /** A caller was refused by RBAC — a security signal, not a normal event. */
  | 'access.denied'
  /** A data subject exercised erasure (NFR-17). */
  | 'privacy.erased'
  /** The retention job anonymised or deleted aged records (NFR-19). */
  | 'retention.applied';

export type AuditEntity =
  | 'user'
  | 'content_version'
  | 'referral'
  | 'referral_directory'
  | 'route'
  | 'account'
  | 'retention';

export interface AuditEvent {
  id: string;
  /** The acting account's id (never a name, never a phone). */
  actorId: string;
  actorRole: Role;
  action: AuditAction;
  entity: AuditEntity;
  /** The affected record's id, where one exists. */
  entityId: string;
  at: string;
  /** Small, non-identifying detail — e.g. `{ from: 'draft', to: 'approved' }`. */
  metadata?: Record<string, string>;
}

export interface AuditQuery {
  action?: AuditAction;
  actorId?: string;
  entity?: AuditEntity;
  /** ISO timestamp; events strictly before this are excluded. */
  since?: string;
  limit?: number;
}
