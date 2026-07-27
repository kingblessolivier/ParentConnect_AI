# ADR-0017 — Backend HTTP framework: Fastify

- **Status:** Accepted
- **Date:** 2026-07-27
- **Deciders:** Architect, Eng lead
- **Related:** ADR-0014 (Node.js backend — left the concrete framework to a Phase-1 spike), NFR-01 (latency), NFR-33 (maintainability), ADR-0011 (modular monolith)

## Context

ADR-0014 chose Node.js + TypeScript and explicitly deferred the concrete framework ("NestJS vs Fastify") to a Phase-1 spike. Phase 1 has begun, so this resolves it.

Constraints that decide it: a **small team** on a **small budget** maintaining this for years; a **modular monolith** with clear module boundaries (identity, coach, content, safeguarding, sessions, M&E, admin); tight latency budgets (NFR-01); and the project ethos of **boring, lean technology** with as little framework magic as possible.

## Decision

Use **Fastify** (with TypeScript) as the HTTP framework.

- One Fastify app assembled from **per-module plugins** — each domain module registers its own routes/services under a folder, giving the modular-monolith boundaries without a heavy DI framework.
- Built-in **JSON-schema validation** on routes (fast, and doubles as the request/response contract that mirrors `openapi.yaml`).
- A single **error handler** emitting RFC 9457 `application/problem+json` (per `api-spec.md`).
- Structured logging via Fastify's Pino logger, with our `redact` helpers so **no PII/P3 reaches logs** (NFR-10/15).

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Fastify** | Lean, fast (strong p95), boring, first-class TS, schema validation built in, plugin encapsulation maps cleanly to modules, small dependency surface | Less prescriptive structure than Nest (we impose our own folder convention) | **Chosen** |
| NestJS | Batteries-included structure, DI, decorators | Heavier abstraction/magic and larger footprint than a small team needs; slower cold start; more to learn/maintain | Rejected — against the lean/boring ethos |
| Express | Ubiquitous | Slower, no built-in schema validation, callback-era ergonomics, needs many add-ons | Rejected |

## Consequences

- Positive: lean, fast, low-magic; schema validation gives request/response safety and contract parity with OpenAPI; plugin-per-module keeps ADR-0011 boundaries explicit; small dep surface eases the secret/vuln-scanning story.
- Negative/risks: we own the folder/module convention (documented in `backend/README.md`) rather than inheriting one; DI is manual (simple factory functions) — acceptable at this size.
- Follow-ups: establish the module-plugin convention with the first slices; add DB access (ADR-0002 Postgres) in the identity/consent slice; generate route schemas from / keep them in sync with `openapi.yaml`.
