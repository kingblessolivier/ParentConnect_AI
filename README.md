# ParentConnect AI

*An AI-enabled parenting ecosystem for preventing teenage pregnancy and strengthening child protection in Rwanda.*

ParentConnect AI equips parents and caregivers to become the first and most trusted educators of their adolescents (aged 10–19) on puberty, relationships, consent, and sexual and reproductive health (SRH). It combines an AI parenting coach (grounded on a clinician-approved knowledge base), SMS/USSD and toll-free IVR channels for basic phones, and community parenting sessions led by Community Health Workers and trained Parent Champions.

> **Status:** Documentation baseline + **monorepo scaffold**. The design/requirements/compliance docs are complete; the repository now also has project skeletons (structure, tooling, CI) with **no feature logic yet**. Feature work begins in Phase 1 per [`docs/delivery/roadmap.md`](./docs/delivery/roadmap.md) — after Phase 0 (knowledge base + evaluation set).

## Repository layout (code)

| Path | Stack | Purpose |
|---|---|---|
| [`backend/`](./backend/) | Node.js + TypeScript (ADR-0014) | Core API & coach orchestrator |
| [`ai/`](./ai/) | Python (ADR-0014) | RAG & evaluation service (separate) |
| [`web/`](./web/) | Next.js + React + TS (ADR-0016) | Staff consoles |
| [`site/`](./site/) | Next.js + React + TS (ADR-0016) | Public site — programme info, safety commitments; not the app or staff console |
| [`mobile/`](./mobile/) | Flutter (ADR-0015) | Parent-facing app (offline-first) |
| [`infra/`](./infra/) | Docker/IaC | Local dev, config bundles, deployment |
| [`docs/`](./docs/) | Markdown | Design, requirements, compliance |

---

## Who this is for

- **Engineers** building the platform — start with [`CLAUDE.md`](./CLAUDE.md), then [`docs/architecture/system-architecture.md`](./docs/architecture/system-architecture.md).
- **Clinical & content reviewers** — see [`docs/ai/knowledge-base-spec.md`](./docs/ai/knowledge-base-spec.md) and [`docs/ai/safety-and-guardrails.md`](./docs/ai/safety-and-guardrails.md).
- **Data-protection officers & funders' technical reviewers** — see [`docs/compliance/`](./docs/compliance/).
- **Programme staff** — see [`docs/product/vision.md`](./docs/product/vision.md) and [`docs/delivery/roadmap.md`](./docs/delivery/roadmap.md).

## How to navigate the docs

| Area | Path | What's there |
|---|---|---|
| Product & requirements | [`docs/product/`](./docs/product/), [`docs/requirements/`](./docs/requirements/) | Vision, personas, journeys, SRS, MVP scope, traceability |
| Architecture | [`docs/architecture/`](./docs/architecture/) | C4 model, ADRs, data model, API spec, channel & offline design |
| The AI system | [`docs/ai/`](./docs/ai/) | RAG pipeline, Kinyarwanda strategy, knowledge base, guardrails, evaluation, model selection |
| Trust, safety & compliance | [`docs/compliance/`](./docs/compliance/) | DPIA, child safeguarding, security, consent, AI ethics |
| Delivery & operations | [`docs/delivery/`](./docs/delivery/) | Roadmap, engineering standards, test strategy, monitoring/M&E, cost model, risk register |
| Reference | [`docs/glossary.md`](./docs/glossary.md), [`docs/decisions-log.md`](./docs/decisions-log.md) | Terms; running log of open questions |

## Conventions

- **`[VERIFY]`** marks a claim (statistic, law, partner, capability) not yet confirmed against a primary source.
- **`[ASSUMPTION]`** marks a design decision taken on a stated assumption pending stakeholder confirmation (tracked in [`docs/decisions-log.md`](./docs/decisions-log.md)).
- Diagrams are [Mermaid](https://mermaid.js.org/) so they live in version control and render on GitHub.

## Changelog

Notable changes and architectural decisions are recorded in [`CHANGELOG.md`](./CHANGELOG.md).

## Contributing & git workflow

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). In short: feature branch → **pull request into `dev`** → `dev` is the integration branch → `main` is deployment-only, promoted from `dev` by its own PR. Nothing is pushed directly to `dev` or `main`.

## Licence

`[VERIFY]` Licence not yet chosen. Recommend a permissive open-source licence (e.g. MIT or Apache-2.0) for the codebase and a separate content licence (e.g. CC-BY-NC) for the knowledge base, subject to funder and MoH agreement.
