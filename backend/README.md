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
  - Auth/RBAC enforced at the API (`auth.ts`), never trusted from the client (NFR-10). Data access is behind repository interfaces with in-memory implementations; **Postgres implementations are the next slice** (ADR-0002).

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
