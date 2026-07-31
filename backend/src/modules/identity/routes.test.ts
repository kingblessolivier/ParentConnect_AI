import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { buildProblemResponse } from '../../lib/error-handler.js';
import { signToken } from '../../lib/crypto.js';
import { loadConfig } from '../../config.js';
import { identityRoutes } from './routes.js';

const config = loadConfig({ NODE_ENV: 'test' });
const PHONE = '+250788123456';

async function makeApp(): Promise<FastifyInstance> {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => {
    const { status, problem } = buildProblemResponse(error, request.url, false);
    reply.code(status).type('application/problem+json').send(problem);
  });
  await app.register(identityRoutes, { config, otpGenerator: () => '111111' });
  await app.ready();
  return app;
}

async function getAccessToken(app: FastifyInstance): Promise<string> {
  await app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone: PHONE } });
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/otp/verify',
    payload: { phone: PHONE, code: '111111', profile: { preferredLanguage: 'rw' } },
  });
  return res.json().accessToken as string;
}

describe('identity routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('OTP request returns 202', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone: PHONE },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json().expiresInSeconds).toBe(600);
  });

  it('rejects a bad phone with 400 problem+json', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone: 'abc' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });

  it('verify with a wrong code returns 401', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone: PHONE } });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone: PHONE, code: '000000' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('verify issues tokens and /me returns the profile', async () => {
    const token = await getAccessToken(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().preferredLanguage).toBe('rw');
    expect(res.json()).not.toHaveProperty('phoneHash');
  });

  it('/me without a token returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/me' });
    expect(res.statusCode).toBe(401);
  });

  it('PATCH /me updates age bands', async () => {
    const token = await getAccessToken(app);
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { childBands: ['13_15'] },
    });
    expect(res.json().childBands).toEqual(['13_15']);
  });

  it('PATCH /me rejects a forbidden child-identity field (FR-24)', async () => {
    const token = await getAccessToken(app);
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
      payload: { childName: 'Ubwoba' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('records consent', async () => {
    const token = await getAccessToken(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/consent',
      headers: { authorization: `Bearer ${token}` },
      payload: { purpose: 'coaching', language: 'rw', method: 'app' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().purpose).toBe('coaching');
  });

  it('assisted onboarding: a parent role is forbidden, a CHW is allowed (FR-03/05)', async () => {
    const parentToken = await getAccessToken(app);
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/parents',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: { phone: '+250700000009' },
    });
    expect(forbidden.statusCode).toBe(403);

    const chwToken = signToken({ sub: 'chw-1', role: 'chw', type: 'access' }, config.jwtSecret, 900);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/parents',
      headers: { authorization: `Bearer ${chwToken}` },
      payload: {
        phone: '+250700000010',
        profile: { childBands: ['10_12'] },
        consent: { purpose: 'coaching', language: 'rw', method: 'assisted' },
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().childBands).toEqual(['10_12']);
  });

  describe('admin: users & roles (FR-33)', () => {
    function adminToken(): string {
      return signToken({ sub: 'admin-1', role: 'admin', type: 'access' }, config.jwtSecret, 900);
    }

    it('non-admin cannot list users', async () => {
      const parentToken = await getAccessToken(app);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: { authorization: `Bearer ${parentToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('admin lists users and never sees phoneHash', async () => {
      await getAccessToken(app); // ensures at least one parent exists
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: { authorization: `Bearer ${adminToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const users = res.json() as Record<string, unknown>[];
      expect(users.length).toBeGreaterThan(0);
      for (const u of users) {
        expect(u).not.toHaveProperty('phoneHash');
        expect(u).not.toHaveProperty('phoneEnc');
        expect(u).toHaveProperty('role');
      }
    });

    it('admin filters the user list by role', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users?role=parent',
        headers: { authorization: `Bearer ${adminToken()}` },
      });
      const users = res.json() as { role: string }[];
      expect(users.every((u) => u.role === 'parent')).toBe(true);
    });

    it('admin changes another account to a staff role', async () => {
      const target = await getAccessToken(app);
      const targetId = (
        await (
          await app.inject({
            method: 'GET',
            url: '/api/v1/me',
            headers: { authorization: `Bearer ${target}` },
          })
        ).json()
      ).id as string;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${targetId}/role`,
        headers: { authorization: `Bearer ${adminToken()}` },
        payload: { role: 'cpo' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().role).toBe('cpo');
    });

    it('rejects an invalid role', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/users/anyone/role',
        headers: { authorization: `Bearer ${adminToken()}` },
        payload: { role: 'superuser' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('404s a role change for an unknown account', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/users/does-not-exist/role',
        headers: { authorization: `Bearer ${adminToken()}` },
        payload: { role: 'cpo' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('refuses to let an admin change their own role', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/users/admin-1/role',
        headers: { authorization: `Bearer ${adminToken()}` },
        payload: { role: 'parent' },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
