import { describe, it, expect } from 'vitest';
import { InMemoryDirectoryRepository, type DirectoryRepository } from './directory-repository.js';
import { DirectoryService, validateContact } from './directory-service.js';
import type { ReferralContact } from './referral-directory.js';

const BASELINE: ReferralContact[] = [
  { name: 'Isange One Stop Centre', phone: '[VERIFY]', type: 'one_stop_centre' },
  { name: 'National Child Helpline', phone: '[VERIFY]', type: 'child_helpline' },
];

const AT = '2026-08-01T00:00:00.000Z';
const CONTACT = { name: 'Gasabo Health Post', phone: '+250780000000', type: 'health_facility', district: 'Gasabo' };

function makeService(repo: DirectoryRepository = new InMemoryDirectoryRepository(), onErr?: (e: unknown) => void) {
  return new DirectoryService(repo, BASELINE, onErr);
}

describe('validateContact', () => {
  it('accepts a valid contact', () => {
    expect(validateContact(CONTACT)).toEqual(CONTACT);
  });

  it('rejects missing name/phone and an unknown type with 400', () => {
    expect(() => validateContact({ phone: '1', type: 'child_helpline' })).toThrow(/name/);
    expect(() => validateContact({ name: 'x', type: 'child_helpline' })).toThrow(/phone/);
    expect(() => validateContact({ name: 'x', phone: '1', type: 'nope' })).toThrow(/type/);
  });
});

describe('DirectoryService.effective', () => {
  it('serves the file baseline when there are no overrides (ADR-0010)', async () => {
    expect(await makeService().effective()).toEqual(BASELINE);
  });

  it('serves overrides once any exist', async () => {
    const service = makeService();
    await service.create(CONTACT, AT);
    const effective = await service.effective();
    expect(effective).toEqual([{ ...CONTACT }]);
  });

  it('falls back to the baseline when storage is unreachable (NFR-06)', async () => {
    let reported: unknown = null;
    const broken: DirectoryRepository = {
      list: () => Promise.reject(new Error('db down')),
      create: () => Promise.reject(new Error('db down')),
      update: () => Promise.reject(new Error('db down')),
      remove: () => Promise.reject(new Error('db down')),
    };
    const service = makeService(broken, (err) => {
      reported = err;
    });

    // The referral pathway still resolves — that is the whole point.
    expect(await service.effective()).toEqual(BASELINE);
    expect((reported as Error).message).toBe('db down');
  });

  it('returns to the baseline when the last override is removed (never empty)', async () => {
    const service = makeService();
    const entry = await service.create(CONTACT, AT);
    await service.remove(entry.id);
    expect(await service.effective()).toEqual(BASELINE);
  });
});

describe('DirectoryService admin operations', () => {
  it('reports whether the baseline is currently in use', async () => {
    const service = makeService();
    expect((await service.listForAdmin()).usingBaseline).toBe(true);
    await service.create(CONTACT, AT);
    expect((await service.listForAdmin()).usingBaseline).toBe(false);
  });

  it('updates an existing override', async () => {
    const service = makeService();
    const entry = await service.create(CONTACT, AT);
    const updated = await service.update(entry.id, { ...CONTACT, phone: '+250789999999' }, AT);
    expect(updated.phone).toBe('+250789999999');
  });

  it('404s updating or removing an unknown id', async () => {
    const service = makeService();
    await expect(service.update('nope', CONTACT, AT)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.remove('nope')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects an invalid contact before it reaches storage', async () => {
    const service = makeService();
    await expect(service.create({ name: '', phone: '1', type: 'child_helpline' }, AT)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect((await service.listForAdmin()).entries).toHaveLength(0);
  });
});
