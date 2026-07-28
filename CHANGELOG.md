# Changelog

All notable changes to ParentConnect AI are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once code ships. While the project is documentation-only (pre-code), entries track the documentation baseline and architectural decisions.

## [Unreleased]

### Added
- **Backend: consolidated M&E overview** (`backend/src/modules/me/overview.ts`) — FR-30. Admin-only `GET /api/v1/dashboards/overview` returns the headline programme indicators at a glance: **reach** (total parents), **active-by-channel** and **by-language** splits, **assessment completion** (baseline/follow-up counts, completed pairs, completion rate), and **overall mean** knowledge/confidence/communication change. Pure `computeOverview()` (no I/O, PII-free, division-by-zero-safe) is unit-tested; aggregate-only output (NFR-10/19). Builds on the existing parent + assessment repos — no new cross-module coupling. 223 backend tests, ~98% coverage.
- **Backend: in-product content feedback & ratings** (`backend/src/modules/feedback`) — FR-34. Parents rate a **published** module 1–5 with an optional short comment (`POST /content/:itemId/ratings`, upsert one per parent+item) and see their own (`/ratings/mine`); a rating can only target content the content module actually serves — the feedback module **shares the content repo** and 404s drafts/unknown ids. Anonymous aggregate (count/mean/1–5 distribution) at `/ratings/summary`; admins get the cross-content dashboard (`GET /admin/content-feedback`, `/admin/content-feedback/:itemId` with comments). **Privacy (NFR-10/15):** ratings carry only the anonymous parent id (never a child); outside a parent's own row only aggregates/comments are exposed. Pure `summarise()` aggregation is unit-tested; Postgres-backed (`migrations/0007_content_ratings.sql`, `pg-mem`-tested). 219 backend tests, ~98% coverage.
- **Backend: child-protection referral case management** (`backend/src/modules/safeguarding`) — FR-22/23. Raise a **confidential** referral (`POST /referrals`; subject is the adult, category enum, **no child identity ever** — FR-24/NFR-15: notes are minimal, length-capped, identity keys structurally refused). Raisers (parent/CHW/champion/CPO/admin) track their own (`GET /referrals/mine`); officers (CPO/admin) work the full caseload with **overdue flags** (`GET /referrals`, `GET /referrals/:id`). Status advances **forward-only** `raised→acknowledged→actioned→closed` (`POST /referrals/:id/transition`, FR-23), each change writing an **append-only audit event** stamped with actor + time (NFR-11); overdue = past the SLA (`referralSlaHours`, default 48 h, **[ASSUMPTION]** pending child-protection-lead sign-off) and not closed. Postgres-backed (`migrations/0006_referrals.sql`, `pg-mem`-tested). 198 backend tests, ~98% coverage.
- **Backend: Monitoring & Evaluation** (`backend/src/modules/me`) — FR-29–32. Parents submit **non-identifying self-assessments** (`knowledge`/`confidence`/`communication`, 0–100) at **baseline** and **follow-up** (`POST /assessments/:type`, upsert one row per parent+type) and see their own computed **change** (`GET /assessments/mine`, FR-29). Admins read **anonymised, disaggregated indicators** — reach + mean baseline→follow-up change by `district`/`sector`/`urbanRural`/`caregiverGender`/`channel` (`GET /dashboards/indicators?by=`, FR-30/31) — and a matching **CSV export** (`GET /export/indicators.csv?by=`, FR-32). **Privacy (NFR-10/19):** dashboards/exports return **only aggregates** — the indicator engine (`indicators.ts`) is pure and PII-free; parents with an incomplete pair count toward reach but contribute `null` (not zero) to means. Postgres-backed (`migrations/0005_assessments.sql`, `pg-mem`-tested); no child-identity columns (FR-24/NFR-15). 175 backend tests, ~97% coverage.
- **Backend: community sessions** (`backend/src/modules/sessions`) — FR-25–28. Facilitators (CHW/champion/admin) schedule sessions, record attendance + outcomes, and get topic **discussion guides** (FR-26). **Offline-first (FR-27/NFR-07):** attendance is **idempotent on a device `client_id`** so records captured offline replay safely with no duplicates (ADR-0008). Attendance **links a session to a parent** (FR-28, never a child) and parents see their attended sessions (`GET /me/sessions`). Postgres-backed (`migrations/0004_sessions.sql`, `pg-mem`-tested). 149 backend tests, ~97% coverage.
- **Backend: scheduled nudges + messaging foundation** (`backend/src/modules/nudges`, `modules/messaging`) — FR-17, NFR-17/31, plus the outbound-messaging prerequisites:
  - **Channel gateway abstraction** (ADR-0006/NFR-31): swappable `MessageGateway` (`FakeGateway`/`LogGateway`; real aggregator adapter later).
  - **Encrypted phone** (AES-256-GCM `encryptSecret`/`decryptSecret`, migration 0003 `phone_enc`): server-initiated SMS can reach a parent; decrypted only at send time; production requires a real `PHONE_ENC_KEY` (NFR-13, NFR-09). Identity now stores it on registration.
  - **Campaigns + nudges + segmented dispatch**: create campaigns, schedule nudges, and dispatch due ones to the matching segment (child band + language), **skipping opted-out parents** (NFR-17). Admin endpoints + parent opt-out/in; in-memory + Postgres (`pg-mem`-tested) repos. 135 backend tests, ~97% coverage.
