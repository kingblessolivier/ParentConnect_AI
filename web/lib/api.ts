/**
 * Thin API client for the staff consoles.
 *
 * The console never trusts itself for authorization — every call carries the
 * staff bearer token and the backend enforces RBAC (NFR-10). The base URL and
 * token come from the environment; there are no secrets in this bundle.
 */

import { getToken } from './session';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function authHeaders(token?: string): Record<string, string> {
  // A signed-in staff session wins; NEXT_PUBLIC_STAFF_TOKEN is a dev/demo fallback.
  const t = token ?? getToken() ?? process.env.NEXT_PUBLIC_STAFF_TOKEN;
  return t ? { authorization: `Bearer ${t}` } : {};
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...authHeaders(token) },
    cache: 'no-store',
  });
  if (!res.ok) throw new ApiError(res.status, `GET ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, `POST ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, `PATCH ${path} → ${res.status}`);
  return (await res.json()) as T;
}

/** For file-download endpoints (e.g. CSV export) that need the auth header. */
export async function apiGetBlob(path: string, token?: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...authHeaders(token) },
    cache: 'no-store',
  });
  if (!res.ok) throw new ApiError(res.status, `GET ${path} → ${res.status}`);
  return res.blob();
}
