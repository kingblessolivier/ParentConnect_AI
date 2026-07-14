# Software Requirements Specification (SRS)

**System:** ParentConnect AI · **Version:** 0.1 (baseline) · **Status:** Draft for review

This SRS restates and *sharpens* the source requirements. Functional requirements keep the stable IDs from the requirements brief (`FR-xx`, `NFR-xx`) so traceability holds. Where the brief said "the system shall be fast", this document assigns a **number and an acceptance test**.

## 1. Scope

Covers the pilot system: parent access (app + SMS; USSD/IVR subject to Q5), AI parenting coach (RAG), content & nudges, safeguarding & referral, community sessions, and M&E. Direct adolescent accounts, IVR role-play, and DHIS2 export are **out of MVP scope** (see `mvp-scope.md`).

## 2. Definitions

See [`docs/glossary.md`](../glossary.md). "p95" = 95th percentile. "Approved content" = a knowledge-base item that has passed the FR-20 workflow.

## 3. Functional requirements

Grouped by module. Each row: ID · requirement · **acceptance criterion** (how we test it). MVP column: ● in / ◐ partial / ○ deferred.

### 3.1 Access & Identity (module: `identity`)

| ID | Requirement | Acceptance criterion | MVP |
|---|---|---|:--:|
| FR-01 | Parent registers via phone number with SMS OTP | A new number completes registration only after entering a valid, unexpired (≤10 min) OTP; ≤3 failed OTPs locks the flow for 15 min | ● |
| FR-02 | Four access channels for one account: app, SMS, USSD, IVR | A message sent on SMS and a query in the app resolve to the **same** account/profile; verified by cross-channel identity test | ◐ (app+SMS) |
| FR-03 | CHW/Champion registers a parent (assisted onboarding) | A CHW role can create a parent account, capturing consent; the parent later claims/uses it via their own number | ● |
| FR-04 | Anonymous/pseudonymous use | A parent can ask a question and receive an answer without a real name stored; name field is optional and nullable | ● |
| FR-05 | Role-based access control (7 roles) | Each role's permitted actions match the authorization matrix (`security-design.md`); an out-of-role action returns 403 and is audit-logged | ● |
| FR-06 | Parent profile: district/sector, language, channel, child **age bands only** | Profile schema contains no child name/ID field; age stored as band enum (10–12/13–15/16–19) | ● |

### 3.2 AI Parenting Coach (module: `coach`)

| ID | Requirement | Acceptance criterion | MVP |
|---|---|---|:--:|
| FR-07 | Conversational coach on puberty, relationships, consent, SRH, positive parenting | For a benchmark question set, ≥95% clinically-reviewed accuracy with zero unsafe answers (gate, NFR-20) | ● |
| FR-08 | Operates in Kinyarwanda, English, French incl. mixed/informal input | Language auto-detected ≥95% on the eval set; code-switched inputs answered without error | ◐ (rw+en) |
| FR-09 | Constrained to curated, clinician-approved KB (RAG); no open-memory medical answers | 100% of health answers cite ≥1 approved source; adversarial "answer from memory" prompts are refused/grounded | ● |
| FR-10 | Tailors responses to child age band | Same question, different age band → measurably different, band-appropriate response per rubric | ● |
| FR-11 | Generates conversation starters (scripts) | Coach returns at least one usable opening script tied to the topic and age band | ● |
| FR-12 | Role-play / practice mode with feedback | Parent completes a simulated dialogue and receives tone+content feedback | ○ |
| FR-13 | Detects out-of-scope/clinical/crisis questions and escalates | On the crisis eval set, crisis recall ≥99%; out-of-scope questions refused with a referral, not answered | ● |
| FR-14 | Accessible over SMS and IVR in simplified turn-based form | An SMS/IVR turn yields a grounded answer within the channel latency budget (NFR-01) | ◐ (SMS) |
| FR-15 | Logs every AI response with source content used | 100% of coach responses have a stored record linking response ↔ retrieved source IDs ↔ prompt version | ● |

### 3.3 Learning & Content (module: `content`)

| ID | Requirement | Acceptance criterion | MVP |
|---|---|---|:--:|
| FR-16 | Micro-learning modules (text/audio/illustrated) on development, SRH, consent, protection | ≥1 module per core topic × 3 age bands published through the FR-20 workflow | ● |
| FR-17 | Scheduled SMS/push nudge campaign, segmented by age band & language | Nudges dispatch on schedule to the correct segment; opt-out honoured within one cycle | ● |
| FR-18 | Offline content pack downloadable in app | Pack downloads and renders with airplane mode on; size within data budget | ○ |
| FR-19 | Audio versions of all core content | Every published core module has an audio asset in the parent's language | ● |
| FR-20 | Content workflow draft→clinical review→approval→publish→version; nothing unapproved reaches users | A non-approved item is never served; state transitions are enforced and audit-logged | ● |