- **Backend: content & CMS approval workflow** (`backend/src/modules/content`) — FR-16/19/20. Micro-learning modules with **audio** (FR-19) and a **gated editorial state machine** (`workflow.ts`): `draft → clinical_review → cultural_review → approved → published → retired` (+ rejection paths), each **role-gated** (only admin publishes). **Nothing unapproved is ever served** — parents read only `published` modules; approvers + `publishedAt` are stamped. Postgres-backed (`migrations/0002_content.sql`, TEXT audit refs for approvers) with in-memory + `pg-mem`-tested repos. Endpoints: `GET /content`, `GET /content/:id`, `POST /cms/items`, `POST /cms/versions/:id/transition`. 118 backend tests, ~97% coverage.
- **AI service: FastAPI `/coach` endpoint** (`ai/src/parentconnect_ai/service/`) — the HTTP service the Node coach orchestrator calls (ADR-0014). `pipeline.py` assembles the real pipeline (crisis → refusal → retrieval → grounding gate → generation → citation check) into a `CoachResult`; `app.py` exposes `POST /coach` matching the Node `AiCoachResult` contract (camelCase), plus `/health`. **Generation is behind a `Generator` seam** — no LLM is wired yet (ADR-0004), so the grounded path safely returns "I don't know" until a model + approved corpus are configured; crisis/refusal/uncited answers are all suppressed to safe responses. No PII received (ADR-0004). Adds `fastapi`/`uvicorn` deps. 134 AI tests, ~99% coverage.
- **Backend: coach orchestrator ↔ AI service** (`backend/src/modules/coach`) — the Node tier calls the Python RAG service over the internal API and **never answers health questions itself** (ADR-0003/0014). A **circuit breaker + timeout** (`lib/circuit-breaker.ts`) wrap the call; on failure/slow/open-circuit it **degrades gracefully** (NFR-06): a localised "I'll answer when I can" message, the question marked queued, and **referral info always attached** (never gated by the AI, FR-21). No PII crosses to the AI service (ADR-0004). Endpoints: `POST /conversations`, `POST /conversations/:id/messages`. AI client injectable for tests. 101 backend tests, ~97% coverage.
- **Backend: PostgreSQL persistence** (ADR-0002) — the identity/consent repositories now have real Postgres implementations (`pg-repository.ts`) behind the same interfaces, plus a boring plain-SQL **migration runner** (`lib/migrate.ts` + `migrations/0001_identity.sql`). The schema has **no child-identity columns** (FR-24/NFR-15); phone numbers hashed (P2); OTPs hashed. The app boots on Postgres when `DATABASE_URL` is set (migrations run first) and falls back to in-memory repos otherwise. SQL is tested for real against an in-memory Postgres (`pg-mem`) — 84 backend tests, ~98% coverage. Adds `npm run migrate`.
- **Backend: identity & consent slice** (`backend/src/modules/identity`) — FR-01/03/04/05/06, NFR-16/17:
  - Phone + **SMS OTP** auth with rate limiting + lockout (FR-01); OTPs stored hashed, verified in constant time; HS256 session tokens (`lib/crypto.ts`, no third-party dep). Phone numbers stored **hashed** (P2).
  - **Parent profile** with **age bands only** — validation actively **rejects child-identity fields** (childName/dob/nationalId) (FR-24/NFR-15); anonymity supported (FR-04).
  - **Assisted onboarding** role-gated to CHW/champion/admin (FR-03) with RBAC enforced at the API (FR-05/NFR-10); **consent** recorded in the user's language + withdrawal (NFR-16/17).
  - Data access behind **repository interfaces** with in-memory implementations (Postgres drops in next, ADR-0002); config now requires real `JWT_SECRET`/`PHONE_PEPPER` in production (NFR-13). 75 backend tests, ~97% coverage.
