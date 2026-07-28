import { describe, it, expect } from 'vitest';
import { InMemoryReferralRepository } from './referral-repository.js';
import { ReferralService } from './referral-service.js';

function svc(now = () => '2026-07-28T00:00:00.000Z', slaHours = 48): ReferralService {
  return new ReferralService(new InMemoryReferralRepository(), slaHours, now);
}

describe('ReferralService.raise', () => {
  it('raises a referral, sets status raised and an SLA deadline', async () => {
    const service = svc(() => '2026-07-28T00:00:00.000Z', 48);
    const r = await service.raise('parent-1', { category: 'abuse' });
    expect(r.status).toBe('raised');
    expect(r.category).toBe('abuse');
    expect(r.dueBy).toBe('2026-07-30T00:00:00.000Z'); // +48h
    expect(r.overdue).toBe(false);
  });

  it('rejects an unknown category (400)', async () => {
    await expect(svc().raise('p1', { category: 'gossip' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an over-long note (400)', async () => {
    await expect(svc().raise('p1', { category: 'other', note: 'x'.repeat(501) })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('drops a blank note (stores none)', async () => {
    const service = svc();
    const r = await service.raise('p1', { category: 'other', note: '   ' });
    const { events } = await service.detail(r.id);
    expect(events[0]?.note).toBeUndefined();
  });

  it('records the raise as the first audit event', async () => {
    const service = svc();
    const r = await service.raise('parent-1', { category: 'pregnancy', note: 'disclosed at session' });
    const { events } = await service.detail(r.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.toStatus).toBe('raised');
    expect(events[0]?.note).toBe('disclosed at session');
    expect(events[0]?.actorId).toBe('parent-1');
  });
});

describe('ReferralService.transition', () => {
  it('advances forward through the lifecycle, appending an event each time', async () => {
    const service = svc();
    const r = await service.raise('p1', { category: 'exploitation' });
    const ack = await service.transition(r.id, 'cpo-1', { toStatus: 'acknowledged', assignedOfficerId: 'cpo-1' });
    expect(ack.status).toBe('acknowledged');
    expect(ack.assignedOfficerId).toBe('cpo-1');
    const act = await service.transition(r.id, 'cpo-1', { toStatus: 'actioned' });
    expect(act.status).toBe('actioned');
    const closed = await service.transition(r.id, 'cpo-1', { toStatus: 'closed', note: 'handed to Isange' });
    expect(closed.status).toBe('closed');

    const { events } = await service.detail(r.id);
    expect(events.map((e) => e.toStatus)).toEqual(['raised', 'acknowledged', 'actioned', 'closed']);
  });

  it('rejects skipping a stage (409)', async () => {
    const service = svc();
    const r = await service.raise('p1', { category: 'abuse' });
    await expect(service.transition(r.id, 'cpo-1', { toStatus: 'closed' })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('rejects moving a closed referral (409, terminal)', async () => {
    const service = svc();
    const r = await service.raise('p1', { category: 'abuse' });
    await service.transition(r.id, 'cpo-1', { toStatus: 'acknowledged' });
    await service.transition(r.id, 'cpo-1', { toStatus: 'actioned' });
    await service.transition(r.id, 'cpo-1', { toStatus: 'closed' });
    await expect(service.transition(r.id, 'cpo-1', { toStatus: 'acknowledged' })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('404s an unknown referral', async () => {
    await expect(svc().transition('nope', 'cpo-1', { toStatus: 'acknowledged' })).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(svc().detail('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('ReferralService overdue + listing', () => {
  it('flags an open referral past its SLA as overdue', async () => {
    let clock = '2026-07-28T00:00:00.000Z';
    const service = new ReferralService(new InMemoryReferralRepository(), 48, () => clock);
    await service.raise('p1', { category: 'self_harm' });
    clock = '2026-08-01T00:00:00.000Z'; // well past +48h
    const [row] = await service.list();
    expect(row?.overdue).toBe(true);
  });

  it('a closed referral is never overdue', async () => {
    let clock = '2026-07-28T00:00:00.000Z';
    const service = new ReferralService(new InMemoryReferralRepository(), 48, () => clock);
    const r = await service.raise('p1', { category: 'self_harm' });
    await service.transition(r.id, 'cpo-1', { toStatus: 'acknowledged' });
    await service.transition(r.id, 'cpo-1', { toStatus: 'actioned' });
    await service.transition(r.id, 'cpo-1', { toStatus: 'closed' });
    clock = '2026-08-01T00:00:00.000Z';
    const [row] = await service.list();
    expect(row?.overdue).toBe(false);
  });

  it('lists only a raiser’s own referrals', async () => {
    const service = svc();
    await service.raise('p1', { category: 'abuse' });
    await service.raise('p2', { category: 'other' });
    expect(await service.listForParent('p1')).toHaveLength(1);
  });
});
