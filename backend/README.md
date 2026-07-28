# backend — Node.js + TypeScript API (Fastify)

The core backend (modular monolith) for ParentConnect AI. See [ADR-0014](../docs/architecture/adr/0014-backend-nodejs.md), [ADR-0017 (Fastify)](../docs/architecture/adr/0017-backend-http-framework.md), and [system-architecture.md](../docs/architecture/system-architecture.md).

> **Phase 1 in progress.** The app boots and serves its first safety-critical slice (the referral directory). Remaining modules land slice by slice (`docs/delivery/roadmap.md`).

## App structure

```
src/
  index.ts        bootstrap: load config -> buildApp -> listen
  app.ts          Fastify app factory: error handler, health, module registration
  config.ts       env config + production safety assertions (NFR-13)
  lib/
    problem.ts        RFC 9457 problem+json types + AppError
    error-handler.ts  pure error -> problem mapping (fully unit-tested)
    redact.ts         PII redaction for logs/audit (NFR-10/15)
  modules/
    <module>/
      routes.ts       async Fastify plugin (registered by app.ts)
      <feature>.ts    logic (pure where possible, unit-tested)
```

**Module-plugin convention (ADR-0011/0017):** each domain module (identity, coach, content, safeguarding, sessions, m&e, admin) is an async Fastify plugin registered by `app.ts`. Business logic is pure and unit-tested; routes are thin. A module that needs config validates it at registration so a bad deploy fails fast at boot (e.g. an empty referral directory, ADR-0010).

## Implemented so far

- **Health**: `GET /health`.
- **Referral directory** (FR-21): `GET /api/v1/referral-directory?district=` — loaded from the deployment config bundle, **available with no AI/DB dependency** (NFR-06); startup fails if the directory is missing/empty (ADR-0010).
- **Identity & consent** (`modules/identity`):
  - `POST /api/v1/auth/otp/request` · `POST /api/v1/auth/otp/verify` — phone + SMS OTP with rate limiting/lockout (FR-01); OTPs stored hashed; HS256 session tokens.
  - `GET /api/v1/me` · `PATCH /api/v1/me` — profile with **age bands only**; forbidden child-identity fields are rejected (FR-06/24, NFR-15).
  - `POST /api/v1/parents` — assisted onboarding, role-gated to CHW/champion/admin (FR-03/05).
  - `POST /api/v1/consent` · `POST /api/v1/consent/withdraw` — recorded in the user's language (NFR-16/17).
  - Auth/RBAC enforced at the API (`auth.ts`), never trusted from the client (NFR-10).
- **Persistence** (ADR-0002): **PostgreSQL** repository implementations (`pg-repository.ts`) behind the same interfaces, plus a plain-SQL **migration runner** (`lib/migrate.ts`, `migrations/*.sql`). The schema has **no child-identity columns** (FR-24/NFR-15). When `DATABASE_URL` is set the app boots on Postgres (running migrations first); otherwise it uses in-memory repos. Repos are tested against an in-memory Postgres (`pg-mem`), so the SQL is exercised for real without a live DB.

## Database

```bash
docker compose -f ../infra/docker-compose.yml up -d db   # Postgres + pgvector
export DATABASE_URL=postgres://parentconnect:parentconnect@localhost:5432/parentconnect
npm run migrate                                           # apply migrations
npm run dev                                               # boots on Postgres
```

Without `DATABASE_URL`, the app runs on in-memory repositories (handy for local UI work and tests).

## Coach (AI) — `modules/coach`

The Node tier **never answers health questions itself** — it calls the Python AI/RAG service (ADR-0003/0014):
- `POST /api/v1/conversations` → mints a conversation id.
- `POST /api/v1/conversations/:id/messages` → sends the question + language + age band (**no PII**, ADR-0004) to the AI service and returns the grounded answer + citations + conversation starters.
- **Graceful degradation (NFR-06):** a **timeout + circuit breaker** wraps the AI call. If the AI service is slow/down, the parent gets a clear "I'll answer when I can" message in their language, the question is marked **queued**, and **referral info is always attached** — the referral pathway is never gated by the AI. On a crisis flag, referral info is attached too (FR-21).

The AI client is injectable (`AppDeps.coach.aiClient`) for tests; message persistence (P3, with retention controls) is a later slice.

## Content & CMS — `modules/content`

Micro-learning modules (FR-16) with **audio** (FR-19) and a gated **editorial workflow** (FR-20):
- **Parents** read only **published** modules: `GET /api/v1/content?topic=&ageBand=&language=` and `GET /api/v1/content/:itemId`.
- **Reviewers/admins** author and drive the workflow: `POST /api/v1/cms/items` (create draft), `POST /api/v1/cms/versions/:id/transition`.
- The **state machine** (`workflow.ts`) enforces `draft → clinical_review → cultural_review → approved → published → retired` (+ rejection paths), each **role-gated** — only `admin` may publish/retire. **Nothing unapproved is ever served.** Approvers are stamped (clinical/cultural) and `publishedAt` recorded. Postgres-backed (`migrations/0002_content.sql`), tested against `pg-mem`.

