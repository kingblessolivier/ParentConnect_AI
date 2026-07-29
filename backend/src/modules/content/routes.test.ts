import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { loadConfig } from '../../config.js';
import { signToken } from '../../lib/crypto.js';

const REFERRALS = [{ name: 'Isange', phone: '123', type: 'one_stop_centre' }];

function makeConfigDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pc-content-'));
  writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(REFERRALS));
  return dir;
}

const DRAFT = {
  topic: 'puberty_development',
  ageBand: '13_15',
  language: 'rw',
  title: 'Talking about periods',
  body: 'Approved body',
  audioUri: 's3://audio/1.mp3',
};

describe('content routes', () => {
  let app: FastifyInstance;
  let dir: string;
  let parent: string;
  let reviewer: string;
  let admin: string;

  beforeAll(async () => {
    dir = makeConfigDir();
    const config = loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' });
    app = await buildApp(config);
    const tok = (role: string, sub: string) =>
      signToken({ sub, role, type: 'access' }, config.jwtSecret, 900);
    parent = tok('parent', 'p1');
    reviewer = tok('reviewer', 'r1');
    admin = tok('admin', 'a1');
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

  it('a parent cannot author content (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/items',
      headers: bearer(parent),
      payload: DRAFT,
    });
    expect(res.statusCode).toBe(403);
  });

  it('full workflow: author → review → approve → publish → served to parent', async () => {
    // reviewer authors a draft
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/items',
      headers: bearer(reviewer),
      payload: DRAFT,
    });
    expect(created.statusCode).toBe(201);
    const versionId = created.json().id as string;

    // not served while unapproved
    const empty = await app.inject({ url: '/api/v1/content', headers: bearer(parent) });
    expect(empty.json()).toHaveLength(0);

    const move = (to: string, t: string) =>
      app.inject({
        method: 'POST',
        url: `/api/v1/cms/versions/${versionId}/transition`,
        headers: bearer(t),
        payload: { to },
      });

    expect((await move('clinical_review', reviewer)).statusCode).toBe(200);
    expect((await move('cultural_review', reviewer)).statusCode).toBe(200);
    expect((await move('approved', reviewer)).statusCode).toBe(200);
    // a reviewer may NOT publish — only admin
    expect((await move('published', reviewer)).statusCode).toBe(403);
    expect((await move('published', admin)).statusCode).toBe(200);

    // now served to the parent, with audio
    const listed = await app.inject({ url: '/api/v1/content?language=rw', headers: bearer(parent) });
    expect(listed.json()).toHaveLength(1);
    expect(listed.json()[0].audioUri).toBe('s3://audio/1.mp3');
  });

  it('review queue lists items awaiting a decision, gated to staff (FR-20)', async () => {
    // author a fresh draft that stays in the queue
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/items',
      headers: bearer(reviewer),
      payload: { ...DRAFT, title: 'Queue me' },
    });
    const versionId = created.json().id as string;
    await app.inject({
      method: 'POST',
      url: `/api/v1/cms/versions/${versionId}/transition`,
      headers: bearer(reviewer),
      payload: { to: 'clinical_review' },
    });

    // a parent may not see the review queue
    const forbidden = await app.inject({ url: '/api/v1/cms/items', headers: bearer(parent) });
    expect(forbidden.statusCode).toBe(403);

    // a reviewer sees the queued item, filterable by status
    const queue = await app.inject({
      url: '/api/v1/cms/items?status=clinical_review',
      headers: bearer(reviewer),
    });
    expect(queue.statusCode).toBe(200);
    const mine = queue.json().find((r: { versionId: string }) => r.versionId === versionId);
    expect(mine.status).toBe('clinical_review');
    expect(mine.title).toBe('Queue me');
  });

  it('rejects an illegal transition (400)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/items',
      headers: bearer(reviewer),
      payload: DRAFT,
    });
    const versionId = created.json().id as string;
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/cms/versions/${versionId}/transition`,
      headers: bearer(admin),
      payload: { to: 'published' }, // draft -> published is illegal
    });
    expect(res.statusCode).toBe(400);
  });

  it('content listing requires auth', async () => {
    const res = await app.inject({ url: '/api/v1/content' });
    expect(res.statusCode).toBe(401);
  });
});
