import { describe, it, expect } from 'vitest';
import { InMemoryAuditRepository } from './repository.js';
import { AuditService, sanitiseMetadata } from './service.js';

function makeService(): { service: AuditService; repo: InMemoryAuditRepository } {
  const repo = new InMemoryAuditRepository();
  return { service: new AuditService(repo), repo };
}

describe('sanitiseMetadata', () => {
  it('returns undefined for absent or empty metadata', () => {
    expect(sanitiseMetadata(undefined)).toBeUndefined();
    expect(sanitiseMetadata({})).toBeUndefined();
  });

  it('redacts sensitive keys so the audit log cannot become a PII store (NFR-10/15)', () => {
    const out = sanitiseMetadata({ phone: '+250788123456', note: 'a disclosure', to: 'closed' });
    expect(out).toEqual({ phone: '[redacted]', note: '[redacted]', to: 'closed' });
  });

  it('coerces values to strings and truncates long ones', () => {
    const out = sanitiseMetadata({ count: 42, long: 'x'.repeat(500) });
    expect(out?.count).toBe('42');
    expect(out?.long).toHaveLength(120);
  });

  it('caps the number of keys', () => {
    const raw = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(sanitiseMetadata(raw) ?? {}).length).toBeLessThanOrEqual(8);
  });

  it('drops null/undefined values rather than storing "null"', () => {
    expect(sanitiseMetadata({ a: null, b: undefined, c: 'keep' })).toEqual({ c: 'keep' });
  });
});

describe('AuditService', () => {
  it('records an event with a generated id and timestamp', async () => {
    const { service } = makeService();
    const event = await service.record({
      actorId: 'admin-1',
      actorRole: 'admin',
      action: 'user.role_changed',
      entity: 'user',
      entityId: 'u-9',
      metadata: { from: 'parent', to: 'cpo' },
    });
    expect(event.id).toBeTruthy();
    expect(Date.parse(event.at)).not.toBeNaN();
    expect(event.metadata).toEqual({ from: 'parent', to: 'cpo' });
  });

  it('lists newest first', async () => {
    const { service } = makeService();
    await service.record({ actorId: 'a', actorRole: 'admin', action: 'access.denied', entity: 'route', entityId: '/x', at: '2026-01-01T00:00:00.000Z' });
    await service.record({ actorId: 'a', actorRole: 'admin', action: 'access.denied', entity: 'route', entityId: '/y', at: '2026-02-01T00:00:00.000Z' });
    const events = await service.list();
    expect(events.map((e) => e.entityId)).toEqual(['/y', '/x']);
  });

  it('filters by action, actor, entity and since', async () => {
    const { service } = makeService();
    await service.record({ actorId: 'a1', actorRole: 'admin', action: 'user.role_changed', entity: 'user', entityId: 'u1', at: '2026-01-01T00:00:00.000Z' });
    await service.record({ actorId: 'a2', actorRole: 'cpo', action: 'referral.transitioned', entity: 'referral', entityId: 'r1', at: '2026-03-01T00:00:00.000Z' });

    expect(await service.list({ action: 'user.role_changed' })).toHaveLength(1);
    expect(await service.list({ actorId: 'a2' })).toHaveLength(1);
    expect(await service.list({ entity: 'referral' })).toHaveLength(1);
    expect(await service.list({ since: '2026-02-01T00:00:00.000Z' })).toHaveLength(1);
  });

  it('applies a limit', async () => {
    const { service } = makeService();
    for (let i = 0; i < 5; i += 1) {
      await service.record({ actorId: 'a', actorRole: 'admin', action: 'access.denied', entity: 'route', entityId: `/${i}` });
    }
    expect(await service.list({ limit: 2 })).toHaveLength(2);
  });

  it('recordSafely reports the error instead of throwing (audit must not break the audited action)', async () => {
    const failing = {
      append: () => Promise.reject(new Error('db down')),
      list: () => Promise.resolve([]),
    };
    const service = new AuditService(failing);
    let captured: unknown = null;
    service.recordSafely(
      { actorId: 'a', actorRole: 'admin', action: 'access.denied', entity: 'route', entityId: '/x' },
      (err) => {
        captured = err;
      },
    );
    await new Promise((r) => setTimeout(r, 0));
    expect((captured as Error).message).toBe('db down');
  });

  it('exposes no way to mutate or delete history (NFR-11)', () => {
    const repo = new InMemoryAuditRepository() as unknown as Record<string, unknown>;
    expect(repo.update).toBeUndefined();
    expect(repo.delete).toBeUndefined();
  });
});
