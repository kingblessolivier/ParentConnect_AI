import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { newDb } from 'pg-mem';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { signToken } from './lib/crypto.js';
import type { Queryable } from './lib/db.js';
import { runMigrations } from './lib/migrate.js';
import {
  PgConsentRepository,
  PgOtpRepository,
  PgParentRepository,
} from './modules/identity/pg-repository.js';

const VALID = [
  { name: 'Isange One Stop Centre', phone: '123', type: 'one_stop_centre' },
  { name: 'Facility', phone: '9', type: 'health_facility', district: 'Gasabo' },
];

function makeConfigDir(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'pc-app-'));
  writeFileSync(join(dir, 'referral-directory.json'), contents);
  return dir;
}

describe('app', () => {
  let app: FastifyInstance;
  let dir: string;

  beforeAll(async () => {
    dir = makeConfigDir(JSON.stringify(VALID));
    app = await buildApp(loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' }));
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('serves health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('serves the referral directory', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/referral-directory' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  it('filters the directory by district', async () => {
    const res = await app.inject({ url: '/api/v1/referral-directory?district=Nyarugenge' });
    expect(res.json()).toHaveLength(1);
  });

  it('returns problem+json for an unknown route', async () => {
    const res = await app.inject({ url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.json().status).toBe(404);
  });

  it('rejects an invalid query param via schema validation', async () => {
    // district present but empty violates minLength:1 -> 400 problem+json
    const res = await app.inject({ url: '/api/v1/referral-directory?district=' });
    expect(res.statusCode).toBe(400);
    expect(res.json().title).toBe('Validation failed');
    expect(res.headers['content-type']).toContain('application/problem+json');
  });
});

describe('app boot safety', () => {
  it('fails to start when the referral directory is empty (ADR-0010)', async () => {
    const dir = makeConfigDir('[]');
    await expect(buildApp(loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' }))).rejects.toThrow(
      /non-empty/,
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('app with injected Postgres repositories', () => {
  it('wires the pg repositories into the identity routes (end-to-end)', async () => {
    const mem = newDb();
    const { Pool } = mem.adapters.createPg();
    const pool = new Pool() as unknown as Queryable;
    await runMigrations(pool, 'migrations');

    const parentRepo = new PgParentRepository(pool);
    const parent = await parentRepo.create({
      phoneHash: 'wired-hash',
      preferredLanguage: 'rw',
      preferredChannel: 'app',
      childBands: [],
      role: 'parent',
    });

    const dir = makeConfigDir(JSON.stringify(VALID));
    const config = loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' });
    const app = await buildApp(config, {
      identity: {
        parentRepo,
        consentRepo: new PgConsentRepository(pool),
        otpRepo: new PgOtpRepository(pool),
      },
    });

    const token = signToken({ sub: parent.id, role: 'parent', type: 'access' }, config.jwtSecret, 900);
    const res = await app.inject({
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(parent.id);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
