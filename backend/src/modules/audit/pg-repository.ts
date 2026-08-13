/**
 * Postgres implementation of the audit repository (ADR-0002, NFR-11).
 *
 * Insert-and-read only — matching the interface, and matching the DO INSTEAD
 * NOTHING rules on the table (migration 0008). Filters are built from a fixed
 * whitelist of columns; nothing dynamic comes from user input.
 */

import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../lib/db.js';
import type { AuditRepository } from './repository.js';
import type { AuditAction, AuditEntity, AuditEvent, AuditQuery } from './types.js';
import type { Role } from '../identity/types.js';

interface AuditRow {
  id: string;
  actor_id: string;
  actor_role: Role;
  action: AuditAction;
  entity: AuditEntity;
  entity_id: string;
  at: Date | string;
  metadata: Record<string, string> | null;
}

const iso = (v: Date | string): string =>
  v instanceof Date ? v.toISOString() : new Date(v).toISOString();

function mapEvent(row: AuditRow): AuditEvent {
  const event: AuditEvent = {
    id: row.id,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    at: iso(row.at),
  };
  if (row.metadata && Object.keys(row.metadata).length > 0) event.metadata = row.metadata;
  return event;
}

export class PgAuditRepository implements AuditRepository {
  constructor(private readonly db: Queryable) {}

  async append(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent> {
    const id = randomUUID();
    const r = await this.db.query<AuditRow>(
      `INSERT INTO audit_events (id, actor_id, actor_role, action, entity, entity_id, at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        id,
        event.actorId,
        event.actorRole,
        event.action,
        event.entity,
        event.entityId,
        event.at,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ],
    );
    return mapEvent(r.rows[0]!);
  }

  async list(query: AuditQuery = {}): Promise<AuditEvent[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, value: unknown): void => {
      values.push(value);
      clauses.push(`${sql} $${values.length}`);
    };
    if (query.action) add('action =', query.action);
    if (query.actorId) add('actor_id =', query.actorId);
    if (query.entity) add('entity =', query.entity);
    if (query.since) add('at >=', query.since);

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    let sql = `SELECT * FROM audit_events ${where} ORDER BY at DESC`;
    if (query.limit !== undefined) {
      values.push(query.limit);
      sql += ` LIMIT $${values.length}`;
    }
    const r = await this.db.query<AuditRow>(sql, values);
    return r.rows.map(mapEvent);
  }
}
