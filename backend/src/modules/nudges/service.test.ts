import { describe, it, expect } from 'vitest';
import { encryptSecret } from '../../lib/crypto.js';
import { InMemoryParentRepository } from '../identity/repository.js';
import { FakeGateway } from '../messaging/gateway.js';
import { InMemoryNudgeRepository } from './repository.js';
import { NudgeService } from './service.js';

const KEY = '00000000000000000000000000000000000000000000000000000000000000ff';

async function seedParent(
  parents: InMemoryParentRepository,
  opts: { phone: string; band: '10_12' | '13_15' | '16_19'; lang: 'rw' | 'en' | 'fr' },
) {
  return parents.create({
    phoneHash: `h-${opts.phone}`,
    phoneEnc: encryptSecret(opts.phone, KEY),
    role: 'parent',
    preferredLanguage: opts.lang,
    preferredChannel: 'sms',
    childBands: [opts.band],
  });
}

function setup() {
  const nudgeRepo = new InMemoryNudgeRepository();
  const parents = new InMemoryParentRepository();
  const gateway = new FakeGateway();
  const service = new NudgeService(nudgeRepo, parents, gateway, KEY, () => '2026-07-27T12:00:00.000Z');
  return { nudgeRepo, parents, gateway, service };
}

describe('NudgeService.dispatchDue', () => {
  it('delivers a due nudge only to the matching segment', async () => {
    const { parents, gateway, service } = setup();
    await seedParent(parents, { phone: '+250700000001', band: '13_15', lang: 'rw' }); // match
    await seedParent(parents, { phone: '+250700000002', band: '16_19', lang: 'rw' }); // wrong band
    await seedParent(parents, { phone: '+250700000003', band: '13_15', lang: 'en' }); // wrong lang

    const campaign = await service.createCampaign({
      name: 'Tip of the week',
      segmentAgeBand: '13_15',
      segmentLanguage: 'rw',
      channel: 'sms',
    });
    await service.addNudge(campaign.id, 'Umwana wawe...', '2026-07-27T11:00:00.000Z'); // due (past)

    const result = await service.dispatchDue();
    expect(result.nudges).toBe(1);
    expect(result.deliveries).toBe(1);
    expect(gateway.sent).toHaveLength(1);
    expect(gateway.sent[0]?.to).toBe('+250700000001'); // decrypted number
  });

  it('does not deliver a nudge scheduled in the future', async () => {
    const { parents, gateway, service } = setup();
    await seedParent(parents, { phone: '+250700000001', band: '13_15', lang: 'rw' });
    const c = await service.createCampaign({
      name: 'c',
      segmentAgeBand: '13_15',
      segmentLanguage: 'rw',
      channel: 'sms',
    });
    await service.addNudge(c.id, 'later', '2026-07-27T18:00:00.000Z'); // future
    const result = await service.dispatchDue();
    expect(result.nudges).toBe(0);
    expect(gateway.sent).toHaveLength(0);
  });

  it('skips opted-out parents (NFR-17)', async () => {
    const { parents, gateway, service } = setup();
    const p = await seedParent(parents, { phone: '+250700000001', band: '13_15', lang: 'rw' });
    await service.optOut(p.id);
    const c = await service.createCampaign({
      name: 'c',
      segmentAgeBand: '13_15',
      segmentLanguage: 'rw',
      channel: 'sms',
    });
    await service.addNudge(c.id, 'tip', '2026-07-27T11:00:00.000Z');
    const result = await service.dispatchDue();
    expect(result.deliveries).toBe(0);
    expect(gateway.sent).toHaveLength(0);
  });

  it('opting back in resumes delivery', async () => {
    const { parents, gateway, service } = setup();
    const p = await seedParent(parents, { phone: '+250700000001', band: '13_15', lang: 'rw' });
    await service.optOut(p.id);
    await service.optIn(p.id);
    const c = await service.createCampaign({
      name: 'c',
      segmentAgeBand: '13_15',
      segmentLanguage: 'rw',
      channel: 'sms',
    });
    await service.addNudge(c.id, 'tip', '2026-07-27T11:00:00.000Z');
    await service.dispatchDue();
    expect(gateway.sent).toHaveLength(1);
  });

  it('marks a nudge dispatched so it is not sent twice', async () => {
    const { parents, gateway, service } = setup();
    await seedParent(parents, { phone: '+250700000001', band: '13_15', lang: 'rw' });
    const c = await service.createCampaign({
      name: 'c',
      segmentAgeBand: '13_15',
      segmentLanguage: 'rw',
      channel: 'sms',
    });
    await service.addNudge(c.id, 'tip', '2026-07-27T11:00:00.000Z');
    await service.dispatchDue();
    const second = await service.dispatchDue();
    expect(second.nudges).toBe(0);
    expect(gateway.sent).toHaveLength(1);
  });

  it('validates campaign name and nudge body', async () => {
    const { service } = setup();
    await expect(
      service.createCampaign({ name: ' ', segmentAgeBand: '13_15', segmentLanguage: 'rw', channel: 'sms' }),
    ).rejects.toThrow(/name/);
    const c = await service.createCampaign({
      name: 'c',
      segmentAgeBand: '13_15',
      segmentLanguage: 'rw',
      channel: 'sms',
    });
    await expect(service.addNudge(c.id, ' ', '2026-07-27T11:00:00.000Z')).rejects.toThrow(/body/);
    await expect(service.addNudge('nope', 'x', '2026-07-27T11:00:00.000Z')).rejects.toThrow(/not found/);
  });
});