- **Backend foundation (Fastify) + first slice** — Phase 1 begins:
  - **ADR-0017**: resolves the ADR-0014 framework spike → **Fastify** (lean, fast, schema validation, plugin-per-module maps to the modular monolith).
  - `backend/` is now a real app: `config.ts` (env config with a production debug-off safety assertion, NFR-13), `app.ts` (Fastify factory + RFC 9457 `application/problem+json` error handling via a pure, unit-tested `lib/error-handler.ts`), and the module-plugin convention (ADR-0011/0017).
  - **Referral directory slice** (`modules/safeguarding`, FR-21): `GET /api/v1/referral-directory?district=`, loaded from the deployment config bundle (`infra/config/rw-pilot/referral-directory.json`), **with no AI/DB dependency** (NFR-06); a missing/empty directory **fails startup** (ADR-0010).
  - 36 unit/integration tests (Fastify `inject`), coverage ~99% (NFR-33). Committed `package-lock.json` so CI `npm ci` works.
- **Eval-set authoring format** (`ai/src/parentconnect_ai/evaluation/authoring.py` + `ai/eval_sets/`): human-friendly **YAML** (JSON also accepted) format for the Kinyarwanda evaluation set, with a loader/validator (`load_and_validate`) that builds typed `EvalCase`s and rejects malformed/invalid content before it can feed the spike or release gate. Ships a structural `sample.yaml` template (explicit placeholder content — real cases are authored by clinical + cultural reviewers). Adds `pyyaml` dependency. Full unit tests; sample validated.
- **Refusal-policy detection scaffold** (`ai/src/parentconnect_ai/safety/refusal.py`, NFR-21): lexical detector for diagnosis, prescription/dosing, and termination-of-pregnancy-advice requests. Flags the reason only, not the refusal wording (warm/non-directive phrasing is a separate clinical/policy concern). Same explicitly-non-authoritative placeholder-pattern posture as `crisis.py`. Full unit tests.
- **Retrieval spike runner** (`ai/src/parentconnect_ai/retrieval/spike.py`): ties a `Retriever` to the evaluation set end-to-end — runs each eval question, maps retrieved chunks back to their approved source version ids, and reports recall@k / MRR; `compare_reports` ranks configurations. This is the mechanism for deciding the embedding/retrieval approach by measurement rather than vendor claim (ADR-0005, `docs/ai/evaluation-framework.md`). Verified against the BM25 retriever; full unit tests.
- **Crisis/disclosure detection scaffold** (`ai/src/parentconnect_ai/safety/crisis.py`, FR-13/FR-21): lexical detector for abuse, exploitation, suicidal ideation, and pregnancy disclosures, matching the "no LLM/retrieval needed" pre-generation path in `docs/ai/ai-architecture.md`. Ships with a minimal, explicitly-non-authoritative English placeholder pattern set — real Kinyarwanda/culturally-validated patterns are a safeguarding-lead + cultural-panel deliverable, not something generated here. Full unit tests.
- **Kinyarwanda embedding/NLP research** (`docs/ai/kinyarwanda-strategy.md`, `docs/decisions-log.md` V4/V8): sourced findings on candidate embedding models (BGE-M3, AfriE5) and a Kinyarwanda-specific retrieval model (KinyaColBERT/KinyaBERT via DeepKIN), plus confirmed public assets from Digital Umuganda, Mbaza NLP, and Common Voice Kinyarwanda. Partnership/licensing terms remain open.
- **Grounding gate + post-generation safety in `ai/`** (pure logic), realising `docs/ai/ai-architecture.md` stages 6 & 9 and `docs/ai/safety-and-guardrails.md`:
  - `retrieval/gate.py` — the **grounding gate**: decides if reranked retrieval results clear the relevance/count bar to generate, else route to "I don't know" (NFR-21).
  - `safety/pii.py` — output **PII scrub** (phone numbers, emails), mirroring `backend/src/lib/redact.ts`'s phone pattern for parity across the Node and Python services (NFR-10/11/15).
  - `safety/injection.py` — a lexical **prompt-injection scan** (heuristic backstop; corpus integrity and prompt delimiting remain the primary defence).
  - Full unit-test coverage for all of the above.
