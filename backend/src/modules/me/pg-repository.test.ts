import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgParentRepository } from '../identity/pg-repository.js';
import { PgAssessmentRepository } from './pg-repository.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');

async function freshDb(): Promise<Queryable> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return pool;
}

async function newParent(db: Queryable, hash: string, district?: string): Promise<string> {
  const parent = await new PgParentRepository(db).create({
    phoneHash: hash,
    role: 'parent',
    preferredLanguage: 'rw',
    preferredChannel: 'sms',
    childBands: ['13_15'],
    ...(district ? { district } : {}),
  });
  return parent.id;
}

describe('PgAssessmentRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('stores a baseline and lists it for the parent', async () => {
    const repo = new PgAssessmentRepository(db);
    const parentId = await newParent(db, 'h1');
    const r = await repo.upsert(parentId, 'baseline', {
      knowledge: 30,
      confidence: 40,
      communication: 50,
    });
    expect(r.type).toBe('baseline');
    expect(r.scores).toEqual({ knowledge: 30, confidence: 40, communication: 50 });
    const listed = await repo.listForParent(parentId);
    expect(listed).toHaveLength(1);
  });

  it('upserts on (parent, type): resubmitting replaces the row', async () => {
    const repo = new PgAssessmentRepository(db);
    const parentId = await newParent(db, 'h1');
    await repo.upsert(parentId, 'baseline', { knowledge: 10, confidence: 10, communication: 10 });
    await repo.upsert(parentId, 'baseline', { knowledge: 90, confidence: 90, communication: 90 });
    const listed = await repo.listForParent(parentId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.scores.knowledge).toBe(90);
  });

  it('keeps baseline and follow-up as separate rows', async () => {
    const repo = new PgAssessmentRepository(db);
    const parentId = await newParent(db, 'h1');
    await repo.upsert(parentId, 'baseline', { knowledge: 20, confidence: 20, communication: 20 });
    await repo.upsert(parentId, 'followup', { knowledge: 60, confidence: 40, communication: 30 });
    expect(await repo.listForParent(parentId)).toHaveLength(2);
  });

  it('listAll returns every parent’s assessments', async () => {
    const repo = new PgAssessmentRepository(db);
    const p1 = await newParent(db, 'h1', 'Gasabo');
    const p2 = await newParent(db, 'h2', 'Kicukiro');
    await repo.upsert(p1, 'baseline', { knowledge: 20, confidence: 20, communication: 20 });
    await repo.upsert(p2, 'baseline', { knowledge: 30, confidence: 30, communication: 30 });
    expect(await repo.listAll()).toHaveLength(2);
  });
});
