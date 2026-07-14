# backend — Node.js + TypeScript API

The core backend (modular monolith) for ParentConnect AI. See [ADR-0014](../docs/architecture/adr/0014-backend-nodejs.md) and [system-architecture.md](../docs/architecture/system-architecture.md).

> **Scaffold only.** No feature logic yet. Modules land in Phase 1 (`docs/delivery/roadmap.md`).

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

## To decide in Phase 1

- HTTP framework: **NestJS vs Fastify** (ADR-0014) — spike then record in an ADR.
- DB access layer (e.g. Prisma/Drizzle/Kysely) with pgvector support.
- OpenAPI → TypeScript type generation.
