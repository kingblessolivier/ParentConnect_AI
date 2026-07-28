/**
 * Data-subject rights service (NFR-17, Law No. 058/2021).
 *
 * Assembles everything the platform holds about the authenticated account
 * holder into a single portable export. It reads across modules through their
 * repository interfaces — the same instances the modules use — so the export is
 * always consistent with live data.
 *
 * Note on scope: the subject is the ADULT account holder. There is no child
 * data anywhere to export (FR-24/NFR-15). Child-protection referrals are
 * included as the caller's own raised cases (status only) — they carry no
 * identity and are retained for safeguarding reasons even after erasure.
 */

import { AppError } from '../../lib/problem.js';
import type { ConsentRepository, ParentRepository } from '../identity/repository.js';
import type { AssessmentRepository } from '../me/repository.js';
import type { FeedbackRepository } from '../feedback/repository.js';
import type { ReferralRepository } from '../safeguarding/referral-repository.js';
import type { SessionRepository } from '../sessions/repository.js';

export interface DataRightsDeps {
  parents: ParentRepository;
  consents: ConsentRepository;
  assessments: AssessmentRepository;
  feedback: FeedbackRepository;
  referrals: ReferralRepository;
  sessions: SessionRepository;
}

export class DataRightsService {
  constructor(private readonly deps: DataRightsDeps) {}

  /**
   * A complete, portable snapshot of the caller's own data (NFR-17). Every
   * section is the account holder's own records — never anyone else's.
   */
  async export(parentId: string): Promise<Record<string, unknown>> {
    const profile = await this.deps.parents.findById(parentId);
    if (!profile) throw new AppError(404, 'Not Found', 'no such account');

    const [consents, assessments, ratings, referrals, sessions] = await Promise.all([
      this.deps.consents.listForParent(parentId),
      this.deps.assessments.listForParent(parentId),
      this.deps.feedback.listForParent(parentId),
      this.deps.referrals.listForParent(parentId),
      this.deps.sessions.listSessionsForParent(parentId),
    ]);

    // Never echo internal-only secrets back (phoneHash/phoneEnc are P2, NFR-15).
    const safeProfile: Record<string, unknown> = { ...profile };
    delete safeProfile.phoneHash;
    delete safeProfile.phoneEnc;

    return {
      exportedAt: new Date().toISOString(),
      subject: 'account-holder',
      profile: safeProfile,
      consents,
      assessments,
      contentRatings: ratings,
      referralsRaised: referrals.map((r) => ({
        id: r.id,
        category: r.category,
        status: r.status,
        createdAt: r.createdAt,
      })),
      sessionsAttended: sessions,
    };
  }

  /**
   * Erase the caller's account and personal records (right to be forgotten,
   * NFR-17). Removes the profile, consents, assessments, content ratings, and
   * session-attendance links.
   *
   * Deliberately RETAINED: child-protection referrals the parent raised. They
   * carry no identity (FR-24) and are kept on a safeguarding/legal basis —
   * erasing a disclosure of abuse would defeat the safeguarding pathway. The
   * response states plainly what was removed and what was retained.
   */
  async erase(parentId: string): Promise<{ erased: string[]; retained: string[] }> {
    if (!(await this.deps.parents.findById(parentId))) {
      throw new AppError(404, 'Not Found', 'no such account');
    }
    const retainedReferrals = await this.deps.referrals.listForParent(parentId);

    // Remove dependants before the parent (FK-safe order in Postgres).
    await this.deps.consents.deleteForParent(parentId);
    await this.deps.assessments.deleteForParent(parentId);
    await this.deps.feedback.deleteForParent(parentId);
    await this.deps.sessions.deleteAttendanceForParent(parentId);
    await this.deps.parents.delete(parentId);

    return {
      erased: ['profile', 'consents', 'assessments', 'contentRatings', 'sessionAttendance'],
      retained:
        retainedReferrals.length > 0
          ? [`${retainedReferrals.length} child-protection referral(s) (anonymised; safeguarding basis)`]
          : [],
    };
  }
}
