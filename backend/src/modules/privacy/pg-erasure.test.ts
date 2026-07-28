/**
 * Integration test for erasure against real SQL (pg-mem): proves the delete
 * order is FK-safe and that the referral row (with its FK'd events) survives.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import type { Queryable } from '../../lib/db.js';
import { runMigrations } from '../../lib/migrate.js';
import { PgConsentRepository, PgParentRepository } from '../identity/pg-repository.js';
import { PgAssessmentRepository } from '../me/pg-repository.js';
import { PgFeedbackRepository } from '../feedback/pg-repository.js';
import { PgReferralRepository } from '../safeguarding/referral-pg-repository.js';
import { PgSessionRepository } from '../sessions/pg-repository.js';
import { DataRightsService } from './service.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../migrations');

async function freshDb(): Promise<Queryable> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;
  await runMigrations(pool, MIGRATIONS_DIR);
  return pool;
}

describe('erasure against Postgres', () => {
  let db: Queryable;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('deletes dependants before the parent and retains the referral', async () => {
    const parents = new PgParentRepository(db);
    const consents = new PgConsentRepository(db);
    const assessments = new PgAssessmentRepository(db);
    const feedback = new PgFeedbackRepository(db);
    const referrals = new PgReferralRepository(db);
    const sessions = new PgSessionRepository(db);

    const parent = await parents.create({
      phoneHash: 'h1',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    await consents.record({
      parentId: parent.id,
      purpose: 'coach',
      language: 'rw',
      method: 'app',
      givenAt: '2026-07-28T00:00:00Z',
    });
    await assessments.upsert(parent.id, 'baseline', { knowledge: 1, confidence: 1, communication: 1 });
    await feedback.upsert('11111111-1111-1111-1111-111111111111', parent.id, 4, undefined, '2026-07-28T00:00:00Z');
    const session = await sessions.createSession({
      facilitatorId: 'chw-1',
      district: 'Gasabo',
      sector: 'Remera',
      topic: 'communication',
      scheduledAt: '2026-08-01T09:00:00Z',
    });
    await sessions.recordAttendance(session.id, parent.id, 'client-1', '2026-08-01T09:05:00Z');
    await referrals.create({
      raisedByParentId: parent.id,
      category: 'abuse',
      createdAt: '2026-07-28T00:00:00Z',
      dueBy: '2026-07-30T00:00:00Z',
    });

    const service = new DataRightsService({ parents, consents, assessments, feedback, referrals, sessions });
    const result = await service.erase(parent.id);

    expect(result.erased).toContain('profile');
    expect(result.retained).toHaveLength(1);

    expect(await parents.findById(parent.id)).toBeNull();
    expect(await consents.listForParent(parent.id)).toHaveLength(0);
    expect(await assessments.listForParent(parent.id)).toHaveLength(0);
    expect(await feedback.listForParent(parent.id)).toHaveLength(0);
    expect(await sessions.listSessionsForParent(parent.id)).toHaveLength(0);
    // The session record and the anonymised referral both remain.
    expect(await sessions.getSession(session.id)).not.toBeNull();
    expect(await referrals.listForParent(parent.id)).toHaveLength(1);
  });
});
