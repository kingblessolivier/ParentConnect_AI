/**
 * Crypto helpers: phone hashing, OTP generation, and HS256 tokens.
 *
 * - Phone numbers are stored **hashed** (P2, data-model.md) with a keyed HMAC so
 *   lookups are deterministic but the number isn't recoverable from the store.
 * - Tokens are HS256 JWTs signed with the app secret (no third-party dep — the
 *   algorithm is small and boring). Secrets come from config, never source (NFR-13).
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

export function hmacHex(value: string, key: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

/**
 * Reversible encryption for data we must recover but keep confidential at rest
 * (AES-256 per NFR-09) — e.g. a phone number needed to deliver server-initiated
 * SMS/IVR. `keyHex` is 32 bytes (64 hex chars). Output is base64(iv|tag|cipher).
 */
export function encryptSecret(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptSecret(payload: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
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
