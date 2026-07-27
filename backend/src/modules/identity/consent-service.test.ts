import { describe, it, expect } from 'vitest';
import { ConsentService } from './consent-service.js';
import { InMemoryConsentRepository } from './repository.js';

describe('ConsentService', () => {
  it('records consent with a timestamp and language (NFR-16)', async () => {
    const svc = new ConsentService(new InMemoryConsentRepository(), () => '2026-07-27T00:00:00.000Z');
    const c = await svc.record('p1', { purpose: 'coaching', language: 'rw', method: 'assisted' });
    expect(c.parentId).toBe('p1');
    expect(c.language).toBe('rw');
    expect(c.givenAt).toBe('2026-07-27T00:00:00.000Z');
    expect(c.withdrawnAt).toBeUndefined();
  });

  it('withdraws consent (NFR-17)', async () => {
    const svc = new ConsentService(new InMemoryConsentRepository());
    await svc.record('p1', { purpose: 'coaching', language: 'rw', method: 'app' });
    await svc.withdraw('p1', 'coaching');
    const list = await svc.list('p1');
    expect(list[0]?.withdrawnAt).toBeTruthy();
  });

  it('lists only a parent’s own consents', async () => {
    const svc = new ConsentService(new InMemoryConsentRepository());
    await svc.record('p1', { purpose: 'a', language: 'rw', method: 'app' });
    await svc.record('p2', { purpose: 'b', language: 'en', method: 'sms' });
    expect(await svc.list('p1')).toHaveLength(1);
  });
});
