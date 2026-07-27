import { describe, it, expect } from 'vitest';
import {
  validateAgeBands,
  validateConsentInput,
  validatePhone,
  validateProfileInput,
} from './validation.js';

describe('validatePhone', () => {
  it('accepts E.164-ish numbers', () => {
    expect(validatePhone('+250788123456')).toBe('+250788123456');
    expect(validatePhone(' 0788123456 ')).toBe('0788123456');
  });
  it('rejects non-strings and bad formats', () => {
    expect(() => validatePhone(123)).toThrow(/required/);
    expect(() => validatePhone('abc')).toThrow(/digits/);
    expect(() => validatePhone('123')).toThrow(/digits/);
  });
});

describe('validateAgeBands', () => {
  it('accepts valid bands', () => {
    expect(validateAgeBands(['10_12', '16_19'])).toEqual(['10_12', '16_19']);
  });
  it('rejects invalid bands and non-arrays', () => {
    expect(() => validateAgeBands(['9_11'])).toThrow(/invalid age band/);
    expect(() => validateAgeBands('10_12')).toThrow(/must be an array/);
  });
});

describe('validateProfileInput', () => {
  it('normalises valid input', () => {
    const out = validateProfileInput({
      district: 'Gasabo',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    expect(out).toEqual({
      district: 'Gasabo',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
  });

  it('rejects forbidden child-identity fields (FR-24/NFR-15)', () => {
    expect(() => validateProfileInput({ childName: 'X' })).toThrow(/not permitted/);
    expect(() => validateProfileInput({ dob: '2010-01-01' })).toThrow(/not permitted/);
    expect(() => validateProfileInput({ nationalId: '123' })).toThrow(/not permitted/);
  });

  it('rejects invalid enum values', () => {
    expect(() => validateProfileInput({ preferredLanguage: 'sw' })).toThrow(/preferredLanguage/);
    expect(() => validateProfileInput({ urbanRural: 'suburb' })).toThrow(/urbanRural/);
  });
});

describe('validateConsentInput', () => {
  it('accepts valid consent', () => {
    expect(validateConsentInput({ purpose: 'coaching', language: 'rw', method: 'assisted' })).toEqual(
      { purpose: 'coaching', language: 'rw', method: 'assisted' },
    );
  });
  it('rejects missing purpose / bad enums', () => {
    expect(() => validateConsentInput({ language: 'rw', method: 'app' })).toThrow(/purpose/);
    expect(() => validateConsentInput({ purpose: 'x', language: 'rw', method: 'carrier' })).toThrow(
      /method/,
    );
  });
});
