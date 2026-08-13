import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { newDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgAuditRepository } from './pg-repository.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');

async function freshDb(): Promise<Queryable> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return pool;
}

const base = {
  actorId: 'admin-1',
  actorRole: 'admin' as const,
  action: 'user.role_changed' as const,
  entity: 'user' as const,
  entityId: 'u-1',
};

describe('audit migration', () => {
  it('documents the REVOKE hardening step deployment must apply (NFR-11)', () => {
    // Immutability is structural in the repository seam; the database-side
    // belt-and-braces is a provisioning GRANT, so the migration must at least
    // keep telling whoever provisions it that the REVOKE is required.
    const sql = readFileSync(join(MIGRATIONS_DIR, '0008_audit.sql'), 'utf8');
    expect(sql).toMatch(/REVOKE UPDATE, DELETE ON audit_events/);
  });
});

describe('PgAuditRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('appends and reads back an event, including metadata', async () => {
    const repo = new PgAuditRepository(db);
    const created = await repo.append({
      ...base,
      at: '2026-08-01T00:00:00.000Z',
      metadata: { from: 'parent', to: 'cpo' },
    });
    expect(created.id).toBeTruthy();

    const [read] = await repo.list();
    expect(read?.actorId).toBe('admin-1');
    expect(read?.metadata).toEqual({ from: 'parent', to: 'cpo' });
  });

  it('omits metadata entirely when none was recorded', async () => {
    const repo = new PgAuditRepository(db);
    await repo.append({ ...base, at: '2026-08-01T00:00:00.000Z' });
    const [read] = await repo.list();
    expect(read).not.toHaveProperty('metadata');
  });

  it('orders newest first and honours limit', async () => {
    const repo = new PgAuditRepository(db);
    await repo.append({ ...base, entityId: 'old', at: '2026-01-01T00:00:00.000Z' });
    await repo.append({ ...base, entityId: 'new', at: '2026-09-01T00:00:00.000Z' });

    expect((await repo.list()).map((e) => e.entityId)).toEqual(['new', 'old']);
    expect(await repo.list({ limit: 1 })).toHaveLength(1);
  });

  it('filters by action, actor, entity and since', async () => {
    const repo = new PgAuditRepository(db);
    await repo.append({ ...base, at: '2026-01-01T00:00:00.000Z' });
    await repo.append({
      actorId: 'cpo-2',
      actorRole: 'cpo',
      action: 'referral.transitioned',
      entity: 'referral',
      entityId: 'r-1',
      at: '2026-06-01T00:00:00.000Z',
    });

    expect(await repo.list({ action: 'referral.transitioned' })).toHaveLength(1);
    expect(await repo.list({ actorId: 'admin-1' })).toHaveLength(1);
    expect(await repo.list({ entity: 'referral' })).toHaveLength(1);
    expect(await repo.list({ since: '2026-03-01T00:00:00.000Z' })).toHaveLength(1);
  });
});
