# Build status & gap analysis

_Snapshot of what is actually implemented vs. the SRS, to make the remaining work explicit. Legend: ✅ built & tested · ◑ partial · ○ not started · ⛔ blocked on an external decision/partner._

This tracks **code**, not programme/ops milestones. "Built & tested" means merged into `dev` with unit/integration tests (backend ~98% coverage). It does **not** mean load-tested, pen-tested, or clinically signed off — those are Phase 2 gates.

> ⚠️ **CI is not currently running** — the GitHub account is billing-locked, so every Actions job reports failure without executing (`"The job was not started because your account is locked due to a billing issue"`). Until that's resolved, local `typecheck` + `lint` + `test:coverage` is the real gate. **Resolve before launch** so `dev`/`main` are actually guarded.

## Functional requirements

| FR | Requirement | State | Where / note |
|----|-------------|-------|--------------|
| FR-01 | Phone + SMS OTP registration | ✅ | `modules/identity` |
| FR-02 | Four channels (app/SMS/USSD/IVR), one account | ◑ | app + SMS shape built; **USSD/IVR need telecom partner (Q5)** — Phase 3 |
| FR-03 | Assisted onboarding (CHW/Champion) | ✅ | `modules/identity` |
| FR-04 | Anonymous/pseudonymous use | ✅ | no required name field |
| FR-05 | RBAC (7 roles) | ✅ | `identity/auth.ts`, enforced at API |
| FR-06 | Profile: district/sector, language, channel, **age bands only** | ✅ | child-identity fields rejected |
| FR-07 | Conversational coach | ◑ | orchestrator + pipeline built; **generation seam not wired to an LLM** (Q2/Q3) |
| FR-08 | Kinyarwanda/English/French incl. mixed | ◑ | rw+en; language strategy documented; auto-detect not built; French deferred (Q11) |
| FR-09 | RAG-only, no open-memory answers | ✅ | enforced in AI pipeline (grounding gate + citation check) |
| FR-10 | Tailor to child age band | ✅ | age band in retrieval/prompt context |
| FR-11 | Conversation starters | ✅ | coach pipeline |
| FR-12 | Role-play / practice mode | ○ | **not built** — depends on live generation (FR-07) |
| FR-13 | Detect out-of-scope/crisis & escalate | ✅ | crisis + refusal detectors (AI) + referral surfaced |
| FR-14 | SMS/IVR turn-based access | ◑ | SMS via gateway abstraction; IVR Phase 3 |
| FR-15 | Log every AI response ↔ sources | ✅ | coach records citations |
| FR-16 | Micro-learning modules | ✅ | `modules/content` |
| FR-17 | Scheduled segmented nudges | ✅ | `modules/nudges` |
| FR-18 | Offline content pack (app) | ○ | **mobile** — not built |
| FR-19 | Audio versions | ✅ | content supports audio URIs |
| FR-20 | Content approval workflow | ✅ | gated state machine, nothing unapproved served |
| FR-21 | Referral **directory** | ✅ | `modules/safeguarding`, no AI/DB dependency |
| FR-22 | Raise confidential referral | ✅ | `modules/safeguarding` (this milestone) |
| FR-23 | Track referral status + SLA | ✅ | forward-only lifecycle, append-only audit, overdue flag |
| FR-24 | Never require child identity | ✅ | structural across every module |
| FR-25 | Schedule sessions + attendance | ✅ | `modules/sessions` |
| FR-26 | Facilitator guides | ✅ | topic guides |
| FR-27 | Offline attendance, sync | ✅ | idempotent on device `client_id` |
| FR-28 | Link attendance to parent | ✅ | sessions ↔ parent |
| FR-29 | Baseline/follow-up assessment | ✅ | `modules/me` |
| FR-30 | Indicator dashboards | ✅ | overview + disaggregated indicators |
| FR-31 | Disaggregate by dimension | ✅ | district/sector/urbanRural/caregiverGender/channel |
| FR-32 | Export CSV/Excel **and DHIS2** | ◑ | **CSV done**; DHIS2 format needs target schema (Q8) — Phase 3 |
| FR-33 | Admin manage users/roles/languages/campaigns/directories | ◑ | **campaigns built**; staff user/role management + editable referral directory **not built** |
| FR-34 | In-product feedback & ratings | ✅ | `modules/feedback` |

## Non-functional requirements

