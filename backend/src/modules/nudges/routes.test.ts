import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { loadConfig } from '../../config.js';
import { encryptSecret, signToken } from '../../lib/crypto.js';
import { InMemoryParentRepository } from '../identity/repository.js';
import { FakeGateway } from '../messaging/gateway.js';
import { InMemoryNudgeRepository } from './repository.js';

const REFERRALS = [{ name: 'Isange', phone: '123', type: 'one_stop_centre' }];
const KEY = '00000000000000000000000000000000000000000000000000000000000000ff';

function makeConfigDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pc-nudge-'));
  writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(REFERRALS));
  return dir;
}

describe('nudge routes', () => {
  let app: FastifyInstance;
  let dir: string;
  let admin: string;
  let parentToken: string;
  let parentId: string;
  let gateway: FakeGateway;

  beforeAll(async () => {
    dir = makeConfigDir();
    const config = loadConfig({ CONFIG_DIR: dir, NODE_ENV: 'test' });
    const parents = new InMemoryParentRepository();
    const parent = await parents.create({
      phoneHash: 'h1',
      phoneEnc: encryptSecret('+250700000001', KEY),
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    parentId = parent.id;
    gateway = new FakeGateway();
    app = await buildApp(config, {
      nudges: { nudgeRepo: new InMemoryNudgeRepository(), parentRepo: parents, gateway },
    });
    const tok = (role: string, sub: string) =>
      signToken({ sub, role, type: 'access' }, config.jwtSecret, 900);
    admin = tok('admin', 'a1');
    parentToken = tok('parent', parentId);
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

  it('only admins can create a campaign', async () => {
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/campaigns',
      headers: bearer(parentToken),
      payload: { name: 'x', segmentAgeBand: '13_15', segmentLanguage: 'rw', channel: 'sms' },
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it('full flow: create campaign → schedule nudge → dispatch → delivered', async () => {
    const campaign = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/campaigns',
      headers: bearer(admin),
      payload: { name: 'Tips', segmentAgeBand: '13_15', segmentLanguage: 'rw', channel: 'sms' },
    });
    expect(campaign.statusCode).toBe(201);
    const campaignId = campaign.json().id as string;

    const nudge = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/campaigns/${campaignId}/nudges`,
      headers: bearer(admin),
      payload: { body: 'Umwana wawe...', sendAt: '2000-01-01T00:00:00.000Z' }, // past → due
    });
    expect(nudge.statusCode).toBe(201);

    const dispatch = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/nudges/dispatch',
      headers: bearer(admin),
    });
    expect(dispatch.json().deliveries).toBe(1);
    expect(gateway.sent.at(-1)?.to).toBe('+250700000001');
  });

  it('a parent can opt out, which stops delivery', async () => {
    const optOut = await app.inject({
      method: 'POST',
      url: '/api/v1/nudges/opt-out',
      headers: bearer(parentToken),
    });
    expect(optOut.json().optedOut).toBe(true);

    const campaign = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/campaigns',
      headers: bearer(admin),
      payload: { name: 'T2', segmentAgeBand: '13_15', segmentLanguage: 'rw', channel: 'sms' },
    });
    const id = campaign.json().id as string;
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/campaigns/${id}/nudges`,
      headers: bearer(admin),
      payload: { body: 'tip', sendAt: '2000-01-01T00:00:00.000Z' },
    });
    const before = gateway.sent.length;
    await app.inject({ method: 'POST', url: '/api/v1/admin/nudges/dispatch', headers: bearer(admin) });
    expect(gateway.sent.length).toBe(before); // no new delivery to the opted-out parent
  });

  it('rejects an invalid campaign segment', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/campaigns',
      headers: bearer(admin),
      payload: { name: 'bad', segmentAgeBand: '9_11', segmentLanguage: 'rw', channel: 'sms' },
    });
    expect(res.statusCode).toBe(400);
  });
});
