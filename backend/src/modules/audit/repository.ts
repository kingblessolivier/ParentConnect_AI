/**
 * Audit repository (NFR-11): interface + in-memory implementation.
 *
 * **Immutability is structural, not a convention.** The interface exposes
 * `append` and reads — there is deliberately no update or delete method, so no
 * caller (including a future one) has a way to rewrite history through this
 * seam. Postgres enforces the same at the table level (migration 0008).
 */

import { randomUUID } from 'node:crypto';
import type { AuditEvent, AuditQuery } from './types.js';

export interface AuditRepository {
  append(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent>;
  list(query?: AuditQuery): Promise<AuditEvent[]>;
}

/** Newest first, then apply the caller's limit. */
export function applyQuery(events: readonly AuditEvent[], query: AuditQuery = {}): AuditEvent[] {
  const filtered = events.filter((e) => {
    if (query.action && e.action !== query.action) return false;
    if (query.actorId && e.actorId !== query.actorId) return false;
    if (query.entity && e.entity !== query.entity) return false;
    if (query.since && e.at < query.since) return false;
    return true;
  });
  filtered.sort((a, b) => b.at.localeCompare(a.at));
  return query.limit === undefined ? filtered : filtered.slice(0, query.limit);
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly events: AuditEvent[] = [];

  async append(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent> {
    const created: AuditEvent = { ...event, id: randomUUID() };
    this.events.push(created);
    return created;
  }

  async list(query: AuditQuery = {}): Promise<AuditEvent[]> {
    return applyQuery(this.events, query);
  }
}
