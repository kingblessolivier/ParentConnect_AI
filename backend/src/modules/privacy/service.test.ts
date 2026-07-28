import { describe, it, expect } from 'vitest';
import {
  InMemoryConsentRepository,
  InMemoryParentRepository,
} from '../identity/repository.js';
import { InMemoryAssessmentRepository } from '../me/repository.js';
import { InMemoryFeedbackRepository } from '../feedback/repository.js';
import { InMemoryReferralRepository } from '../safeguarding/referral-repository.js';
import { InMemorySessionRepository } from '../sessions/repository.js';
import { DataRightsService, type DataRightsDeps } from './service.js';

function deps(): DataRightsDeps {
  return {
    parents: new InMemoryParentRepository(),
    consents: new InMemoryConsentRepository(),
    assessments: new InMemoryAssessmentRepository(),
    feedback: new InMemoryFeedbackRepository(),
    referrals: new InMemoryReferralRepository(),
    sessions: new InMemorySessionRepository(),
  };
}

describe('DataRightsService.export', () => {
  it('404s when the account does not exist', async () => {
    await expect(new DataRightsService(deps()).export('ghost')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('assembles the account holder’s own data and omits phone secrets', async () => {
    const d = deps();
    const parent = await d.parents.create({
      phoneHash: 'secret-hash',
      phoneEnc: 'secret-enc',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
      district: 'Gasabo',
    });
    await d.consents.record({
      parentId: parent.id,
      purpose: 'coach',
      language: 'rw',
      method: 'app',
      givenAt: '2026-07-28T00:00:00Z',
    });
    await d.assessments.upsert(parent.id, 'baseline', { knowledge: 30, confidence: 30, communication: 30 });
    await d.feedback.upsert('item-1', parent.id, 4, 'clear', '2026-07-28T00:00:00Z');
    await d.referrals.create({
      raisedByParentId: parent.id,
      category: 'pregnancy',
      createdAt: '2026-07-28T00:00:00Z',
      dueBy: '2026-07-30T00:00:00Z',
    });

    const out = await new DataRightsService(d).export(parent.id);

    expect((out.profile as Record<string, unknown>).id).toBe(parent.id);
    // P2 phone secrets must never be echoed back (NFR-15).
    expect(out.profile).not.toHaveProperty('phoneHash');
    expect(out.profile).not.toHaveProperty('phoneEnc');
    expect(out.consents).toHaveLength(1);
    expect(out.assessments).toHaveLength(1);
    expect(out.contentRatings).toHaveLength(1);
    expect(out.referralsRaised).toHaveLength(1);
    // referrals export status only — no notes/actor detail
    expect(Object.keys((out.referralsRaised as unknown[])[0] as object).sort()).toEqual([
      'category',
      'createdAt',
      'id',
      'status',
    ]);
    expect(out.exportedAt).toBeTypeOf('string');
  });

  it('returns only the caller’s own records, never another parent’s', async () => {
    const d = deps();
    const a = await d.parents.create({
      phoneHash: 'a',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    const b = await d.parents.create({
      phoneHash: 'b',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    await d.assessments.upsert(b.id, 'baseline', { knowledge: 1, confidence: 1, communication: 1 });

    const out = await new DataRightsService(d).export(a.id);
    expect(out.assessments).toHaveLength(0);
  });
});

describe('DataRightsService.erase', () => {
  it('404s when the account does not exist', async () => {
    await expect(new DataRightsService(deps()).erase('ghost')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('removes the profile + personal records but retains anonymised referrals', async () => {
    const d = deps();
    const parent = await d.parents.create({
      phoneHash: 'h',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    await d.consents.record({
      parentId: parent.id,
      purpose: 'coach',
      language: 'rw',
      method: 'app',
      givenAt: '2026-07-28T00:00:00Z',
    });
    await d.assessments.upsert(parent.id, 'baseline', { knowledge: 1, confidence: 1, communication: 1 });
    await d.feedback.upsert('item-1', parent.id, 5, undefined, '2026-07-28T00:00:00Z');
    const session = await d.sessions.createSession({
      facilitatorId: 'chw-1',
      district: 'Gasabo',
      sector: 'Remera',
      topic: 'communication',
      scheduledAt: '2026-08-01T09:00:00Z',
    });
    await d.sessions.recordAttendance(session.id, parent.id, 'client-1', '2026-08-01T09:05:00Z');
    await d.referrals.create({
      raisedByParentId: parent.id,
      category: 'abuse',
      createdAt: '2026-07-28T00:00:00Z',
      dueBy: '2026-07-30T00:00:00Z',
    });

    const result = await new DataRightsService(d).erase(parent.id);
    expect(result.erased).toContain('profile');
    expect(result.retained[0]).toContain('referral');

    // Everything personal is gone…
    expect(await d.parents.findById(parent.id)).toBeNull();
    expect(await d.consents.listForParent(parent.id)).toHaveLength(0);
    expect(await d.assessments.listForParent(parent.id)).toHaveLength(0);
    expect(await d.feedback.listForParent(parent.id)).toHaveLength(0);
    expect(await d.sessions.listSessionsForParent(parent.id)).toHaveLength(0);
    // …but the session itself and the anonymised referral remain.
    expect(await d.sessions.getSession(session.id)).not.toBeNull();
    expect(await d.referrals.listForParent(parent.id)).toHaveLength(1);
  });

  it('reports no retained referrals when the parent raised none', async () => {
    const d = deps();
    const parent = await d.parents.create({
      phoneHash: 'h',
      role: 'parent',
      preferredLanguage: 'rw',
      preferredChannel: 'sms',
      childBands: ['13_15'],
    });
    const result = await new DataRightsService(d).erase(parent.id);
    expect(result.retained).toHaveLength(0);
  });
});
