/**
 * Editorial workflow state machine (FR-20).
 *
 * draft → clinical_review → cultural_review → approved → published → retired,
 * with rejection paths back to draft. Only these transitions are legal, and each
 * is role-gated (FR-05). Nothing reaches a parent until `published`.
 *
 * NOTE: clinical vs cultural reviewer are both modelled as the `reviewer` role
 * for now; the data-model tracks the two approver names separately, and a
 * dedicated cultural-panel role is a later refinement.
 */

import { AppError } from '../../lib/problem.js';
import type { Role } from '../identity/types.js';
import type { ContentStatus } from './types.js';

export interface Transition {
  from: ContentStatus;
  to: ContentStatus;
  roles: readonly Role[];
  /** Which approver field this transition stamps, if any. */
  stamps?: 'clinical' | 'cultural';
}

export const TRANSITIONS: readonly Transition[] = [
  { from: 'draft', to: 'clinical_review', roles: ['reviewer', 'admin'] },
  { from: 'clinical_review', to: 'cultural_review', roles: ['reviewer', 'admin'], stamps: 'clinical' },
  { from: 'clinical_review', to: 'draft', roles: ['reviewer', 'admin'] }, // clinical reject
  { from: 'cultural_review', to: 'approved', roles: ['reviewer', 'admin'], stamps: 'cultural' },
  { from: 'cultural_review', to: 'draft', roles: ['reviewer', 'admin'] }, // cultural reject
  { from: 'approved', to: 'published', roles: ['admin'] },
  { from: 'published', to: 'retired', roles: ['admin'] },
];

export function findTransition(from: ContentStatus, to: ContentStatus): Transition | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/**
 * Assert a transition is legal for a role, or throw:
 *  - 400 if the (from → to) transition doesn't exist,
 *  - 403 if the role isn't permitted.
 */
export function assertCanTransition(from: ContentStatus, to: ContentStatus, role: Role): Transition {
  const transition = findTransition(from, to);
  if (!transition) {
    throw new AppError(400, 'Invalid transition', `Cannot move content from ${from} to ${to}`);
  }
  if (!transition.roles.includes(role)) {
    throw new AppError(403, 'Forbidden', `Role ${role} may not perform ${from} → ${to}`);
  }
  return transition;
}
