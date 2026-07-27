/**
 * Referral directory (FR-21) — the Isange One Stop Centre, child helpline, and
 * health-facility contacts surfaced on a disclosure.
 *
 * This is **safety-critical configuration** (ADR-0010): it is loaded from the
 * deployment config bundle, and an empty or missing directory **fails startup**
 * — a disclosure must always be able to surface a referral, even when the AI
 * service is down (NFR-06). It is deliberately just config data, with no
 * dependency on the AI service.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type ReferralType = 'one_stop_centre' | 'child_helpline' | 'health_facility';

export interface ReferralContact {
  name: string;
  phone: string;
  type: ReferralType;
  /** Optional: a district-specific contact. Omitted = national/always-included. */
  district?: string;
}

const VALID_TYPES: ReadonlySet<string> = new Set<ReferralType>([
  'one_stop_centre',
  'child_helpline',
  'health_facility',
]);

export function validateReferralDirectory(data: unknown): ReferralContact[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      'referral directory must be a non-empty array (safety-critical, FR-21/NFR-06)',
    );
  }
  return data.map((entry, i) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`referral[${i}] must be an object`);
    }
    const { name, phone, type, district } = entry as Record<string, unknown>;
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(`referral[${i}].name is required`);
    }
    if (typeof phone !== 'string' || phone.trim() === '') {
      throw new Error(`referral[${i}].phone is required`);
    }
    if (typeof type !== 'string' || !VALID_TYPES.has(type)) {
      throw new Error(`referral[${i}].type must be one of ${[...VALID_TYPES].join(', ')}`);
    }
    const contact: ReferralContact = { name, phone, type: type as ReferralType };
    if (typeof district === 'string' && district.trim() !== '') contact.district = district;
    return contact;
  });
}

export function loadReferralDirectory(configDir: string): ReferralContact[] {
  const path = join(configDir, 'referral-directory.json');
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`referral directory not found at ${path} (required by ADR-0010)`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`referral directory at ${path} is not valid JSON`);
  }
  return validateReferralDirectory(parsed);
}

/**
 * Filter to the contacts relevant for a district: national services (no
 * district) are always included; district-specific ones match by name.
 */
export function filterByDistrict(
  directory: readonly ReferralContact[],
  district?: string,
): ReferralContact[] {
  if (!district) return [...directory];
  const wanted = district.toLowerCase();
  return directory.filter((c) => !c.district || c.district.toLowerCase() === wanted);
}
