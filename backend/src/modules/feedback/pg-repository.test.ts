import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgFeedbackRepository } from './pg-repository.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');
const ITEM = '11111111-1111-1111-1111-111111111111';
const NOW = '2026-07-28T00:00:00.000Z';

async function freshDb(): Promise<Queryable> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return pool;
}

describe('PgFeedbackRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('inserts a rating and reads it back for the parent', async () => {
    const repo = new PgFeedbackRepository(db);
    const r = await repo.upsert(ITEM, 'p1', 4, 'clear', NOW);
    expect(r.stars).toBe(4);
    expect(r.comment).toBe('clear');
    const mine = await repo.getForParent(ITEM, 'p1');
    expect(mine?.stars).toBe(4);
  });

  it('upserts on (item, parent): resubmitting replaces stars and clears comment', async () => {
    const repo = new PgFeedbackRepository(db);
    await repo.upsert(ITEM, 'p1', 2, 'meh', NOW);
    await repo.upsert(ITEM, 'p1', 5, undefined, '2026-07-28T01:00:00.000Z');
    const listed = await repo.listForItem(ITEM);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.stars).toBe(5);
    expect(listed[0]?.comment).toBeUndefined();
  });

  it('lists all ratings across items', async () => {
    const repo = new PgFeedbackRepository(db);
    const other = '22222222-2222-2222-2222-222222222222';
    await repo.upsert(ITEM, 'p1', 5, undefined, NOW);
    await repo.upsert(ITEM, 'p2', 3, undefined, NOW);
    await repo.upsert(other, 'p1', 4, undefined, NOW);
    expect(await repo.listAll()).toHaveLength(3);
    expect(await repo.listForItem(ITEM)).toHaveLength(2);
  });

  it('returns null when the parent has not rated the item', async () => {
    expect(await new PgFeedbackRepository(db).getForParent(ITEM, 'nobody')).toBeNull();
  });
});
