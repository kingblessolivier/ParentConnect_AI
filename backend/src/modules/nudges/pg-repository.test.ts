import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgParentRepository } from '../identity/pg-repository.js';
import { PgNudgeRepository } from './pg-repository.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');

async function freshDb(): Promise<Queryable> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return pool;
}

describe('PgNudgeRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('creates campaigns and schedules nudges; lists only due ones', async () => {
    const repo = new PgNudgeRepository(db);
    const c = await repo.createCampaign({
      name: 'Tips',
      segmentAgeBand: '13_15',
      segmentLanguage: 'rw',
      channel: 'sms',
    });
    expect((await repo.listCampaigns())).toHaveLength(1);
    expect(await repo.getCampaign(c.id)).not.toBeNull();

    await repo.addNudge(c.id, 'past', '2000-01-01T00:00:00.000Z');
    await repo.addNudge(c.id, 'future', '2999-01-01T00:00:00.000Z');
    const due = await repo.listDue(new Date().toISOString());
    expect(due).toHaveLength(1);
    expect(due[0]?.body).toBe('past');
  });

  it('markDispatched removes a nudge from the due list', async () => {
    const repo = new PgNudgeRepository(db);
    const c = await repo.createCampaign({
      name: 'c',
      segmentAgeBand: '13_15',
      segmentLanguage: 'rw',
      channel: 'sms',
    });
    const n = await repo.addNudge(c.id, 'x', '2000-01-01T00:00:00.000Z');
    await repo.markDispatched(n.id, new Date().toISOString());
    expect(await repo.listDue(new Date().toISOString())).toHaveLength(0);
  });

  it('opt-out is idempotent and reversible', async () => {
    const parents = new PgParentRepository(db);
    const parent = await parents.create({
      phoneHash: 'h',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    const repo = new PgNudgeRepository(db);
    const at = new Date().toISOString();
    await repo.optOut(parent.id, at);
    await repo.optOut(parent.id, at); // idempotent (ON CONFLICT DO NOTHING)
    expect(await repo.isOptedOut(parent.id)).toBe(true);
    await repo.optIn(parent.id);
    expect(await repo.isOptedOut(parent.id)).toBe(false);
  });

  it('findBySegment matches age band + language', async () => {
    const parents = new PgParentRepository(db);
    await parents.create({
      phoneHash: 'h1',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    await parents.create({
      phoneHash: 'h2',
      role: 'parent',
      preferredLanguage: 'en',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    const seg = await parents.findBySegment('13_15', 'rw');
    expect(seg).toHaveLength(1);
    expect(seg[0]?.phoneHash).toBe('h1');
  });
});