### 3.4 Safeguarding & Referral (module: `safeguarding`)

| ID | Requirement | Acceptance criterion | MVP |
|---|---|---|:--:|
| FR-21 | Detect abuse/exploitation/suicidal-ideation/pregnancy disclosures; immediately surface referral info | On the crisis eval set, referral info surfaced in ≥99% of true cases within the same turn; works with AI service down | ● |
| FR-22 | Parent/CHW/Champion can raise a confidential child-protection referral | A referral can be created and reaches the designated officer; contains no child identity (FR-24) | ● |
| FR-23 | Track referral status raised→acknowledged→actioned→closed with timestamps & actor | Each transition stores timestamp + responsible actor; overdue referrals flagged per SLA (D2) | ● |
| FR-24 | Never require a child's name/identity to serve content or issue a referral | No content or referral flow has a required child-identity field (schema-enforced) | ● |

### 3.5 Community Sessions (module: `sessions`)

| ID | Requirement | Acceptance criterion | MVP |
|---|---|---|:--:|
| FR-25 | CHWs/Champions schedule sessions and record attendance | A session can be created and attendance recorded; both visible in dashboards | ● |
| FR-26 | Facilitator guides, discussion prompts, printable materials | Each session type has a downloadable/printable guide | ● |
| FR-27 | Attendance & outcomes recorded offline, synced on reconnect | Records created offline appear server-side after sync with no data loss (see offline-sync) | ● |
| FR-28 | Link session attendance to parent's digital profile | An attending parent's profile reflects the session; cross-channel reinforcement measurable | ◐ |

### 3.6 Measurement & Administration (module: `admin`, `me`)

| ID | Requirement | Acceptance criterion | MVP |
|---|---|---|:--:|
| FR-29 | Baseline & follow-up assessment of knowledge/confidence/communication | A parent can complete baseline and follow-up; delta computed per user | ● |
| FR-30 | Indicator dashboards (reach, active by channel, completion, knowledge/confidence change, attendance, referrals) | Dashboard renders all listed indicators from live data | ● |
| FR-31 | Disaggregate indicators by district, sector, urban/rural, caregiver gender, channel | Any indicator can be filtered/grouped by each dimension | ● |
| FR-32 | Export anonymised aggregates to CSV/Excel and DHIS2 formats | CSV/Excel export works (MVP); DHIS2 export conforms to target schema | ◐ (CSV) |
| FR-33 | Admins manage users, roles, languages, campaigns, referral directories without code deploy | Each is editable via admin UI and takes effect without a deployment | ● |
| FR-34 | In-product feedback & content ratings | A parent can rate content / give feedback; visible in admin | ● |

## 4. Non-functional requirements (every one has a number)

### 4.1 Performance

| ID | Requirement (measurable) | Acceptance test |
|---|---|---|
| NFR-01 | Coach first response: **≤5 s p95 in app** under pilot load; **≤30 s p95 over SMS** | Load test at pilot concurrency; measure p95 end-to-end |
| NFR-02 | Non-AI screens load **≤2 s p95 on a 3G profile (~400 kbps, 300 ms RTT)** | Throttled synthetic test on target device |
| NFR-03 | IVR prompt responds **≤1 s p95** after keypad input | IVR harness timing |
| NFR-04 | **≥10,000 concurrent users** at pilot with **documented path to 500,000 registered** | Load test to 10k concurrent; scaling plan in system-architecture.md |

### 4.2 Availability & resilience

| ID | Requirement | Acceptance test |
|---|---|---|
| NFR-05 | **99.5% uptime monthly** (≤~3.6 h downtime/month) on core services | Uptime monitor report |
| NFR-06 | If AI is unavailable, **content + SMS + referral still function** | Chaos test: kill AI service; verify the three paths respond |
| NFR-07 | Offline-first flows (content read, session attendance) fully functional; **sync with conflict resolution** on reconnect | Offline→online integration test incl. conflicting edits |
| NFR-08 | Daily backup; **RPO ≤24 h, RTO ≤4 h** | Restore drill measured against RTO/RPO |

### 4.3 Security

