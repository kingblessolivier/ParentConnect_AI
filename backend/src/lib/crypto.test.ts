import { describe, it, expect } from 'vitest';
import {
  constantTimeEqual,
  generateOtp,
  hashPhone,
  signToken,
  TokenError,
  verifyToken,
} from './crypto.js';

describe('hashPhone', () => {
  it('is deterministic for the same phone+pepper and hides the number', () => {
    const h1 = hashPhone('+250788123456', 'pepper');
    const h2 = hashPhone('+250788123456', 'pepper');
    expect(h1).toBe(h2);
    expect(h1).not.toContain('788');
  });
  it('differs with a different pepper', () => {
    expect(hashPhone('+250788123456', 'a')).not.toBe(hashPhone('+250788123456', 'b'));
  });
});

describe('generateOtp', () => {
  it('is 6 digits', () => {
    for (let i = 0; i < 50; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
});

describe('constantTimeEqual', () => {
  it('true for equal, false for different or different-length', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'ab')).toBe(false);
  });
});

describe('tokens', () => {
  const secret = 'test-secret';

  it('round-trips claims', () => {
    const token = signToken({ sub: 'p1', role: 'parent', type: 'access' }, secret, 900);
    const claims = verifyToken(token, secret);
    expect(claims.sub).toBe('p1');
    expect(claims.role).toBe('parent');
    expect(claims.exp).toBeGreaterThan(claims.iat as number);
  });

  it('rejects a wrong signature', () => {
    const token = signToken({ sub: 'p1', role: 'parent' }, secret, 900);
    expect(() => verifyToken(token, 'other-secret')).toThrow(TokenError);
  });

  it('rejects a malformed token', () => {
    expect(() => verifyToken('not.a.jwt.token', secret)).toThrow(TokenError);
    expect(() => verifyToken('only-one-part', secret)).toThrow(TokenError);
  });

  it('rejects an expired token', () => {
    const token = signToken({ sub: 'p1', role: 'parent' }, secret, -1);
    expect(() => verifyToken(token, secret)).toThrow(/expired/);
  });
});
