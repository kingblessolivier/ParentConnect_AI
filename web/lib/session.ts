/**
 * Staff session storage (browser only). Holds the access token issued by
 * POST /api/v1/auth/otp/verify — the same identity flow parents use, since
 * staff are just accounts with a non-'parent' role (backend/src/modules/identity).
 *
 * The JWT payload is decoded here **for display only** (who's signed in, what
 * role) — the backend is the sole authority on authorization (NFR-10); nothing
 * client-side ever grants access based on this decode.
 */

const STORAGE_KEY = 'pc_staff_token';

export interface SessionClaims {
  sub: string;
  role: string;
  exp?: number;
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return atob(padded);
}

export function decodeClaims(token: string): SessionClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]!)) as SessionClaims;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem(STORAGE_KEY);
  if (!token) return null;
  const claims = decodeClaims(token);
  if (claims?.exp && claims.exp * 1000 < Date.now()) {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return token;
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getSession(): SessionClaims | null {
  const token = getToken();
  return token ? decodeClaims(token) : null;
}
