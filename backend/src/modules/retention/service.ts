/**
 * Retention job (NFR-19).
 *
 * Applies the ratified retention schedule on a schedule (a cron/worker calls
 * `run()`), deleting or anonymising what has aged out and recording **counts
 * only** to the audit log — never the content it removed (NFR-11/15,
 * retention-schedule.md rule 2).
 *
 * Two guardrails are deliberate:
 *  - **Nothing is deleted that the schedule marks `retain`.** Referrals carry a
 *    child-protection legal duty and audit events are immutable; the job has no
 *    code path that touches either.
 *  - **Coverage is reported, not implied.** `run()` returns the rules it could
 *    not enforce (because the data isn't persisted yet) so an operator can see
 *    the difference between "nothing expired" and "not actually enforced".
 */

import type { AuditService } from '../audit/service.js';
import type { OtpRepository } from '../identity/repository.js';
import { enforceableRules, RETENTION_RULES, type RetentionRule } from './policy.js';

export interface RetentionDeps {
  otpRepo: OtpRepository;
  audit?: AuditService;
}

export interface RetentionOutcome {
  data: string;
  removed: number;
}

export interface RetentionReport {
  ranAt: string;
  applied: RetentionOutcome[];
  /** Rules with no data to act on yet — reported so coverage stays visible. */
  notEnforced: { data: string; note: string }[];
  totalRemoved: number;
}

export class RetentionService {
  constructor(private readonly deps: RetentionDeps) {}

  async run(now: Date = new Date()): Promise<RetentionReport> {
    const applied: RetentionOutcome[] = [];

    for (const rule of enforceableRules()) {
      const removed = await this.applyRule(rule, now);
      applied.push({ data: rule.data, removed });
    }

    const totalRemoved = applied.reduce((sum, a) => sum + a.removed, 0);
    const report: RetentionReport = {
      ranAt: now.toISOString(),
      applied,
      notEnforced: RETENTION_RULES.filter((r) => !r.appliesToday).map((r) => ({
        data: r.data,
        note: r.note,
      })),
      totalRemoved,
    };

    // Deletions are audit-logged as an action + count, never content.
    if (totalRemoved > 0) {
      this.deps.audit?.recordSafely({
        actorId: 'system:retention',
        actorRole: 'admin',
        action: 'retention.applied',
        entity: 'retention',
        entityId: report.ranAt,
        metadata: Object.fromEntries(applied.map((a) => [a.data, String(a.removed)])),
      });
    }

    return report;
  }

  private async applyRule(rule: RetentionRule, now: Date): Promise<number> {
    switch (rule.data) {
      case 'otp':
        return this.deps.otpRepo.deleteExpired(now.getTime());
      default:
        // A rule marked enforceable with no handler is a wiring bug, not a
        // silent no-op — surface it rather than quietly retaining data.
        throw new Error(`retention rule '${rule.data}' is marked enforceable but has no handler`);
    }
  }
}
