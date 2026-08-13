import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { signToken } from '../../lib/crypto.js';
import { loadConfig } from '../../config.js';
import { buildApp } from '../../app.js';
import { InMemoryAuditRepository } from '../audit/repository.js';

const BASELINE = [{ name: 'Isange One Stop Centre', phone: '[VERIFY]', type: 'one_stop_centre' }];

function configDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pc-dir-'));
  writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(BASELINE));
  return dir;
}

const config = loadConfig({ CONFIG_DIR: configDir(), NODE_ENV: 'test' });
const admin = signToken({ sub: 'admin-1', role: 'admin', type: 'access' }, config.jwtSecret, 900);
const parent = signToken({ sub: 'parent-1', role: 'parent', type: 'access' }, config.jwtSecret, 900);
const auth = (token: string) => ({ authorization: `Bearer ${token}` });

const CONTACT = {
  name: 'Gasabo Health Post',
  phone: '+250780000000',
  type: 'health_facility',
  district: 'Gasabo',
};

describe('admin referral-directory routes (FR-33)', () => {
  let app: FastifyInstance;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(async () => {
    auditRepo = new InMemoryAuditRepository();
    app = await buildApp(config, { audit: { auditRepo } });
  });
  afterEach(async () => {
    await app.close();
  });

  it('is admin-only', async () => {
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/referral-directory',
      headers: auth(parent),
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it('reports the baseline is in use before any override exists', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/referral-directory',
      headers: auth(admin),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().usingBaseline).toBe(true);
    expect(res.json().entries).toEqual([]);
  });

  it('the public directory serves the file baseline until overridden (ADR-0010)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/referral-directory',
      headers: auth(parent),
    });
    expect(res.json()).toEqual(BASELINE);
  });

  it('an added override replaces the baseline on the public endpoint', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/referral-directory',
      headers: auth(admin),
      payload: CONTACT,
    });
    expect(created.statusCode).toBe(201);

    const publicView = await app.inject({
      method: 'GET',
      url: '/api/v1/referral-directory',
      headers: auth(parent),
    });
    expect(publicView.json()).toEqual([CONTACT]);
  });

  it('district filtering still applies to overrides (FR-21)', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/admin/referral-directory', headers: auth(admin), payload: CONTACT });
    await app.inject({
      method: 'POST',
      url: '/api/v1/admin/referral-directory',
      headers: auth(admin),
      payload: { name: 'National Child Helpline', phone: '[VERIFY]', type: 'child_helpline' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/referral-directory?district=Gasabo',
      headers: auth(parent),
    });
    const names = (res.json() as { name: string }[]).map((c) => c.name);
    // National services are always included; other districts are not.
    expect(names).toContain('National Child Helpline');
    expect(names).toContain('Gasabo Health Post');
  });

  it('removing the last override falls back to the baseline rather than leaving nothing (NFR-06)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/referral-directory',
      headers: auth(admin),
      payload: CONTACT,
    });
    const { id } = created.json() as { id: string };

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/referral-directory/${id}`,
      headers: auth(admin),
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().usingBaseline).toBe(true);

    const publicView = await app.inject({
      method: 'GET',
      url: '/api/v1/referral-directory',
      headers: auth(parent),
    });
    expect(publicView.json()).toEqual(BASELINE);
  });

  it('rejects an invalid contact with 400 problem+json', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/referral-directory',
      headers: auth(admin),
      payload: { name: '', phone: '1', type: 'child_helpline' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });

  it('404s an update or delete for an unknown id', async () => {
    const update = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/referral-directory/missing',
      headers: auth(admin),
      payload: CONTACT,
    });
    expect(update.statusCode).toBe(404);

    const remove = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/referral-directory/missing',
      headers: auth(admin),
    });
    expect(remove.statusCode).toBe(404);
  });

  it('audits every directory change (NFR-11)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/referral-directory',
      headers: auth(admin),
      payload: CONTACT,
    });
    const { id } = created.json() as { id: string };
    await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/referral-directory/${id}`,
      headers: auth(admin),
      payload: { ...CONTACT, phone: '+250789999999' },
    });
    await app.inject({ method: 'DELETE', url: `/api/v1/admin/referral-directory/${id}`, headers: auth(admin) });

    const events = await auditRepo.list({ action: 'referral_directory.updated' });
    expect(events.map((e) => e.metadata?.change).sort()).toEqual(['created', 'removed', 'updated']);
    expect(events.every((e) => e.actorId === 'admin-1')).toBe(true);
  });
});
