# ADR-0012 — Monorepo over polyrepo

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Architect
- **Related:** NFR-33, small-team; `engineering-standards.md`

## Context

The project spans backend, AI service, Android app, and docs. A small team benefits from atomic cross-cutting changes (e.g. an API change + its client + its docs in one PR) and one CI/CD configuration.

## Decision

Use a **monorepo** with clear top-level boundaries:

```
/backend      Python/FastAPI modular monolith
/ai           RAG pipeline & evaluation tooling
/android      Kotlin app
/docs         this documentation
/infra        IaC, CI/CD, config bundles
```

One CI pipeline with path-based jobs (only affected areas build/test). `dev`/`main` branch model applies repo-wide.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Monorepo** | Atomic cross-cutting PRs; one CI; shared standards; easy traceability | Needs path-filtered CI; larger clone | **Chosen** |
| Polyrepo | Independent lifecycles | Cross-repo changes are multi-PR; version drift; heavier for a small team | Rejected |

## Consequences

- Positive: the traceability matrix, API spec, and client evolve together; single source of standards.
- Negative/risks: CI must be path-aware to stay fast; access control is repo-wide (fine for one team).
- Revisit trigger: independent external contributors needing isolated repos, or org growth.
