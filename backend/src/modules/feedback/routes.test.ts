import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { loadConfig } from '../../config.js';
import { signToken } from '../../lib/crypto.js';
import { InMemoryContentRepository } from '../content/repository.js';

const REFERRALS = [{ name: 'Isange', phone: '123', type: 'one_stop_centre' }];

function makeConfigDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pc-feedback-'));
  writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(REFERRALS));
  return dir;
}

/** Seed a published module directly (skips the FR-20 workflow for this test). */
async function seedPublished(repo: InMemoryContentRepository): Promise<string> {
  const { item, version } = await repo.createItemWithDraft({
    topic: 'communication',
    ageBand: '13_15',
    language: 'rw',
    title: 'Talking about growing up',
    body: '...',
  });
  await repo.saveVersion({ ...version, status: 'published' });
  return item.id;
}

describe('content feedback routes', () => {
  let app: FastifyInstance;
  let dir: string;
  let itemId: string;
  let parent: string;
  let parent2: string;
  let admin: string;

  beforeAll(async () => {
    dir = makeConfigDir();
    const config = loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' });
    const contentRepo = new InMemoryContentRepository();
    itemId = await seedPublished(contentRepo);
    app = await buildApp(config, { content: { contentRepo } });
    parent = signToken({ sub: 'parent-1', role: 'parent', type: 'access' }, config.jwtSecret, 900);
    parent2 = signToken({ sub: 'parent-2', role: 'parent', type: 'access' }, config.jwtSecret, 900);
    admin = signToken({ sub: 'admin-1', role: 'admin', type: 'access' }, config.jwtSecret, 900);
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

  it('a parent rates a published module (201) and sees their own rating', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/content/${itemId}/ratings`,
      headers: bearer(parent),
      payload: { stars: 4, comment: 'very clear' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().stars).toBe(4);

    const mine = await app.inject({
      url: `/api/v1/content/${itemId}/ratings/mine`,
      headers: bearer(parent),
    });
    expect(mine.json().stars).toBe(4);
  });

  it('404s a rating for content that is not published', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/content/00000000-0000-0000-0000-000000000000/ratings`,
      headers: bearer(parent),
      payload: { stars: 5 },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects invalid stars (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/content/${itemId}/ratings`,
      headers: bearer(parent),
      payload: { stars: 9 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('aggregates ratings and exposes an anonymous summary', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/content/${itemId}/ratings`,
      headers: bearer(parent2),
      payload: { stars: 2, comment: 'needs audio' },
    });
    const res = await app.inject({
      url: `/api/v1/content/${itemId}/ratings/summary`,
      headers: bearer(parent),
    });
    expect(res.json().count).toBe(2); // parent(4) + parent2(2)
    expect(res.json().average).toBe(3);
  });

  it('admin sees the cross-content feedback dashboard with comments', async () => {
    const all = await app.inject({ url: '/api/v1/admin/content-feedback', headers: bearer(admin) });
    expect(all.statusCode).toBe(200);
    expect(all.json()).toHaveLength(1);

    const detail = await app.inject({
      url: `/api/v1/admin/content-feedback/${itemId}`,
      headers: bearer(admin),
    });
    expect(detail.json().summary.count).toBe(2);
    expect(detail.json().comments.map((c: { comment: string }) => c.comment).sort()).toEqual([
      'needs audio',
      'very clear',
    ]);
  });

  it('a parent cannot read the admin dashboard (403)', async () => {
    const res = await app.inject({ url: '/api/v1/admin/content-feedback', headers: bearer(parent) });
    expect(res.statusCode).toBe(403);
  });

  it('requires authentication to rate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/content/${itemId}/ratings`,
      payload: { stars: 5 },
    });
    expect(res.statusCode).toBe(401);
  });
});