| NFR | Requirement | State | Note |
|-----|-------------|-------|------|
| NFR-01–04 | Latency & concurrency budgets | ○ | not load-tested — Phase 2 |
| NFR-05 | 99.5% uptime | ○ | ops/hosting |
| NFR-06 | Degrade gracefully if AI down | ✅ | circuit breaker + timeout; referral never gated by AI |
| NFR-07 | Offline-first + sync | ◑ | attendance idempotency (backend) ✅; full offline flows are **mobile** |
| NFR-08 | Backup / RPO / RTO | ○ | ops |
| NFR-09 | TLS + AES-256 at rest | ◑ | AES-256-GCM for recoverable secrets ✅; TLS/storage are deploy config |
| NFR-10 | Least privilege | ✅ | RBAC + aggregate-only dashboards |
| NFR-11 | Immutable audit log | ◑ | referral events append-only ✅; **system-wide admin/clinical audit log not built** |
| NFR-12 | Pen-test | ○ | Phase 2 |
| NFR-13 | No secrets in source; prod debug off | ✅ | config safety asserts; secret-scan in CI (once unlocked) |
| NFR-14 | Law 058/2021 compliance, registration | ◑ | DPIA authored; **sign-off + registration are process** |
| NFR-15 | Data minimisation | ✅ | no adolescent identity anywhere |
| NFR-16 | Consent in user's language | ✅ | `modules/identity` |
| NFR-17 | View / export / delete own data | ✅ | `modules/privacy` (this milestone) |
| NFR-18 | Hosting in-region | ⛔ | Q1 — provider/region decision |
| NFR-19 | Retention / anonymisation before analytics | ○ | schedule documented; **automated retention job not built** |
| NFR-20 | ≥95% clinical accuracy release gate | ⛔ | **needs approved corpus (Q3) + clinical authority (Q4)** — Phase 0 |
| NFR-21 | Refuse diagnosis/prescribing/termination | ✅ | refusal detector (AI) |
| NFR-22 | Every answer traceable to source | ✅ | citation coverage enforced |
| NFR-23/24 | Human-in-the-loop + cultural review | ⛔ | process; needs panel (Q4) |
| NFR-25–30 | Usability/accessibility/i18n | ○ | **mobile/web** |
| NFR-28 | APK < 25 MB | ○ | mobile — flagged risk for Flutter |
| NFR-31 | Channel abstraction | ✅ | `MessageGateway` |
| NFR-33 | CI coverage gate ≥70% | ✅ | configured; backend ~98% (CI billing-locked) |

## The big remaining gaps (by size)

1. **Web staff console** (`web/`, Next.js) — **four working pages.** M&E dashboard, child-protection referral triage (with status transitions), **content-review** console (FR-20 approval workflow), and content-feedback dashboard — typed API client + demo fallback, theme-aware (light/dark). **Still to build:** admin (users/roles/campaigns) and i18n.
2. **Mobile parent app** (`mobile/`, Flutter) — **scaffold only (~5 files);** now the largest single gap. Coach chat, content reading, audio, nudges opt-in, offline pack. NFR-28 APK-size risk to validate early; the coach surface depends on AI generation (#3). **Note:** the Flutter SDK is not installed in the current build environment, so mobile work can't be compiled/tested/screenshotted here — it needs an environment with Flutter (or a local dev machine).
3. **AI generation not wired** — the RAG pipeline is built but the `Generator` seam returns "I don't know" until an LLM + approved corpus are configured. **Blocked on Q2 (model/residency) and Q3 (corpus).** This is the Phase-0 safety gate, deliberately sequenced.
4. **Smaller, self-contained backend items still open:** FR-33 staff user/role management + editable referral directory; FR-12 role-play (needs #3); NFR-11 system-wide audit log; NFR-19 retention job; FR-32 DHIS2 export (needs schema, Q8).

## What was completed in the current milestone

- **Backend:** M&E indicators + overview + CSV (FR-29–32), child-protection referral case management (FR-22/23), content feedback & ratings (FR-34), data-subject rights — export **and** erasure (NFR-17), and the editorial **review queue** (FR-20). **235 tests, ~98% coverage**, Postgres-backed with `pg-mem`-tested SQL.
- **Web staff console:** first four real pages — M&E dashboard, referral triage, content review (FR-20 workflow), content feedback. `typecheck` + `build` pass; rendered light/dark.

## Recommended next steps (in priority order)

1. **Resolve the CI billing lock** so Actions actually guard `dev`/`main` before launch.
2. **Web admin page** (users/roles/campaigns, FR-33) + a couple of backend GET endpoints it needs — fully unblocked here.
3. **Backend hardening:** NFR-11 system-wide audit log; NFR-19 retention/anonymisation job.
4. **Mobile app** — needs a Flutter-capable environment; start with the unblocked surfaces (content browsing, assessments, nudges opt-in), defer the coach until AI generation is wired.
5. **AI generation** — Phase-0 gated on approved corpus (Q3) + model/residency (Q2) + clinical authority (Q4).
