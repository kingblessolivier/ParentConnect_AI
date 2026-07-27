import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb, type IMemoryDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgConsentRepository, PgOtpRepository, PgParentRepository } from './pg-repository.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');

async function freshDb(): Promise<Queryable> {
  const mem: IMemoryDb = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return pool;
}

function newParent(phoneHash = 'hash-1') {
  return {
    phoneHash,
    preferredLanguage: 'rw' as const,
    preferredChannel: 'sms' as const,
    childBands: ['13_15' as const],
    role: 'parent' as const,
  };
}

describe('runMigrations', () => {
  it('applies migrations once and is idempotent', async () => {
    const mem = newDb();
    const { Pool } = mem.adapters.createPg();
    const pool = new Pool() as unknown as Queryable;
    const first = await runMigrations(pool, MIGRATIONS_DIR);
    expect(first).toContain('0001_identity.sql');
    const second = await runMigrations(pool, MIGRATIONS_DIR);
    expect(second).toEqual([]); // nothing to re-apply
  });
});

describe('PgParentRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('creates and reads a parent (age bands only)', async () => {
    const repo = new PgParentRepository(db);
    const created = await repo.create(newParent());
    expect(created.id).toBeTruthy();
    expect(created.childBands).toEqual(['13_15']);
    expect(await repo.findById(created.id)).toEqual(created);
    expect(await repo.findByPhoneHash('hash-1')).toEqual(created);
    expect(await repo.findByPhoneHash('nope')).toBeNull();
  });

  it('updates provided fields only, keeping id/createdAt', async () => {
    const repo = new PgParentRepository(db);
    const created = await repo.create(newParent());
    const updated = await repo.update(created.id, { district: 'Gasabo', childBands: ['16_19'] });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.district).toBe('Gasabo');
    expect(updated.childBands).toEqual(['16_19']);
    expect(updated.preferredLanguage).toBe('rw');
  });

  it('enforces the unique phone_hash constraint', async () => {
    const repo = new PgParentRepository(db);
    await repo.create(newParent('dup'));
    await expect(repo.create(newParent('dup'))).rejects.toThrow();
  });
});

describe('PgConsentRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('records, lists, and withdraws consent', async () => {
    const parents = new PgParentRepository(db);
    const parent = await parents.create(newParent());
    const consents = new PgConsentRepository(db);

    await consents.record({
      parentId: parent.id,
      purpose: 'coaching',
      language: 'rw',
      method: 'assisted',
      givenAt: '2026-07-27T00:00:00.000Z',
    });
    let list = await consents.listForParent(parent.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.withdrawnAt).toBeUndefined();

    await consents.withdraw(parent.id, 'coaching', '2026-07-28T00:00:00.000Z');
    list = await consents.listForParent(parent.id);
    expect(list[0]?.withdrawnAt).toBeTruthy();
  });
});

describe('PgOtpRepository', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('upserts, reads, and deletes OTP records', async () => {
    const repo = new PgOtpRepository(db);
    await repo.save({ phoneHash: 'h', otpHash: 'o1', expiresAtMs: 1000, attempts: 0 });
    expect(await repo.get('h')).toEqual({ phoneHash: 'h', otpHash: 'o1', expiresAtMs: 1000, attempts: 0 });

    // upsert on conflict (same phone) replaces
    await repo.save({ phoneHash: 'h', otpHash: 'o2', expiresAtMs: 2000, attempts: 2 });
    expect((await repo.get('h'))?.attempts).toBe(2);

    await repo.delete('h');
    expect(await repo.get('h')).toBeNull();
  });
});
