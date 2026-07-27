import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgContentRepository } from './pg-repository.js';
import type { CreateItemInput } from './repository.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');

const DRAFT: CreateItemInput = {
  topic: 'consent',
  ageBand: '16_19',
  language: 'en',
  title: 'Consent basics',
  body: 'Approved body',
  audioUri: 's3://audio/x.mp3',
  illustrationUris: ['s3://img/1.png'],
};

async function freshRepo(): Promise<PgContentRepository> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return new PgContentRepository(pool);
}

describe('PgContentRepository', () => {
  let repo: PgContentRepository;
  beforeEach(async () => {
    repo = await freshRepo();
  });

  it('creates an item with a draft version 1', async () => {
    const { item, version } = await repo.createItemWithDraft(DRAFT);
    expect(item.topic).toBe('consent');
    expect(version.status).toBe('draft');
    expect(version.version).toBe(1);
    expect(version.illustrationUris).toEqual(['s3://img/1.png']);
    expect(await repo.getVersion(version.id)).toEqual(version);
  });

  it('does not serve unpublished content, serves it once published', async () => {
    const { item, version } = await repo.createItemWithDraft(DRAFT);
    expect(await repo.listPublished({})).toHaveLength(0);
    expect(await repo.getPublishedModule(item.id)).toBeNull();

    await repo.saveVersion({ ...version, status: 'published', publishedAt: new Date().toISOString() });
    const modules = await repo.listPublished({ topic: 'consent', language: 'en', ageBand: '16_19' });
    expect(modules).toHaveLength(1);
    expect(modules[0]?.audioUri).toBe('s3://audio/x.mp3');
    expect((await repo.getPublishedModule(item.id))?.title).toBe('Consent basics');
  });

  it('saveVersion stamps approvers', async () => {
    const { version } = await repo.createItemWithDraft(DRAFT);
    const saved = await repo.saveVersion({
      ...version,
      status: 'approved',
      clinicalApprovedBy: 'r1',
      culturalApprovedBy: 'r2',
    });
    expect(saved.clinicalApprovedBy).toBe('r1');
    expect(saved.culturalApprovedBy).toBe('r2');
  });
});
