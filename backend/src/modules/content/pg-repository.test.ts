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
  // pg-mem limitation (not a production issue): with the partial index
  // `... (status) WHERE status = 'published'` present, pg-mem wrongly satisfies
  // ANY `status = ?` filter from that index, so it only ever "sees" published
  // rows. Real Postgres is correct. Drop it here so the review-queue query
  // (non-published statuses) is exercised faithfully against the SQL.
  await pool.query('DROP INDEX IF EXISTS content_versions_published_idx');
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

  it('listByStatus returns the review queue joined with item metadata (FR-20)', async () => {
    const a = await repo.createItemWithDraft(DRAFT);
    await repo.saveVersion({ ...a.version, status: 'clinical_review', clinicalApprovedBy: 'r1' });
    const b = await repo.createItemWithDraft({ ...DRAFT, title: 'Still a draft' });

    const inReview = await repo.listByStatus(['clinical_review']);
    expect(inReview).toHaveLength(1);
    expect(inReview[0]?.versionId).toBe(a.version.id);
    expect(inReview[0]?.topic).toBe('consent');
    expect(inReview[0]?.clinicalApprovedBy).toBe('r1');

    const pending = await repo.listByStatus(['draft', 'clinical_review']);
    expect(pending.map((r) => r.versionId).sort()).toEqual([a.version.id, b.version.id].sort());
    expect(await repo.listByStatus([])).toEqual([]);
  });
});
