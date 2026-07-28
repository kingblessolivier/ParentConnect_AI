import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { loadConfig } from '../../config.js';
import { signToken } from '../../lib/crypto.js';
import { InMemoryParentRepository } from '../identity/repository.js';

const REFERRALS = [{ name: 'Isange', phone: '123', type: 'one_stop_centre' }];

function makeConfigDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pc-privacy-'));
  writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(REFERRALS));
  return dir;
}

describe('data-subject rights routes (NFR-17)', () => {
  let app: FastifyInstance;
  let dir: string;
  let token: string;
  let parentId: string;

  beforeAll(async () => {
    dir = makeConfigDir();
    const config = loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' });
    // Seed a parent into a shared parent repo, then submit an assessment via
    // the API so the export must read the SAME shared instances (NFR-17).
    const parentRepo = new InMemoryParentRepository();
    const parent = await parentRepo.create({
      phoneHash: 'h1',
      phoneEnc: 'enc1',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
      district: 'Gasabo',
    });
    parentId = parent.id;
    app = await buildApp(config, { identity: { parentRepo } } as never);
    token = signToken({ sub: parentId, role: 'parent', type: 'access' }, config.jwtSecret, 900);
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

  it('requires authentication', async () => {
    const res = await app.inject({ url: '/api/v1/me/data-export' });
    expect(res.statusCode).toBe(401);
  });

  it('exports the caller’s own data as a downloadable document, consistent with live writes', async () => {
    // Write an assessment through the API — the export must reflect it.
    await app.inject({
      method: 'POST',
      url: '/api/v1/assessments/baseline',
      headers: bearer(token),
      payload: { scores: { knowledge: 40, confidence: 30, communication: 20 } },
    });

    const res = await app.inject({ url: '/api/v1/me/data-export', headers: bearer(token) });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toContain('my-parentconnect-data.json');

    const body = res.json();
    expect(body.profile.id).toBe(parentId);
    expect(body.profile).not.toHaveProperty('phoneHash');
    expect(body.profile).not.toHaveProperty('phoneEnc');
    expect(body.assessments).toHaveLength(1); // the write above is visible
    expect(body.assessments[0].scores.knowledge).toBe(40);
  });
});
