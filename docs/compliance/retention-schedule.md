# Data Retention Schedule

A standalone, ratifiable page (the DPO signs *this*). Realises **NFR-19**. All periods below are **proposed defaults `[VERIFY]`** pending legal/clinical ratification; the principle is **retain the minimum, delete on schedule, anonymise before analytics**.

## Schedule

| Data | Class | Default retention | On expiry | Notes |
|---|---|---|---|---|
| Coach conversation content (`MESSAGE.body`) | P3 | **90 days** `[VERIFY]` from last activity | Hard delete | `CONVERSATION.purge_after` job; earliest safe window that still supports the weekly human review (NFR-23) |
| Conversation metadata (flags, `prompt_version`, source links) | P1 | 12 months `[VERIFY]` | Anonymise/aggregate | Needed for audit/eval; de-identified |
| Referral records & events | P3 | Per child-protection legal obligation `[VERIFY]` | Retain per law, then delete | May exceed default due to legal duty; no child identity stored regardless (FR-24) |
| Parent profile (phone, district, bands) | P1/P2 | Life of account + 30 days after deletion request | Delete/tombstone | Erasure cascades (NFR-17) |
| Consent records | P1 | Life of account + statutory minimum `[VERIFY]` | Retain then delete | Proof of lawful basis |
| Assessment results | P1 | Programme duration, then anonymise | Aggregate only | M&E (FR-29) |
| Audit log | P1/P2 | ≥ pilot duration `[VERIFY statutory min]` | Retain (immutable) | Accountability (NFR-11); no P3 bodies |
| Session/attendance | P1 | Programme duration | Anonymise/aggregate | Links to profile (FR-28) |
| Backups | mirror of source | Rolling, ≤ 35 days `[VERIFY]` | Age out | Erasure reconciled against backups per policy |
| Analytics/derived datasets | anonymised | Indefinite (non-personal) | — | Must be genuinely anonymised (NFR-19) |

## Rules

1. **Anonymise before analytics or model-improvement use** (NFR-19) — no raw P3 leaves the operational store for analytics.
2. **Automated enforcement:** a scheduled job deletes/anonymises on expiry; deletions are audit-logged (action only, no content).
3. **Erasure requests (NFR-17)** are honoured within the response SLA and reconciled against backups per the backup policy.
4. **Legal override:** child-protection or other legal obligations may *require* longer retention of specific records — documented per record type, never as a blanket extension, and never introducing child identity.
5. **Minimisation first:** the cheapest retention risk is data never collected — see `data-model.md` absent fields.

## Verification (test hooks)

- TC-comp-019: create P3 content dated past `purge_after` → job deletes it; audit shows a delete event with no body.
- Erasure request → profile tombstoned, P2/P3 removed, backup reconciliation scheduled.

## Ratification

- [ ] DPO sign-off on each period `[VERIFY]`
- [ ] Clinical lead confirms 90-day window supports safe review
- [ ] Legal confirms statutory minimums for consent/audit/referral records
