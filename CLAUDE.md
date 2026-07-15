# CLAUDE.md — Project context for Claude Code sessions

This file orients future Claude Code (and human) sessions. Read it before making changes.

## What this project is

ParentConnect AI is a social-impact platform to prevent teenage pregnancy in Rwanda by making parents confident SRH educators for their 10–19-year-olds. It is **not** a general chatbot. It is a safety-critical, privacy-critical, low-resource system.

## Non-negotiable constraints (do not violate; flag risks but do not re-litigate)

1. **RAG, not a trained model.** Every health answer must trace to an approved source document. The model must never answer SRH questions from open generative memory. See `docs/ai/ai-architecture.md`.
2. **Kinyarwanda is first-class**, not a translation afterthought. It is agglutinative and low-resource; retrieval must be designed for it. See `docs/ai/kinyarwanda-strategy.md`.
3. **Safeguarding is core.** The system will receive disclosures of abuse, exploitation, suicidal ideation, and pregnancy. Detection → escalation → referral is designed in. See `docs/compliance/child-safeguarding-policy.md`.
4. **Privacy is legally binding** under Rwanda's Law No. 058/2021. Data minimisation is mandatory: **never store adolescent names, national IDs, or identifiable health records.** See `docs/compliance/data-protection-impact-assessment.md`.
5. **Offline-first / low-bandwidth** are hard constraints. Assume 2G, shared devices, no device.
6. **The AI must degrade gracefully.** If AI is down, curated content, SMS, and referral pathways must still work.

## Conventions

- Docs are Markdown; diagrams are Mermaid. Requirement IDs are stable (`FR-xx`, `NFR-xx`); never renumber, only append or deprecate.
- `[VERIFY]` = unconfirmed fact. `[ASSUMPTION]` = decision on an unconfirmed premise. Both are tracked in `docs/decisions-log.md`.
- ADRs live one-per-file in `docs/architecture/adr/` and are immutable once `Accepted` (supersede, don't edit).
- Prefer boring, well-supported technology. Novelty is a liability for a small team on a small budget.

## Git workflow

- Feature branch → PR into **`dev`**. `dev` is integration. `main` is deployment-only (promoted from `dev` via PR).
- Never push directly to `dev` or `main`.
- Secrets never committed (NFR-13). Production runs with debug disabled.

## Current state

Documentation baseline **plus a monorepo scaffold** (`backend/` Node+TS, `ai/` Python, `web/` Next.js, `mobile/` Flutter, `infra/`) — structure, tooling, and CI only, **no feature logic**. Phase 0 (per `docs/delivery/roadmap.md`) is knowledge base + evaluation set, **not** feature code; feature work starts in Phase 1. Do not add feature logic ahead of the Phase-0 gate.

## When you don't know

Say so and add an `[ASSUMPTION]`/`[VERIFY]` marker plus a line in `docs/decisions-log.md`. Do not invent statistics, laws, partner capabilities, or clinical facts.
