import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgReferralRepository } from './referral-pg-repository.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');

async function freshDb(): Promise<Queryable> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return pool;
}

const NOW = '2026-07-28T00:00:00.000Z';
const DUE = '2026-07-30T00:00:00.000Z';

describe('PgReferralRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('creates a referral (status raised) and logs the raise event', async () => {
    const repo = new PgReferralRepository(db);
    const r = await repo.create({
      raisedByParentId: 'chw-1',
      category: 'abuse',
      createdAt: NOW,
      dueBy: DUE,
      note: 'disclosed at session',
    });
    expect(r.status).toBe('raised');
    expect(r.category).toBe('abuse');
    const events = await repo.listEvents(r.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.toStatus).toBe('raised');
    expect(events[0]?.note).toBe('disclosed at session');
  });

  it('transitions status, assigns an officer, and appends an ordered audit log', async () => {
    const repo = new PgReferralRepository(db);
    const r = await repo.create({
      raisedByParentId: 'p1',
      category: 'exploitation',
      createdAt: NOW,
      dueBy: DUE,
    });
    await repo.transition(r.id, 'acknowledged', 'cpo-1', '2026-07-28T01:00:00.000Z', undefined, 'cpo-1');
    const actioned = await repo.transition(r.id, 'actioned', 'cpo-1', '2026-07-28T02:00:00.000Z');
    expect(actioned.status).toBe('actioned');
    expect(actioned.assignedOfficerId).toBe('cpo-1'); // COALESCE keeps the assignment

    const events = await repo.listEvents(r.id);
    expect(events.map((e) => e.toStatus)).toEqual(['raised', 'acknowledged', 'actioned']);
  });

  it('lists all referrals and filters by raiser', async () => {
    const repo = new PgReferralRepository(db);
    await repo.create({ raisedByParentId: 'p1', category: 'abuse', createdAt: NOW, dueBy: DUE });
    await repo.create({ raisedByParentId: 'p2', category: 'other', createdAt: NOW, dueBy: DUE });
    expect(await repo.list()).toHaveLength(2);
    expect(await repo.listForParent('p1')).toHaveLength(1);
  });

  it('returns null for an unknown referral', async () => {
    expect(await new PgReferralRepository(db).get('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
