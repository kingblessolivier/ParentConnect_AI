# Engineering Standards

Branching, code review, testing standards, CI/CD, environments, and the definition of done. Keep it boring and enforceable.

## Branching & git workflow

```
main   ← deployment only; protected; release PRs from dev; tagged releases
 └ dev ← integration; protected; all feature PRs target here
    └ feature/* | fix/* | docs/* | chore/*
```

- **Feature branch → PR into `dev`.** `dev` is integration. **`main` is deployment-only**, promoted from `dev` via a release PR. Never push directly to `dev` or `main` (branch protection enforces this).
- One logical change per PR; small PRs preferred.
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`).
- Release = PR `dev → main`, tagged `vX.Y.Z`, with a changelog.

## Code review

- **≥1 approving review** required to merge to `dev`; **2 for safety-critical areas** (coach, safeguarding, auth, data model, prompts) with a **clinical reviewer required** on health-content/guardrail changes.
- Reviewers check: correctness, tests, security (no secrets, no PII, authz), data-minimisation (no new identifying fields without justification), and traceability updates.
- Use `/code-review` on the diff before requesting review; `/security-review` on security-touching diffs.

## Testing standards

- **≥70% automated coverage on core logic** (NFR-33) — enforced in CI on core packages (coach, safeguarding, identity, content workflow, sync).
- Test pyramid: many unit, fewer integration, few E2E (see `test-strategy.md`).
- **AI changes** additionally run the **evaluation release gate** (`evaluation-framework.md`) — a prompt/retrieval/model/corpus change cannot merge to `dev` without passing.
- No PII or identifiable minor data in test fixtures (CONTRIBUTING.md).

## CI/CD pipeline

```mermaid
flowchart LR
    PR[PR to dev] --> LINT[Lint + format]
    LINT --> UNIT[Unit + integration tests]
    UNIT --> COV[Coverage gate >=70% core]
    COV --> SEC[Secret scan + SAST + dependency scan]
    SEC --> AIEVAL[AI eval gate - if AI paths changed]
    AIEVAL --> CFG[Config validation - referral dir non-empty, i18n keys]
    CFG --> BUILD[Build backend(Node) / AI(Python) / web(Next.js) / mobile(Flutter) artifacts]
    BUILD --> OK{All green?}
    OK -->|yes| MERGE[Merge to dev -> deploy to staging]
    MERGE --> REL[Release PR dev->main -> deploy prod]
```

- **Secret scanning blocks merge** (NFR-13); a hit means rotate, not just revert.
- **Config validation** (ADR-0010): a deploy fails if the referral directory is empty or a required i18n key is missing — safety-critical config can't ship broken.
- Path-filtered jobs (monorepo, ADR-0012) keep CI fast.
- **Prod config asserts debug disabled** (NFR-13) at startup.

## Environments

| Env | Purpose | Data |
|---|---|---|
| **dev/local** | Development | Synthetic only; never real P3 |
| **staging** | Pre-prod, integration, pen-test target | Synthetic/anonymised; prod-like config |
| **production** | Live pilot | Real data; in-region (ADR-0009); debug off |

Environments are separated with distinct secrets; no prod data flows downstream.

## Definition of Done

A change is **done** when:
- [ ] Code + tests merged to `dev`; coverage gate green.
- [ ] For AI/health/content: release gate passed **and** clinical reviewer approved.
- [ ] Docs updated (SRS/traceability/ADR/data-model as applicable).
- [ ] Security checks green; no secrets; no new identifying fields unjustified.
- [ ] Observability in place (logs/metrics for the new path) — see `monitoring-and-me.md`.
- [ ] Accessibility/localisation considered (audio, ≤3 taps, i18n keys) where user-facing.
- [ ] Deployed to staging and verified before any `dev → main` release.

## Coding conventions

- **Backend (Node.js + TypeScript, ADR-0014):** strict TypeScript; ESLint + Prettier; framework TBD in a Phase-1 spike (NestJS vs Fastify); module boundaries respected (ADR-0011). Types generated from `openapi.yaml`.
- **AI/RAG service (Python, ADR-0014):** type hints + Pydantic; lint/format (ruff/black `[VERIFY tool choice]`); separately deployable.
- **Web (Next.js + React + TypeScript, ADR-0016):** shares TS + generated OpenAPI types with the backend; lean, staff-only console.
- **Mobile (Flutter/Dart, ADR-0015):** offline-first via Drift/sqflite + workmanager; **measure release APK size against NFR-28 early** (per-ABI App Bundles, on-demand assets).
- Read like the surrounding code; document the *why*.
- Dependencies: prefer well-maintained, boring libraries; pin versions; scan for vulnerabilities.

## Coverage note (NFR-33)

The ≥70% core-logic coverage gate applies to **both** the TypeScript backend and the Python AI service (each has its own coverage job in CI). Flutter and web have their own unit/widget test suites.