Content feedback/ratings (FR-34) is a later content slice.

## Nudges & messaging — `modules/nudges`, `modules/messaging`

Scheduled parenting tips (FR-17), segmented by child age band + language, over SMS/push:
- **Channel gateway** (`messaging/gateway.ts`, ADR-0006/NFR-31): a swappable `MessageGateway` interface (`FakeGateway` for tests, `LogGateway` until an aggregator is arranged — Q5; a real adapter is a later slice).
- **Outbound reachability:** the phone number is stored **AES-256-encrypted** (`phone_enc`, migration 0003) so server-initiated messages can reach a parent — decrypted only at send time. Config requires a real `PHONE_ENC_KEY` in production (NFR-13).
- **Admin** (`POST /api/v1/admin/campaigns`, `.../:id/nudges`, `.../nudges/dispatch`): create campaigns, schedule nudges, dispatch due ones. Dispatch resolves the segment (child band + language), **skips opted-out parents**, and sends via the gateway. In production a scheduled worker calls the dispatch service.
- **Parents** (`POST /api/v1/nudges/opt-out` / `opt-in`, NFR-17).

## Community sessions — `modules/sessions`

CHW/Parent-Champion led sessions (FR-25–28):
- **Facilitators** (`chw`/`champion`/`admin`): `POST /api/v1/sessions` (schedule), `POST /api/v1/sessions/:id/attendance`, `POST /api/v1/sessions/:id/outcome`, `GET /api/v1/sessions/guide/:topic` (discussion prompts, FR-26).
- **Offline-first (FR-27, NFR-07):** attendance is **idempotent on `client_id`** — a device-generated id — so records captured offline **replay safely** on sync with no duplicates (ADR-0008).
- **Linking (FR-28):** attendance links a session to a parent (never a child); parents see the sessions they attended via `GET /api/v1/me/sessions`.
- Postgres-backed (`migrations/0004_sessions.sql`, `pg-mem`-tested).

## Monitoring & Evaluation — `modules/me`

Outcome measurement and disaggregated indicators (FR-29–32):
- **Parents** submit non-identifying self-assessments (`knowledge`/`confidence`/`communication`, each 0–100) at **baseline** and **follow-up**: `POST /api/v1/assessments/:type` (upsert — one row per parent+type). `GET /api/v1/assessments/mine` returns their own results and computed **change** (FR-29).
- **Admins** read anonymised, disaggregated **indicators**: `GET /api/v1/dashboards/indicators?by=district|sector|urbanRural|caregiverGender|channel` — reach plus mean baseline→follow-up change per bucket (FR-30/31). `GET /api/v1/export/indicators.csv?by=` exports the same as CSV (FR-32).
- **Privacy (NFR-10/19):** dashboards and exports return **only aggregates** — no individual result ever leaves via them; the indicator engine (`indicators.ts`) is pure, PII-free, and unit-tested. Parents with an incomplete pair count toward reach but contribute `null` (not zero) to change means.
- Postgres-backed (`migrations/0005_assessments.sql`, `pg-mem`-tested); no child-identity columns (FR-24/NFR-15).

## Responsibilities (planned modules)

`identity & consent` · `coach orchestrator` (calls the Python AI service) · `content & nudges` · `safeguarding & referral` · `community sessions` · `M&E` · `admin & CMS`.

The coach orchestrator calls the **Python AI/RAG service** (`../ai`) over an internal HTTP/JSON API — this backend never answers health questions directly (ADR-0003/0014).

## Getting started

```bash
cp .env.example .env
npm install
npm run dev         # placeholder entrypoint
npm run test        # unit tests
npm run test:coverage
npm run lint && npm run typecheck && npm run build
```

## Standards

- Strict TypeScript; ESLint + Prettier; ESM.
- Core-logic coverage ≥70% (NFR-33) — gate in `vitest.config.ts` (currently scopes `src/lib`).
- No secrets in source (NFR-13); no PII/P3 in logs (NFR-10/15) — see `src/lib/redact.ts`.
- API contract is `../docs/architecture/openapi.yaml`; generate types from it in Phase 1.

## Decided / still to decide

- HTTP framework: **Fastify** — resolved in [ADR-0017](../docs/architecture/adr/0017-backend-http-framework.md).
- DB access layer (e.g. Drizzle/Kysely/Prisma) with pgvector — **next slice** (identity + consent).
- OpenAPI → TypeScript type generation — to wire alongside the DB slice.
