import { describe, it, expect } from 'vitest';
import { redactPhone, redactText, redactObject } from './redact.js';

describe('redactPhone', () => {
  it('masks all but the last three digits', () => {
    expect(redactPhone('+250788123456')).toBe('***456');
  });
  it('handles formatted numbers', () => {
    expect(redactPhone('0788 123 456')).toBe('***456');
  });
  it('fully redacts too-short input', () => {
    expect(redactPhone('12')).toBe('[redacted]');
  });
});

describe('redactText', () => {
  it('redacts an embedded phone number', () => {
    expect(redactText('call me on +250788123456 please')).toBe('call me on [redacted-phone] please');
  });
  it('leaves non-phone text untouched', () => {
    expect(redactText('no numbers here')).toBe('no numbers here');
  });
});

describe('redactObject', () => {
  it('redacts sensitive keys and keeps others', () => {
    const out = redactObject({ phone: '+250788123456', district: 'Gasabo', body: 'secret' });
    expect(out).toEqual({ phone: '[redacted]', district: 'Gasabo', body: '[redacted]' });
  });
});
