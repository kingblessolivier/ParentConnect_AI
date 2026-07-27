import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateReferralDirectory,
  loadReferralDirectory,
  filterByDistrict,
} from './referral-directory.js';

const VALID = [
  { name: 'Isange One Stop Centre', phone: '123', type: 'one_stop_centre' },
  { name: 'Facility', phone: '9', type: 'health_facility', district: 'Gasabo' },
];

describe('validateReferralDirectory', () => {
  it('accepts a valid directory', () => {
    expect(validateReferralDirectory(VALID)).toHaveLength(2);
  });
  it('rejects an empty array (safety-critical)', () => {
    expect(() => validateReferralDirectory([])).toThrow(/non-empty/);
  });
  it('rejects a non-array', () => {
    expect(() => validateReferralDirectory({})).toThrow(/non-empty/);
  });
  it('rejects a missing name', () => {
    expect(() => validateReferralDirectory([{ phone: '1', type: 'child_helpline' }])).toThrow(
      /name is required/,
    );
  });
  it('rejects an invalid type', () => {
    expect(() => validateReferralDirectory([{ name: 'x', phone: '1', type: 'bogus' }])).toThrow(
      /type must be one of/,
    );
  });
});

describe('loadReferralDirectory', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pc-ref-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads a valid file', () => {
    writeFileSync(join(dir, 'referral-directory.json'), JSON.stringify(VALID));
    expect(loadReferralDirectory(dir)).toHaveLength(2);
  });
  it('throws when the file is missing', () => {
    expect(() => loadReferralDirectory(dir)).toThrow(/not found/);
  });
  it('throws on invalid JSON', () => {
    writeFileSync(join(dir, 'referral-directory.json'), '{not json');
    expect(() => loadReferralDirectory(dir)).toThrow(/not valid JSON/);
  });
  it('throws on an empty directory', () => {
    writeFileSync(join(dir, 'referral-directory.json'), '[]');
    expect(() => loadReferralDirectory(dir)).toThrow(/non-empty/);
  });
});

describe('filterByDistrict', () => {
  const dir = validateReferralDirectory(VALID);
  it('returns all contacts when no district given', () => {
    expect(filterByDistrict(dir)).toHaveLength(2);
  });
  it('includes national + matching-district contacts', () => {
    expect(filterByDistrict(dir, 'Gasabo')).toHaveLength(2);
  });
  it('excludes non-matching district-specific contacts (keeps national)', () => {
    const result = filterByDistrict(dir, 'Nyarugenge');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Isange One Stop Centre');
  });
});
