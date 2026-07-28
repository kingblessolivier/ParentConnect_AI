import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { loadConfig } from '../../config.js';
import { signToken } from '../../lib/crypto.js';
import { InMemoryParentRepository } from '../identity/repository.js';
import { InMemoryAssessmentRepository } from './repository.js';

const REFERRALS = [{ name: 'Isange', phone: '123', type: 'one_stop_centre' }];

function makeConfigDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pc-me-'));
  writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(REFERRALS));
  return dir;
}

describe('M&E routes', () => {
  let app: FastifyInstance;
  let dir: string;
  let parents: InMemoryParentRepository;
  let parentToken: string;
  let secondParentToken: string;
  let adminToken: string;

  beforeAll(async () => {
    dir = makeConfigDir();
    const config = loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' });
    parents = new InMemoryParentRepository();
    const p1 = await parents.create({
      phoneHash: 'h1',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
      district: 'Gasabo',
    });
    const p2 = await parents.create({
      phoneHash: 'h2',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['16_19'],
      district: 'Gasabo',
    });
    app = await buildApp(config, {
      me: { assessmentRepo: new InMemoryAssessmentRepository(), parentRepo: parents },
    });
    parentToken = signToken({ sub: p1.id, role: 'parent', type: 'access' }, config.jwtSecret, 900);
    secondParentToken = signToken({ sub: p2.id, role: 'parent', type: 'access' }, config.jwtSecret, 900);
    adminToken = signToken({ sub: 'admin-1', role: 'admin', type: 'access' }, config.jwtSecret, 900);
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

  it('a parent submits baseline + follow-up and sees their own delta', async () => {
    const base = await app.inject({
      method: 'POST',
      url: '/api/v1/assessments/baseline',
      headers: bearer(parentToken),
      payload: { scores: { knowledge: 20, confidence: 20, communication: 20 } },
    });
    expect(base.statusCode).toBe(201);
    expect(base.json().type).toBe('baseline');

    await app.inject({
      method: 'POST',
      url: '/api/v1/assessments/followup',
      headers: bearer(parentToken),
      payload: { scores: { knowledge: 60, confidence: 45, communication: 30 } },
    });

    const mine = await app.inject({ url: '/api/v1/assessments/mine', headers: bearer(parentToken) });
    expect(mine.statusCode).toBe(200);
    expect(mine.json().delta).toEqual({ knowledge: 40, confidence: 25, communication: 10 });
    expect(mine.json().results).toHaveLength(2);
  });

  it('rejects invalid scores (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assessments/baseline',
      headers: bearer(parentToken),
      payload: { scores: { knowledge: 200, confidence: 0, communication: 0 } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('an admin reads disaggregated indicators', async () => {
    // second parent adds a completed pair too
    await app.inject({
      method: 'POST',
      url: '/api/v1/assessments/baseline',
      headers: bearer(secondParentToken),
      payload: { scores: { knowledge: 50, confidence: 50, communication: 50 } },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/assessments/followup',
      headers: bearer(secondParentToken),
      payload: { scores: { knowledge: 60, confidence: 70, communication: 50 } },
    });

    const res = await app.inject({
      url: '/api/v1/dashboards/indicators?by=district',
      headers: bearer(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().dimension).toBe('district');
    const gasabo = res.json().rows.find((r: { group: string }) => r.group === 'Gasabo');
    expect(gasabo.reach).toBe(2);
    // parent1 knowledge +40, parent2 knowledge +10 → mean 25
    expect(gasabo.knowledgeChange).toBe(25);
  });

  it('a parent cannot read the indicators dashboard (403)', async () => {
    const res = await app.inject({
      url: '/api/v1/dashboards/indicators',
      headers: bearer(parentToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects an unknown disaggregation dimension (400)', async () => {
    const res = await app.inject({
      url: '/api/v1/dashboards/indicators?by=age',
      headers: bearer(adminToken),
    });
    expect(res.statusCode).toBe(400);
  });

  it('an admin exports indicators as CSV', async () => {
    const res = await app.inject({
      url: '/api/v1/export/indicators.csv?by=district',
      headers: bearer(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('indicators-district.csv');
    expect(res.body.split('\n')[0]).toBe(
      'district,reach,knowledge_change,confidence_change,communication_change',
    );
  });

  it('requires authentication', async () => {
    const res = await app.inject({ url: '/api/v1/assessments/mine' });
    expect(res.statusCode).toBe(401);
  });
});
