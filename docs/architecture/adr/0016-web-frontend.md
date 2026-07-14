# ADR-0016 — Web frontend: Next.js + React + TypeScript

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Sponsor (decision), Architect
- **Related:** FR-05 (RBAC), FR-20 (CMS), FR-30/31 (dashboards), FR-33 (admin), NFR-10 (least privilege), NFR-30 (i18n)

## Context

The **web frontend serves staff, not parents** — the admin console, the clinician/content-review console (FR-20), the child-protection-officer referral console (FR-23), and the M&E dashboards (FR-30/31). Parents use the Flutter app (ADR-0015) and SMS/IVR. The sponsor chose the **Node/JavaScript** ecosystem; this ADR picks the concrete web stack.

## Decision

Build the staff web consoles in **Next.js + React + TypeScript**:
- Shares TypeScript with the Node backend (ADR-0014) and generated types from `openapi.yaml`.
- Server-side rendering / server components for fast, low-JS admin pages.
- Role-gated routes enforcing the authorization matrix (`security-design.md`); **no UI path to another user's SRH conversation content** (NFR-10) — clinical review sees only anonymised samples.
- i18n via the shared language layer (NFR-30); dashboards implement disaggregation (FR-31).

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Next.js + React + TS** | Boring, standard, big talent pool; SSR; shares TS + OpenAPI types with backend | React learning curve if team is Vue | **Chosen** |
| React + Vite + Express | Lighter SPA | More glue (routing/SSR/auth) assembled by hand | Rejected as default |
| Vue / Nuxt | Fine ecosystem | Team/standardisation; less overlap with a React talent pool | Rejected unless team prefers Vue |

## Consequences

- Positive: one language across backend + web; shared API contract; mature admin-dashboard patterns; strong hiring pool.
- Negative/risks: keep the staff console **lean** — it is not parent-facing and must not become a second heavy client; enforce least-privilege at the API, never trust the frontend for authz.
- Follow-ups: scaffold `/web` in the monorepo (ADR-0012); wire OpenAPI→TS types; add the console to CI (lint/test/build).
