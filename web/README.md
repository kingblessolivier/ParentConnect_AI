# web — Next.js staff consoles

The **staff-facing** web app (admin, clinical/content review, child-protection-officer referral console, M&E dashboards). Parents use the Flutter app + SMS/IVR — **not** this console. See [ADR-0016](../docs/architecture/adr/0016-web-frontend.md).

## Implemented so far

Three working staff pages (App Router, client components fetching the backend):

- **`/` — M&E dashboard**: reach, active-by-channel/language, assessment completion, mean knowledge/confidence/communication change (`GET /api/v1/dashboards/overview`, FR-30).
- **`/referrals` — referral triage** (CPO): child-protection caseload with SLA/overdue flags and forward-only status transitions (`GET /api/v1/referrals`, `POST /api/v1/referrals/:id/transition`, FR-22/23). No child identity is shown (FR-24).
- **`/content-feedback` — content feedback**: per-module rating aggregates + star distribution (`GET /api/v1/admin/content-feedback`, FR-34).

Shared bits: `lib/api.ts` (typed client; sends the staff bearer token — the **API** enforces RBAC, NFR-10), `lib/useApiData.ts` (fetch with a **demo-data fallback** so pages render standalone; a banner flags demo mode), theme-aware CSS (light/dark), responsive layout. Point at a live backend with `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_STAFF_TOKEN`.

Still to build: admin (users/roles/campaigns), clinical/cultural content review, i18n, and generating types from `openapi.yaml`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint && npm run typecheck && npm run build
```

## Standards

- Next.js App Router + React + strict TypeScript.
- Role-gated routes matching the authorization matrix (`security-design.md`); **authz is enforced by the API, never the frontend** (NFR-10).
- Types generated from `../docs/architecture/openapi.yaml` in Phase 1.
- i18n via the shared language layer (NFR-30); dashboards implement FR-31 disaggregation.
- Keep it lean — not a second heavy client.
