# web — Next.js staff consoles

The **staff-facing** web app (admin, clinical/content review, child-protection-officer referral console, M&E dashboards). Parents use the Flutter app + SMS/IVR — **not** this console. See [ADR-0016](../docs/architecture/adr/0016-web-frontend.md).

> **Scaffold only.** No console logic yet. Built in Phase 1.

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
