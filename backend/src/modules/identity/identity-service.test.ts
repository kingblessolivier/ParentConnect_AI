import { describe, it, expect } from 'vitest';
import { IdentityService } from './identity-service.js';
import { InMemoryParentRepository } from './repository.js';
import { hashPhone, verifyToken } from '../../lib/crypto.js';

const config = {
  phonePepper: 'pepper',
  jwtSecret: 'secret',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 1000,
};

function service() {
  return new IdentityService(new InMemoryParentRepository(), config);
}

describe('IdentityService', () => {
  it('registerVerified is get-or-create (idempotent per phone)', async () => {
    const svc = service();
    const hash = hashPhone('+250788123456', config.phonePepper);
    const first = await svc.registerVerified(hash, { preferredLanguage: 'rw' });
    const again = await svc.registerVerified(hash, { preferredLanguage: 'en' });
    expect(again.id).toBe(first.id);
    expect(again.preferredLanguage).toBe('rw'); // not overwritten
    expect(first.role).toBe('parent');
    expect(first.childBands).toEqual([]);
  });

  it('assistedOnboard creates a parent and rejects duplicates (FR-03)', async () => {
    const svc = service();
    const created = await svc.assistedOnboard('+250700000001', { childBands: ['10_12'] });
    expect(created.childBands).toEqual(['10_12']);
    await expect(svc.assistedOnboard('+250700000001', {})).rejects.toThrow(/already registered/);
  });

  it('getProfile throws 404 for unknown id', async () => {
    await expect(service().getProfile('nope')).rejects.toThrow(/Not Found/);
  });

  it('updateProfile changes fields but keeps id/createdAt', async () => {
    const svc = service();
    const hash = hashPhone('+250788123456', config.phonePepper);
    const parent = await svc.registerVerified(hash, {});
    const updated = await svc.updateProfile(parent.id, { district: 'Gasabo', childBands: ['16_19'] });
    expect(updated.id).toBe(parent.id);
    expect(updated.createdAt).toBe(parent.createdAt);
    expect(updated.district).toBe('Gasabo');
    expect(updated.childBands).toEqual(['16_19']);
  });

  it('issues verifiable access + refresh tokens', async () => {
    const svc = service();
    const tokens = svc.issueTokens({ id: 'p1', role: 'parent' });
    expect(tokens.expiresIn).toBe(900);
    const access = verifyToken(tokens.accessToken, config.jwtSecret);
    expect(access.sub).toBe('p1');
    expect(access.type).toBe('access');
    expect(verifyToken(tokens.refreshToken, config.jwtSecret).type).toBe('refresh');
  });
});
