import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

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
