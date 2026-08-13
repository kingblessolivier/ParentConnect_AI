import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgDirectoryRepository } from './directory-pg-repository.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');
const AT = '2026-08-01T00:00:00.000Z';

async function freshDb(): Promise<Queryable> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return pool;
}

describe('PgDirectoryRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('starts empty so the file baseline is used until an admin overrides it', async () => {
    expect(await new PgDirectoryRepository(db).list()).toEqual([]);
  });

  it('creates and reads back an entry, keeping the optional district', async () => {
    const repo = new PgDirectoryRepository(db);
    const created = await repo.create(
      { name: 'Gasabo Health Post', phone: '+250780000000', type: 'health_facility', district: 'Gasabo' },
      AT,
    );
    expect(created.id).toBeTruthy();

    const [read] = await repo.list();
    expect(read?.name).toBe('Gasabo Health Post');
    expect(read?.district).toBe('Gasabo');
    expect(read?.updatedAt).toBe(AT);
  });

  it('omits district entirely for a national service', async () => {
    const repo = new PgDirectoryRepository(db);
    await repo.create({ name: 'National Child Helpline', phone: '[VERIFY]', type: 'child_helpline' }, AT);
    const [read] = await repo.list();
    expect(read).not.toHaveProperty('district');
  });

  it('lists alphabetically by name', async () => {
    const repo = new PgDirectoryRepository(db);
    await repo.create({ name: 'Zebra Clinic', phone: '1', type: 'health_facility' }, AT);
    await repo.create({ name: 'Alpha Centre', phone: '2', type: 'one_stop_centre' }, AT);
    expect((await repo.list()).map((e) => e.name)).toEqual(['Alpha Centre', 'Zebra Clinic']);
  });

  it('updates an entry and returns null for an unknown id', async () => {
    const repo = new PgDirectoryRepository(db);
    const created = await repo.create({ name: 'Old', phone: '1', type: 'health_facility' }, AT);
    const updated = await repo.update(created.id, { name: 'New', phone: '2', type: 'child_helpline' }, AT);
    expect(updated?.name).toBe('New');
    expect(await repo.update('missing', { name: 'x', phone: '1', type: 'child_helpline' }, AT)).toBeNull();
  });

  it('removes an entry and reports whether anything was removed', async () => {
    const repo = new PgDirectoryRepository(db);
    const created = await repo.create({ name: 'Temp', phone: '1', type: 'health_facility' }, AT);
    expect(await repo.remove(created.id)).toBe(true);
    expect(await repo.remove(created.id)).toBe(false);
    expect(await repo.list()).toEqual([]);
  });
});
