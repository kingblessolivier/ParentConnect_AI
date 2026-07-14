# Deployment config bundles

One directory per deployment context (e.g. `rw-pilot/`), loaded at runtime. All
context-specific material is **configuration/data, never code** (ADR-0010, NFR-36).

## Expected contents (Phase 1)

```
infra/config/<context>/
  languages/            i18n resource bundles (rw default, en; fr later) — NFR-30
  referral-directory.json   Isange / child helpline / facilities per district — FR-21
  content-pack.json     reference to the approved KB content pack version
  campaigns.json        nudge schedules & segments — FR-17/33
  gateway.json          SMS/USSD/IVR aggregator settings — ADR-0006
```

## Validation rules (enforced in CI before deploy)

- `referral-directory.json` **must exist and be non-empty** — an empty directory
  is a safety failure (a disclosure must always surface a referral, FR-21/NFR-06).
- Every referral entry has a name, type, and contact.
- All required i18n keys present for each configured language (NFR-30).
- No secrets in config bundles (secrets come from the secret manager, NFR-13).

> Placeholder. Concrete schema + validator land in Phase 1.
