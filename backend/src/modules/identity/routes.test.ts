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
});
