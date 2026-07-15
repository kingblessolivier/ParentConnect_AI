# Changelog

All notable changes to ParentConnect AI are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once code ships. While the project is documentation-only (pre-code), entries track the documentation baseline and architectural decisions.

## [Unreleased]

### Added
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
