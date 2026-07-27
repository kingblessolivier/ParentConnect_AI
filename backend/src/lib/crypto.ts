/**
 * Crypto helpers: phone hashing, OTP generation, and HS256 tokens.
 *
 * - Phone numbers are stored **hashed** (P2, data-model.md) with a keyed HMAC so
 *   lookups are deterministic but the number isn't recoverable from the store.
 * - Tokens are HS256 JWTs signed with the app secret (no third-party dep — the
 *   algorithm is small and boring). Secrets come from config, never source (NFR-13).
 */

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export function hmacHex(value: string, key: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

/** Keyed hash of a phone number for storage/lookup (P2). */
export function hashPhone(phone: string, pepper: string): string {
  return hmacHex(phone.trim(), pepper);
}

/** A 6-digit numeric OTP (FR-01), from a CSPRNG. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface TokenClaims {
  sub: string;
  role: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

export function signToken(claims: TokenClaims, secret: string, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...claims, iat: now, exp: now + ttlSeconds };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify(body));
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export class TokenError extends Error {}

export function verifyToken(token: string, secret: string): TokenClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw new TokenError('malformed token');
  const [header, payload, sig] = parts as [string, string, string];
  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  if (!constantTimeEqual(sig, expected)) throw new TokenError('bad signature');
  let body: TokenClaims;
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenClaims;
  } catch {
    throw new TokenError('malformed payload');
  }
  if (typeof body.exp === 'number' && body.exp < Math.floor(Date.now() / 1000)) {
    throw new TokenError('token expired');
  }
  return body;
}
