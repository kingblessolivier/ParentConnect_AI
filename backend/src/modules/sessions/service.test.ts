import { describe, it, expect } from 'vitest';
import { SessionService } from './service.js';
import { InMemorySessionRepository } from './repository.js';

function service() {
  return new SessionService(new InMemorySessionRepository(), () => '2026-07-27T00:00:00.000Z');
}

const BASE = {
  facilitatorId: 'chw-1',
  district: 'Gasabo',
  sector: 'Remera',
  topic: 'communication' as const,
  scheduledAt: '2026-08-01T09:00:00.000Z',
};

describe('SessionService', () => {
  it('schedules a session and validates required fields', async () => {
    const svc = service();
    const s = await svc.schedule(BASE);
    expect(s.id).toBeTruthy();
    await expect(svc.schedule({ ...BASE, district: ' ' })).rejects.toThrow(/district/);
    await expect(svc.schedule({ ...BASE, scheduledAt: 'nope' })).rejects.toThrow(/scheduledAt/);
  });

  it('records attendance idempotently by clientId (offline-safe, FR-27)', async () => {
    const svc = service();
    const s = await svc.schedule(BASE);
    const first = await svc.recordAttendance(s.id, 'parent-1', 'client-abc');
    const replay = await svc.recordAttendance(s.id, 'parent-1', 'client-abc'); // same client id
    expect(replay.id).toBe(first.id); // no duplicate
    expect(await svc.listAttendance(s.id)).toHaveLength(1);
  });

  it('links attendance to the parent profile (FR-28)', async () => {
    const svc = service();
    const s1 = await svc.schedule(BASE);
    const s2 = await svc.schedule({ ...BASE, topic: 'consent' });
    await svc.recordAttendance(s1.id, 'parent-1', 'c1');
    await svc.recordAttendance(s2.id, 'parent-1', 'c2');
    await svc.recordAttendance(s1.id, 'parent-2', 'c3');
    const forParent1 = await svc.listSessionsForParent('parent-1');
    expect(forParent1).toHaveLength(2);
    expect(await svc.listSessionsForParent('parent-2')).toHaveLength(1);
  });

  it('records an outcome and 404s on unknown sessions', async () => {
    const svc = service();
    const s = await svc.schedule(BASE);
    const updated = await svc.recordOutcome(s.id, '12 parents attended, lively discussion');
    expect(updated.outcomeNotes).toContain('12 parents');
    await expect(svc.recordOutcome('nope', 'x')).rejects.toThrow(/not found/);
    await expect(svc.recordAttendance('nope', 'p', 'c')).rejects.toThrow(/not found/);
  });

  it('returns a facilitator guide for a topic (FR-26)', async () => {
    const svc = service();
    const guide = svc.guide('consent');
    expect(guide.topic).toBe('consent');
    expect(guide.prompts.length).toBeGreaterThan(0);
    expect(() => svc.guide('nonsense' as never)).toThrow(/unknown topic/);
  });

  it('filters sessions by district', async () => {
    const svc = service();
    await svc.schedule(BASE);
    await svc.schedule({ ...BASE, district: 'Kicukiro' });
    expect(await svc.listSessions('Gasabo')).toHaveLength(1);
    expect(await svc.listSessions()).toHaveLength(2);
  });
});
