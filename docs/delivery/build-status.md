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
| FR-18 | Offline content pack (app) | ◑ | referral directory cached on device (`mobile/help_store.dart`); full content pack not built |
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
| FR-33 | Admin manage users/roles/campaigns/directories | ✅ | campaigns, staff user/role management (`modules/identity`), **and the editable referral directory** (`modules/safeguarding`) — all with console pages |
| FR-34 | In-product feedback & ratings | ✅ | `modules/feedback` |

## Non-functional requirements

| NFR | Requirement | State | Note |
|-----|-------------|-------|------|
| NFR-01–04 | Latency & concurrency budgets | ○ | not load-tested — Phase 2 |
| NFR-05 | 99.5% uptime | ○ | ops/hosting |
| NFR-06 | Degrade gracefully if AI down | ✅ | circuit breaker + timeout; referral never gated by AI |
| NFR-07 | Offline-first + sync | ◑ | attendance idempotency (backend) ✅; **help contacts cached on device** ✅; content pack + queued coach messages not built |
| NFR-08 | Backup / RPO / RTO | ○ | ops |
| NFR-09 | TLS + AES-256 at rest | ◑ | AES-256-GCM for recoverable secrets ✅; TLS/storage are deploy config |
| NFR-10 | Least privilege | ✅ | RBAC + aggregate-only dashboards |
| NFR-11 | Immutable audit log | ✅ | `modules/audit` — system-wide, append-only by construction (no update/delete in the seam), admin-only read, metadata sanitised. DB-side `REVOKE` is a documented provisioning step |
| NFR-12 | Pen-test | ○ | Phase 2 |
| NFR-13 | No secrets in source; prod debug off | ✅ | config safety asserts; secret-scan in CI (once unlocked) |
| NFR-14 | Law 058/2021 compliance, registration | ◑ | DPIA authored; **sign-off + registration are process** |
| NFR-15 | Data minimisation | ✅ | no adolescent identity anywhere |
| NFR-16 | Consent in user's language | ✅ | `modules/identity` |
| NFR-17 | View / export / delete own data | ✅ | `modules/privacy` (this milestone) |
| NFR-18 | Hosting in-region | ⛔ | Q1 — provider/region decision |
| NFR-19 | Retention / anonymisation before analytics | ◑ | `npm run retention` enforces the schedule and audit-logs counts only; **most rules have no data to act on yet** (message bodies aren't persisted), and the job reports that rather than implying full coverage |
| NFR-20 | ≥95% clinical accuracy release gate | ⛔ | **needs approved corpus (Q3) + clinical authority (Q4)** — Phase 0 |
| NFR-21 | Refuse diagnosis/prescribing/termination | ✅ | refusal detector (AI) |
| NFR-22 | Every answer traceable to source | ✅ | citation coverage enforced |
| NFR-23/24 | Human-in-the-loop + cultural review | ⛔ | process; needs panel (Q4) |
| NFR-25–30 | Usability/accessibility/i18n | ◑ | mobile: large type, ≥52 px targets, audio at title weight (NFR-25/26); **i18n (NFR-30) not built — the app is English-only strings today** |
| NFR-28 | APK < 25 MB | ⛔ | **cannot be measured**: `mobile/` has no `android/`/`ios/` platform folders, so no release build exists. Needs an application ID decided, then `flutter create --platforms=android .` |
| NFR-31 | Channel abstraction | ✅ | `MessageGateway` |
| NFR-33 | CI coverage gate ≥70% | ✅ | configured; backend ~98% (CI billing-locked) |

## The big remaining gaps (by size)

1. **AI generation is not wired** — the RAG pipeline is complete but the `Generator` seam returns "I don't know" until an approved corpus and a model exist. **Blocked on Q3 (corpus), Q4 (clinical authority), Q2 (model/residency).** This is the Phase-0 safety gate working as designed, and it gates FR-07, FR-12 and NFR-20/23/24.
2. **Mobile is three screens, not an app** — coach, lessons and get-help work; onboarding/consent (FR-03/NFR-16), nudges opt-in (FR-17), assessments (FR-29), the offline content pack (FR-18), CHW session capture (FR-25–28), app-lock for shared phones (J3) and i18n (NFR-30) are not built. **No platform folders, so NFR-28 is unmeasured.**
3. **Ops/compliance items that aren't code:** pen-test (NFR-12), DPIA sign-off + supervisory registration (NFR-14), hosting region (NFR-18/Q1), load testing (NFR-01–05), backup/DR (NFR-08), and the **CI billing lock**.
4. **Smaller open items:** FR-32 DHIS2 export (needs the target schema, Q8), FR-08 language auto-detect, FR-02/14 USSD+IVR (needs a telecom partner, Q5), and a web admin page for campaigns.

## What was completed in the current milestone

- **Backend:** system-wide immutable audit log (NFR-11), editable referral directory as an override layer over the file baseline (FR-33), the retention job (NFR-19), admin users & roles (FR-33), and a **CORS allowlist** — the last of which fixed a gap where the console could never actually reach the API from a browser and silently showed demo data on every page. **303 tests.**
- **Web:** audit log and referral-directory pages added; 10 routes build.
- **Mobile:** first real screens — coach, lessons, and an always-available get-help that works with no login, AI or network. `flutter analyze` clean, 5 widget tests.

## Recommended next steps (in priority order)

1. **Unblock Phase 0** — Q3 (corpus) and Q4 (clinical reviewer). Nothing about the coach can be proven safe until these exist, and they gate launch.
2. **Resolve the CI billing lock** so Actions actually guard `dev`/`main`.
3. **Decide the mobile application ID**, generate platform folders, and measure a release APK against NFR-28 — the earlier this risk is real, the cheaper it is.
4. **Continue mobile** — onboarding/consent and assessments are unblocked today; the coach surface is already built and will start answering the moment generation is wired.
5. **Q2 (model/residency)** so the NVIDIA/NIM generator can be switched on against the eval set.
