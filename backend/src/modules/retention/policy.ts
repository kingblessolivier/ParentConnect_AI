/**
 * Retention policy (NFR-19) — the schedule in
 * `docs/compliance/retention-schedule.md` expressed as data.
 *
 * Every period here is a **proposed default pending DPO ratification**
 * (`[VERIFY]` in that document). They live in one place so the job, the docs,
 * and any future review argue from the same numbers rather than drifting.
 *
 * `appliesToday` records something important and easy to lose: most rows in the
 * schedule have **nothing to act on yet**, because the data they govern isn't
 * persisted yet (coach message bodies) or is retained under a legal duty
 * (referrals) or is immutable by design (the audit log). Marking that
 * explicitly keeps the job honest about its own coverage instead of silently
 * implying the whole schedule is enforced.
 */

export interface RetentionRule {
  /** Matches a row in docs/compliance/retention-schedule.md. */
  data: string;
  /** Retention window in days; `null` = retained (no scheduled expiry). */
  days: number | null;
  onExpiry: 'hard_delete' | 'anonymise' | 'retain';
  /** Whether this job can enforce the rule against data that exists today. */
  appliesToday: boolean;
  note: string;
}

export const RETENTION_RULES: readonly RetentionRule[] = [
  {
    data: 'otp',
    days: 0,
    onExpiry: 'hard_delete',
    appliesToday: true,
    note: 'One-time codes are spent or expired within minutes; stale hashes have no reason to linger (FR-01).',
  },
  {
    data: 'coach_message_body',
    days: 90,
    onExpiry: 'hard_delete',
    appliesToday: false,
    note: 'P3. Nothing to purge yet — message persistence is a later slice, so no bodies are stored.',
  },
  {
    data: 'conversation_metadata',
    days: 365,
    onExpiry: 'anonymise',
    appliesToday: false,
    note: 'Depends on conversation persistence landing first.',
  },
  {
    data: 'referral',
    days: null,
    onExpiry: 'retain',
    appliesToday: false,
    note: 'Child-protection legal obligation may require longer retention; never auto-deleted here (FR-24 means no child identity is held regardless).',
  },
  {
    data: 'audit_event',
    days: null,
    onExpiry: 'retain',
    appliesToday: false,
    note: 'Immutable accountability record (NFR-11) — the job must never delete these.',
  },
  {
    data: 'assessment',
    days: null,
    onExpiry: 'anonymise',
    appliesToday: false,
    note: 'Already non-identifying and aggregate-only in dashboards; detaching the parent link would break a parent\'s own view of their data (NFR-17).',
  },
];

/** The cutoff instant for a rule, given "now". */
export function cutoffFor(rule: RetentionRule, now: Date): Date | null {
  if (rule.days === null) return null;
  return new Date(now.getTime() - rule.days * 24 * 60 * 60 * 1000);
}

export function enforceableRules(): RetentionRule[] {
  return RETENTION_RULES.filter((r) => r.appliesToday);
}