- **Hybrid retrieval scaffolding in `ai/`** (pure logic, no embedding model yet), realising ADR-0005 / `docs/ai/kinyarwanda-strategy.md`:
  - `retrieval/interface.py` — a model-agnostic `Retriever` protocol so dense and lexical implementations (and future embedding-model choices) are swappable.
  - `retrieval/lexical.py` — a real BM25 lexical retriever (stdlib only), the hybrid-retrieval arm that doesn't depend on an embedding model.
  - `retrieval/fusion.py` — reciprocal-rank fusion to merge dense + lexical candidate sets.
  - Full unit-test coverage for all of the above.
- **Phase 0 foundation in `ai/`** (pure logic, no models yet), realising `docs/ai/knowledge-base-spec.md` and `docs/ai/evaluation-framework.md`:
  - KB framework: `kb/schema.py`, Kinyarwanda-aware `kb/chunking.py`, and `kb/ingest.py` with an **approval guard** (only `published` content is ingestable — FR-20).
  - Evaluation harness: `evaluation/dataset.py` (eval-set schema + validation), `evaluation/retrieval_metrics.py` (recall@k, MRR), and `evaluation/gate.py` (the **release gate** encoding NFR-20/21/22 + FR-21 thresholds).
  - Full unit-test coverage for all of the above.
- **Monorepo scaffold** (structure, tooling, CI — no feature logic): `backend/` (Node+TS), `ai/` (Python), `web/` (Next.js), `mobile/` (Flutter), `infra/` (docker-compose + config bundles).
- Path-filtered **GitHub Actions CI** (`.github/workflows/ci.yml`): per-project lint/typecheck/test/build, ≥70% coverage gates (NFR-33), and repo-wide secret scanning (NFR-13).
- Seed core-logic + tests: backend PII-redaction util, AI grounding/citation checks.
- Full end-to-end development roadmap (`docs/delivery/roadmap.md`) covering inception → Phase 0 → MVP build → pilot → scale → handover, with milestones, workstreams, gates, and RACI.
- This `CHANGELOG.md`.

## [0.3.0] — 2026-07-14 — Technology stack change

### Changed
- **Backend** is now **Node.js + TypeScript** (was Python + FastAPI). ADR-0014 supersedes ADR-0001.
- **Mobile** is now **Flutter** (was native Android/Kotlin). ADR-0015 supersedes ADR-0013.
- Monorepo layout, C4 diagrams, engineering standards, roadmap, and API-spec notes updated to the new stack.

### Added
- **ADR-0014** — Backend: Node.js (TypeScript); AI/RAG service stays Python as a separate service.
- **ADR-0015** — Mobile: Flutter (records the NFR-28 <25 MB APK risk to validate early).
- **ADR-0016** — Web frontend: Next.js + React + TypeScript (staff consoles).

### Deprecated
- **ADR-0001** (Python/FastAPI) and **ADR-0013** (native Android) marked *Superseded* (history retained, not edited).

### Notes
- AI/RAG service remains **Python** by decision; the service boundary is now also the language boundary.
- Open risk: NFR-28 (<25 MB APK) is tight for Flutter — must be validated with a real release build in Phase 1.

## [0.2.0] — 2026-07-14 — Documentation baseline (Groups A–F)

### Added
- **Product & Requirements (A):** vision, personas, user journeys, SRS with measurable NFRs, MVP scope, traceability matrix.
- **Architecture (B):** C4 system architecture, 13 ADRs, data model (ERD + sensitivity classes), API spec + OpenAPI 3.1, channel design, offline-sync.
- **AI System (C):** RAG architecture, Kinyarwanda strategy, knowledge-base spec, safety & guardrails, evaluation framework (release gate), model selection, prompt library.
- **Trust, Safety & Compliance (D):** DPIA (Law 058/2021), retention schedule, child-safeguarding policy, security design, consent & transparency, AI ethics review.
- **Delivery & Operations (E):** roadmap, engineering standards, test strategy, monitoring & M&E, cost model, risk register.
- **Repository Foundation (F):** README, CLAUDE.md, CONTRIBUTING.md, glossary, decisions-log.

## [0.1.0] — 2026-07-14 — Repository initialised

### Added
- Repository bootstrapped with `main` (deployment-only) and `dev` (integration) branches.
- Git workflow established: feature branch → PR into `dev` → release PR `dev` → `main`.

[Unreleased]: https://github.com/kingblessolivier/ParentConnect_AI/compare/dev...HEAD
