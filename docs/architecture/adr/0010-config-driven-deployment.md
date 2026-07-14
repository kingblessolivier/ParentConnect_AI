# ADR-0010 — Config-driven multi-context deployment

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Architect, Programme
- **Related:** NFR-36, NFR-30, FR-33; `CLAUDE.md`

## Context

The system must deploy to a new district or country **through configuration, not code changes** (NFR-36): different language(s), referral directory, content pack, campaign schedules, and telecom settings.

## Decision

Treat **all context-specific material as configuration/data**, loaded at runtime and editable via admin/CMS without a deploy:
- **Language packs** (i18n resources) — separate from logic (NFR-30).
- **Referral directory** — data table, per-district (Isange/helpline/facilities).
- **Content pack** — knowledge base + media, versioned and region-tagged.
- **Campaign schedules & segments** — admin-configurable (FR-33).
- **Telecom/gateway settings** — per-deployment config (ADR-0006).
A deployment = one config bundle + shared code. No `if country == …` branches in code.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Config/data-driven** | New context = new config; testable; matches NFR-36 | Requires discipline to keep specifics out of code | **Chosen** |
| Per-context code branches/forks | Quick first time | Unmaintainable; drift; violates NFR-36 | Rejected |

## Consequences

- Positive: replicable to new contexts cheaply; supports the funder's scale/adaptability narrative.
- Negative/risks: requires a config-validation step in CI so a bad referral directory or missing language key can't ship; admin UI must guard against misconfiguration of safety-critical data (referral numbers).
- Follow-up: define a config schema + validation; add a "referral directory must be present and non-empty" pre-deploy check.
