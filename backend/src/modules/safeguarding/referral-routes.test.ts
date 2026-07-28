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
  const dir = mkdtempSync(join(tmpdir(), 'pc-referrals-'));
  writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(REFERRALS));
  return dir;
}

describe('referral case-management routes', () => {
  let app: FastifyInstance;
  let dir: string;
  let secret: string;
  let parent: string;
  let chw: string;
  let cpo: string;

  beforeAll(async () => {
    dir = makeConfigDir();
    const config = loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' });
    secret = config.jwtSecret;
    app = await buildApp(config); // in-memory referral repo
    parent = signToken({ sub: 'parent-1', role: 'parent', type: 'access' }, secret, 900);
    chw = signToken({ sub: 'chw-1', role: 'chw', type: 'access' }, secret, 900);
    cpo = signToken({ sub: 'cpo-1', role: 'cpo', type: 'access' }, secret, 900);
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

  it('a parent raises a referral (201) and sees it in their own list', async () => {
    const raised = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals',
      headers: bearer(parent),
      payload: { category: 'pregnancy', note: 'disclosed during a session' },
    });
    expect(raised.statusCode).toBe(201);
    expect(raised.json().status).toBe('raised');
    expect(raised.json().overdue).toBe(false);

    const mine = await app.inject({ url: '/api/v1/referrals/mine', headers: bearer(parent) });
    expect(mine.json()).toHaveLength(1);
  });

  it('rejects a referral with an unknown category (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals',
      headers: bearer(chw),
      payload: { category: 'nope' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('a parent cannot read the officer caseload (403)', async () => {
    const res = await app.inject({ url: '/api/v1/referrals', headers: bearer(parent) });
    expect(res.statusCode).toBe(403);
  });

  it('an officer triages a referral through its lifecycle with an audit trail', async () => {
    const raised = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals',
      headers: bearer(chw),
      payload: { category: 'abuse' },
    });
    const id = raised.json().id as string;

    const ack = await app.inject({
      method: 'POST',
      url: `/api/v1/referrals/${id}/transition`,
      headers: bearer(cpo),
      payload: { toStatus: 'acknowledged', assignedOfficerId: 'cpo-1' },
    });
    expect(ack.json().status).toBe('acknowledged');
    expect(ack.json().assignedOfficerId).toBe('cpo-1');

    await app.inject({
      method: 'POST',
      url: `/api/v1/referrals/${id}/transition`,
      headers: bearer(cpo),
      payload: { toStatus: 'actioned' },
    });
    const closed = await app.inject({
      method: 'POST',
      url: `/api/v1/referrals/${id}/transition`,
      headers: bearer(cpo),
      payload: { toStatus: 'closed', note: 'referred to Isange' },
    });
    expect(closed.json().status).toBe('closed');

    const detail = await app.inject({ url: `/api/v1/referrals/${id}`, headers: bearer(cpo) });
    expect(detail.json().events.map((e: { toStatus: string }) => e.toStatus)).toEqual([
      'raised',
      'acknowledged',
      'actioned',
      'closed',
    ]);
  });

  it('rejects an illegal transition (409)', async () => {
    const raised = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals',
      headers: bearer(chw),
      payload: { category: 'self_harm' },
    });
    const id = raised.json().id as string;
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/referrals/${id}/transition`,
      headers: bearer(cpo),
      payload: { toStatus: 'closed' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('requires authentication to raise', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/referrals',
      payload: { category: 'other' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('the referral directory remains available (FR-21, NFR-06)', async () => {
    const res = await app.inject({ url: '/api/v1/referral-directory' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });
});
