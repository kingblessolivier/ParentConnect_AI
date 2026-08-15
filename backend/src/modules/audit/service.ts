/**
 * Audit service (NFR-11).
 *
 * The single place audit events are written. It sanitises metadata before it
 * reaches storage so the audit trail can't drift into being a PII store:
 * sensitive keys are redacted (`lib/redact.ts`), values are coerced to short
 * strings, and the map is capped. An audit record answers *who/what/when*, not
 * *what was said* (NFR-10/15).
 *
 * Recording must never break the action being audited — a failing audit write
 * is logged by the caller's error path, not surfaced to the user mid-referral.
 * Callers therefore use `record()` (fire-and-forget-safe) rather than awaiting
 * a throw.
 */

import { redactObject } from '../../lib/redact.js';
import type { AuditRepository } from './repository.js';
import type { AuditAction, AuditEntity, AuditEvent, AuditQuery } from './types.js';
import type { Role } from '../identity/types.js';

/** Metadata guards: enough for context, too small to smuggle a payload. */
const MAX_KEYS = 8;
const MAX_VALUE_LENGTH = 120;

export function sanitiseMetadata(raw: Record<string, unknown> | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  const redacted = redactObject(raw);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(redacted).slice(0, MAX_KEYS)) {
    if (value === undefined || value === null) continue;
    out[key] = String(value).slice(0, MAX_VALUE_LENGTH);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export interface RecordInput {
  actorId: string;
  actorRole: Role;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  metadata?: Record<string, unknown>;
  /** Overridable for deterministic tests. */
  at?: string;
}

export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async record(input: RecordInput): Promise<AuditEvent> {
    const metadata = sanitiseMetadata(input.metadata);
    return this.repo.append({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      at: input.at ?? new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    });
  }

  /**
   * Record without letting an audit failure break the audited action. The
   * caller has already done the thing; losing the log line is bad, but failing
   * a child-protection transition because the audit table hiccuped is worse.
   */
  recordSafely(input: RecordInput, onError?: (err: unknown) => void): void {
    this.record(input).catch((err) => onError?.(err));
  }

  async list(query: AuditQuery = {}): Promise<AuditEvent[]> {
    return this.repo.list(query);
  }
}
