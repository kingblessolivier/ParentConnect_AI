import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { loadConfig } from '../../config.js';
import { signToken } from '../../lib/crypto.js';
import type { AiClient } from './ai-client.js';
import type { AiCoachResult } from './types.js';

const REFERRALS = [{ name: 'Isange One Stop Centre', phone: '123', type: 'one_stop_centre' }];

function makeConfigDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pc-coach-'));
  writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(REFERRALS));
  return dir;
}

const OK: AiCoachResult = {
  answer: 'grounded',
  citations: [],
  safetyFlag: 'none',
  conversationStarters: [],
};

async function appWithAi(aiClient: AiClient): Promise<{ app: FastifyInstance; dir: string; token: string }> {
  const dir = makeConfigDir();
  const config = loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' });
  const app = await buildApp(config, { coach: { aiClient } });
  const token = signToken({ sub: 'p1', role: 'parent', type: 'access' }, config.jwtSecret, 900);
  return { app, dir, token };
}

describe('coach routes', () => {
  let app: FastifyInstance;
  let dir: string;
  let token: string;

  beforeAll(async () => {
    ({ app, dir, token } = await appWithAi({ coach: async () => OK }));
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('creates a conversation', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/conversations', headers: auth() });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBeTruthy();
  });

  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/conversations' });
    expect(res.statusCode).toBe(401);
  });

  it('answers a message via the AI service', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/c1/messages',
      headers: auth(),
      payload: { message: 'when does puberty start?', language: 'en', ageBand: '13_15' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().answer).toBe('grounded');
    expect(res.json().isAi).toBe(true);
  });

  it('rejects an empty message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/c1/messages',
      headers: auth(),
      payload: { message: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid ageBand', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/c1/messages',
      headers: auth(),
      payload: { message: 'hi', ageBand: '9_11' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('coach routes — AI down (NFR-06)', () => {
  it('degrades to referral info + queued when the AI service fails', async () => {
    const { app, dir } = await appWithAi({
      coach: async () => {
        throw new Error('AI unavailable');
      },
    });
    const token = signToken(
      { sub: 'p1', role: 'parent', type: 'access' },
      loadConfig({ NODE_ENV: 'test' }).jwtSecret,
      900,
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/conversations/c1/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'anything', language: 'en' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().degraded).toBe(true);
    expect(res.json().queued).toBe(true);
    expect(res.json().referral).toHaveLength(1);
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
