import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { signToken } from '../../lib/crypto.js';
import { loadConfig } from '../../config.js';
import { buildApp } from '../../app.js';
import { InMemoryAuditRepository } from './repository.js';
import { parseAuditQuery } from './routes.js';

function configDirWithDirectory(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pc-audit-'));
  writeFileSync(
    join(dir, 'referral-directory.json'),
    JSON.stringify([{ name: 'Isange One Stop Centre', phone: '[VERIFY]', type: 'one_stop_centre' }]),
  );
  return dir;
}

const config = loadConfig({ CONFIG_DIR: configDirWithDirectory(), NODE_ENV: 'test' });
const adminToken = signToken({ sub: 'admin-1', role: 'admin', type: 'access' }, config.jwtSecret, 900);
const parentToken = signToken({ sub: 'parent-1', role: 'parent', type: 'access' }, config.jwtSecret, 900);

describe('parseAuditQuery', () => {
  it('defaults to a bounded limit', () => {
    expect(parseAuditQuery({}).limit).toBe(100);
  });

  it('rejects an unknown action or entity', () => {
    expect(() => parseAuditQuery({ action: 'nope' })).toThrow();
    expect(() => parseAuditQuery({ entity: 'nope' })).toThrow();
  });

  it('rejects a non-ISO since and an out-of-range limit', () => {
    expect(() => parseAuditQuery({ since: 'yesterday' })).toThrow();
    expect(() => parseAuditQuery({ limit: 0 })).toThrow();
    expect(() => parseAuditQuery({ limit: 5000 })).toThrow();
  });

  it('accepts valid filters', () => {
    const q = parseAuditQuery({ action: 'access.denied', entity: 'route', actorId: 'a1', since: '2026-01-01T00:00:00.000Z', limit: '25' });
    expect(q).toEqual({ action: 'access.denied', entity: 'route', actorId: 'a1', since: '2026-01-01T00:00:00.000Z', limit: 25 });
  });
});

describe('audit routes', () => {
  let app: FastifyInstance;
  let auditRepo: InMemoryAuditRepository;

  beforeAll(async () => {
    auditRepo = new InMemoryAuditRepository();
    app = await buildApp(config, { audit: { auditRepo } });
  });
  afterAll(async () => {
    await app.close();
  });

  it('is admin-only', async () => {
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit',
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(forbidden.statusCode).toBe(403);

    const unauth = await app.inject({ method: 'GET', url: '/api/v1/admin/audit' });
    expect(unauth.statusCode).toBe(401);
  });

  it('returns an empty log before anything auditable happens', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('records a role change made through the identity module (NFR-11)', async () => {
    // Create a real account to act on. Assisted onboarding is used rather than
    // the OTP flow because the code is never returned to a caller by design.
    const chwToken = signToken({ sub: 'chw-1', role: 'chw', type: 'access' }, config.jwtSecret, 900);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/parents',
      headers: { authorization: `Bearer ${chwToken}` },
      payload: { phone: '+250788999222' },
    });
    const targetId = created.json().id as string;

    const changed = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${targetId}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'cpo' },
    });
    expect(changed.statusCode).toBe(200);

    const events = await auditRepo.list({ action: 'user.role_changed' });
    expect(events).toHaveLength(1);
    expect(events[0]?.actorId).toBe('admin-1');
    expect(events[0]?.entityId).toBe(targetId);
    expect(events[0]?.metadata).toEqual({ from: 'parent', to: 'cpo' });
  });

  it('surfaces recorded events through the admin endpoint, newest first', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit?action=user.role_changed',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { action: string }[];
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((e) => e.action === 'user.role_changed')).toBe(true);
  });

  it('rejects a bad filter with 400 problem+json', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit?action=not-a-real-action',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });
});
