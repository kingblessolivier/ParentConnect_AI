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
  const dir = mkdtempSync(join(tmpdir(), 'pc-sessions-'));
  writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(REFERRALS));
  return dir;
}

describe('session routes', () => {
  let app: FastifyInstance;
  let dir: string;
  let chw: string;
  let parentToken: string;

  beforeAll(async () => {
    dir = makeConfigDir();
    const config = loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' });
    app = await buildApp(config);
    chw = signToken({ sub: 'chw-1', role: 'chw', type: 'access' }, config.jwtSecret, 900);
    parentToken = signToken({ sub: 'parent-1', role: 'parent', type: 'access' }, config.jwtSecret, 900);
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
  const SESSION = { district: 'Gasabo', sector: 'Remera', topic: 'communication', scheduledAt: '2026-08-01T09:00:00.000Z' };

  it('a parent cannot schedule a session (403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: bearer(parentToken),
      payload: SESSION,
    });
    expect(res.statusCode).toBe(403);
  });

  it('facilitator schedules, records attendance (idempotent), and it links to the parent', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: bearer(chw),
      payload: SESSION,
    });
    expect(created.statusCode).toBe(201);
    const sessionId = created.json().id as string;

    const record = (clientId: string) =>
      app.inject({
        method: 'POST',
        url: `/api/v1/sessions/${sessionId}/attendance`,
        headers: bearer(chw),
        payload: { parentId: 'parent-1', clientId },
      });

    const a1 = await record('client-xyz');
    expect(a1.statusCode).toBe(201);
    const a2 = await record('client-xyz'); // replay
    expect(a2.json().id).toBe(a1.json().id); // idempotent

    // the parent sees the session they attended (FR-28)
    const mine = await app.inject({ url: '/api/v1/me/sessions', headers: bearer(parentToken) });
    expect(mine.json()).toHaveLength(1);
    expect(mine.json()[0].id).toBe(sessionId);
  });

  it('facilitator gets a topic guide (FR-26)', async () => {
    const res = await app.inject({ url: '/api/v1/sessions/guide/consent', headers: bearer(chw) });
    expect(res.statusCode).toBe(200);
    expect(res.json().prompts.length).toBeGreaterThan(0);
  });

  it('records a session outcome', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: bearer(chw),
      payload: SESSION,
    });
    const id = created.json().id as string;
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/sessions/${id}/outcome`,
      headers: bearer(chw),
      payload: { notes: '10 parents attended' },
    });
    expect(res.json().outcomeNotes).toBe('10 parents attended');
  });

  it('rejects an invalid topic', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: bearer(chw),
      payload: { ...SESSION, topic: 'nope' },
    });
    expect(res.statusCode).toBe(400);
  });
});
