# infra — infrastructure, CI/CD, and config

Infrastructure-as-code, environment config, and deployment bundles.

> **Scaffold only.** IaC and pipelines are filled in during Phase 1 (`docs/delivery/engineering-standards.md`).

## Local development

```bash
docker compose -f infra/docker-compose.yml up -d   # Postgres+pgvector, Redis, MinIO
```

Then copy each service's `.env.example` to `.env` and run it.

## Production principles

- **In-region hosting** for personal data (ADR-0009, NFR-18); data tier kept portable (managed Postgres + object storage).
- **Environments separated** (dev / staging / prod) with distinct secrets; **prod runs with debug disabled** (NFR-13).
- **Backups daily**, RPO ≤24 h / RTO ≤4 h with a timed restore drill (NFR-08).
- **Secrets** from a secret manager, never in source (NFR-13); CI secret-scans every PR.

## Config-driven deployment (ADR-0010, NFR-36)

A deployment = shared code + one **config bundle** per context (`infra/config/<context>/`):
language pack, **referral directory** (per district), content-pack reference, campaign schedule, and telecom/gateway settings.

**Pre-deploy validation (Phase 1):** CI must fail a deploy whose config is invalid —
e.g. an **empty referral directory** (safety-critical) or a missing i18n key. See
`infra/config/README.md`.
