import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgParentRepository } from '../identity/pg-repository.js';
import { PgSessionRepository } from './pg-repository.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');

async function freshDb(): Promise<Queryable> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return pool;
}

async function newParent(db: Queryable, hash: string): Promise<string> {
  const parent = await new PgParentRepository(db).create({
    phoneHash: hash,
    role: 'parent',
    preferredLanguage: 'rw',
    preferredChannel: 'sms',
    childBands: ['13_15'],
  });
  return parent.id;
}

const BASE = {
  facilitatorId: 'chw-1',
  district: 'Gasabo',
  sector: 'Remera',
  topic: 'communication' as const,
  scheduledAt: '2026-08-01T09:00:00.000Z',
};

describe('PgSessionRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('creates sessions, records outcome, filters by district', async () => {
    const repo = new PgSessionRepository(db);
    const s = await repo.createSession(BASE);
    expect(s.topic).toBe('communication');
    const updated = await repo.setOutcome(s.id, 'notes');
    expect(updated.outcomeNotes).toBe('notes');
    await repo.createSession({ ...BASE, district: 'Kicukiro' });
    expect(await repo.listSessions('Gasabo')).toHaveLength(1);
    expect(await repo.listSessions()).toHaveLength(2);
  });

  it('attendance is idempotent on client_id (offline replay, FR-27)', async () => {
    const repo = new PgSessionRepository(db);
    const s = await repo.createSession(BASE);
    const parentId = await newParent(db, 'h1');
    const first = await repo.recordAttendance(s.id, parentId, 'client-1', new Date().toISOString());
    const replay = await repo.recordAttendance(s.id, parentId, 'client-1', new Date().toISOString());
    expect(replay.id).toBe(first.id);
    expect(await repo.listAttendance(s.id)).toHaveLength(1);
  });

  it('links sessions to a parent (FR-28)', async () => {
    const repo = new PgSessionRepository(db);
    const s1 = await repo.createSession(BASE);
    const s2 = await repo.createSession({ ...BASE, topic: 'consent' });
    const parentId = await newParent(db, 'h1');
    await repo.recordAttendance(s1.id, parentId, 'c1', new Date().toISOString());
    await repo.recordAttendance(s2.id, parentId, 'c2', new Date().toISOString());
    expect(await repo.listSessionsForParent(parentId)).toHaveLength(2);
  });
});