| ID | Requirement | Acceptance test |
|---|---|---|
| NFR-09 | Encryption in transit **TLS 1.2+** and at rest **AES-256** | TLS scan (no <1.2, no weak ciphers); storage encryption config check |
| NFR-10 | Least privilege; **no role sees individual SRH conversation content except the user** | Authorization test matrix; attempt cross-role read → denied |
| NFR-11 | **Immutable audit log** of all admin & clinical actions | Tamper test: audit entries are append-only/verifiable |
| NFR-12 | **Pen-test before pilot and annually** | Report on file; criticals remediated pre-launch |
| NFR-13 | **No secrets in source control; prod debug disabled** | Secret-scan clean; prod config asserts debug=off |

### 4.4 Privacy & compliance

| ID | Requirement | Acceptance test |
|---|---|---|
| NFR-14 | Comply with **Law No. 058/2021**; register with supervisory authority | DPIA signed; registration evidence on file `[VERIFY]` |
| NFR-15 | Data minimisation: **no adolescent names, national IDs, or identifiable health records stored** | Schema + data audit finds none; enforced by review checklist |
| NFR-16 | **Informed consent recorded in the user's language before processing** | Consent record exists per user with language + timestamp |
| NFR-17 | Users can **view, export, delete** their data & conversation history | Self-service (or assisted) request fulfilled within policy SLA |
| NFR-18 | Personal data hosted **in Rwanda or an approved jurisdiction** | Hosting region attested in DPIA `[VERIFY: V1]` |
| NFR-19 | Transcripts retained **no longer than the retention policy**; anonymised before analytics/model use | Retention job deletes/anonymises on schedule (retention-schedule.md) |

### 4.5 AI safety & quality

| ID | Requirement | Acceptance test |
|---|---|---|
| NFR-20 | **≥95% clinically-reviewed accuracy** on benchmark set before release; **no unsafe medical advice** | Release gate in evaluation-framework.md; zero safety violations |
| NFR-21 | AI **refuses diagnosis, prescribing, termination advice**; refers to a professional | Refusal eval: 100% correct refusal on the refusal set |
| NFR-22 | Every AI response **traceable to approved source** | 100% citation coverage on health answers (see FR-15) |
| NFR-23 | **Weekly human-in-the-loop sample** with a KB-correction process | Sampling log + correction tickets exist each week |
| NFR-24 | Cultural-appropriateness review by a **local advisory panel** | Panel sign-off recorded per content batch |

### 4.6 Usability & accessibility

| ID | Requirement | Acceptance test |
|---|---|---|
| NFR-25 | Core tasks in **≤3 taps**; validated by usability testing with low-literacy parents | Task-success ≥80% in moderated test |
| NFR-26 | **All content available in audio** | Audio asset present for every core content item |
| NFR-27 | Android **8.0+**, runs on **1 GB RAM** | Installs & runs on a 1 GB/Android 8 reference device |
| NFR-28 | App package **<25 MB**; typical session **<2 MB** data | APK size check; session data-usage measurement |
| NFR-29 | IVR **toll-free** to caller; navigable entirely by **Kinyarwanda voice** | Call incurs no caller charge `[VERIFY: Q5]`; voice-only path completes |

### 4.7 Localisation & interoperability

| ID | Requirement | Acceptance test |
|---|---|---|
| NFR-30 | Fully localised **Kinyarwanda (default), English, French**; language layer separate from logic | No hard-coded UI strings; adding a locale needs no logic change |
| NFR-31 | Integrate SMS/USSD aggregators & telecom short codes (MTN, Airtel) via **swappable gateway abstraction** | Gateway interface has ≥1 adapter; swapping adapter needs no core change |
| NFR-32 | Expose **API exporting aggregate indicators to DHIS2** | Endpoint returns DHIS2-conformant payload (post-MVP) |

### 4.8 Maintainability & sustainability

| ID | Requirement | Acceptance test |
|---|---|---|
| NFR-33 | Modular, documented; **≥70% automated test coverage on core logic** | Coverage report ≥70% on core packages |
| NFR-34 | Content editable by **non-technical staff via CMS** | A non-dev publishes a content change end-to-end |
| NFR-35 | **Per-user annual cost modelled & tracked** within the sustainability envelope | cost-model.md maintained; actuals tracked vs model |
| NFR-36 | Deployable to a **new district/country by configuration** (language, referral directory, content pack), not code | A second-context deploy done via config only |

## 5. Assumptions & dependencies

See [`docs/decisions-log.md`](../decisions-log.md). Key dependencies: telecom/aggregator agreement (Q5), clinical authority (Q4), hosting decision (Q1/Q2), and an existing or Phase-0-authored knowledge base (Q3).

## 6. Traceability

Every FR/NFR above maps to design elements and tests in [`traceability-matrix.md`](./traceability-matrix.md).
