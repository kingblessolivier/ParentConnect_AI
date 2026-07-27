/**
 * Authentication helpers: extract the caller from a bearer token, and enforce
 * roles (RBAC, FR-05). Authorisation is enforced here at the API — never trusted
 * from the client.
 */

import type { FastifyRequest } from 'fastify';
import { AppError } from '../../lib/problem.js';
import { TokenError, verifyToken } from '../../lib/crypto.js';
import type { Role } from './types.js';

export interface AuthContext {
  parentId: string;
  role: Role;
}

export function authenticate(request: FastifyRequest, secret: string): AuthContext {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Unauthorized', 'Missing bearer token');
  }
  const token = header.slice('Bearer '.length).trim();
  let claims;
  try {
    claims = verifyToken(token, secret);
  } catch (err) {
    if (err instanceof TokenError) throw new AppError(401, 'Unauthorized', 'Invalid token');
    throw err;
  }
  if (claims.type && claims.type !== 'access') {
    throw new AppError(401, 'Unauthorized', 'Not an access token');
  }
  return { parentId: claims.sub, role: claims.role as Role };
}

export function requireRole(context: AuthContext, allowed: readonly Role[]): void {
  if (!allowed.includes(context.role)) {
    // 403 + (the caller logs an audit event, NFR-11).
    throw new AppError(403, 'Forbidden', 'Your role may not perform this action');
  }
}
