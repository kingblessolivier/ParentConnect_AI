/**
 * Input validation for the identity module. Rejects anything that would breach
 * data minimisation (NFR-15) — e.g. a child identity field — and normalises the
 * client profile input to typed values.
 */

import { AppError } from '../../lib/problem.js';
import {
  AGE_BANDS,
  CHANNELS,
  LANGUAGES,
  type AgeBand,
  type Channel,
  type ConsentInput,
  type ConsentMethod,
  type Language,
  type ProfileInput,
} from './types.js';

/** Fields that must never be accepted — they would identify a child (FR-24). */
const FORBIDDEN_CHILD_FIELDS = ['childName', 'child_name', 'dob', 'dateOfBirth', 'nationalId'];

function bad(detail: string): never {
  throw new AppError(400, 'Invalid input', detail);
}

export function validatePhone(phone: unknown): string {
  if (typeof phone !== 'string') bad('phone is required');
  const trimmed = (phone as string).trim();
  // E.164-ish: optional +, 8–15 digits. Kept permissive; the OTP proves control.
  if (!/^\+?\d{8,15}$/.test(trimmed)) bad('phone must be 8–15 digits, optionally with a leading +');
  return trimmed;
}

export function validateAgeBands(value: unknown): AgeBand[] {
  if (!Array.isArray(value)) bad('childBands must be an array');
  return value.map((b) => {
    if (!AGE_BANDS.includes(b as AgeBand)) bad(`invalid age band: ${String(b)}`);
    return b as AgeBand;
  });
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) bad(`${field} must be one of ${allowed.join(', ')}`);
  return value as T;
}

export function validateProfileInput(raw: unknown): ProfileInput {
  if (typeof raw !== 'object' || raw === null) bad('profile must be an object');
  const input = raw as Record<string, unknown>;

  for (const forbidden of FORBIDDEN_CHILD_FIELDS) {
    if (forbidden in input) bad(`field '${forbidden}' is not permitted (data minimisation, FR-24/NFR-15)`);
  }

  const out: ProfileInput = {};
  if (input.displayAlias !== undefined) {
    if (typeof input.displayAlias !== 'string') bad('displayAlias must be a string');
    out.displayAlias = input.displayAlias;
  }
  if (input.district !== undefined) {
    if (typeof input.district !== 'string') bad('district must be a string');
    out.district = input.district;
  }
  if (input.sector !== undefined) {
    if (typeof input.sector !== 'string') bad('sector must be a string');
    out.sector = input.sector;
  }
  if (input.urbanRural !== undefined) out.urbanRural = oneOf(input.urbanRural, ['urban', 'rural'] as const, 'urbanRural');
  if (input.caregiverGender !== undefined) {
    out.caregiverGender = oneOf(input.caregiverGender, ['female', 'male', 'other'] as const, 'caregiverGender');
  }
  if (input.preferredLanguage !== undefined) {
    out.preferredLanguage = oneOf(input.preferredLanguage, LANGUAGES, 'preferredLanguage') as Language;
  }
  if (input.preferredChannel !== undefined) {
    out.preferredChannel = oneOf(input.preferredChannel, CHANNELS, 'preferredChannel') as Channel;
  }
  if (input.childBands !== undefined) out.childBands = validateAgeBands(input.childBands);
  return out;
}

export function validateConsentInput(raw: unknown): ConsentInput {
  if (typeof raw !== 'object' || raw === null) bad('consent must be an object');
  const input = raw as Record<string, unknown>;
  if (typeof input.purpose !== 'string' || input.purpose.trim() === '') bad('consent.purpose is required');
  const language = oneOf(input.language, LANGUAGES, 'consent.language') as Language;
  const method = oneOf(input.method, ['app', 'sms', 'ivr', 'assisted'] as const, 'consent.method') as ConsentMethod;
  return { purpose: input.purpose, language, method };
}
