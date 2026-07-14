# Security Design

Threat model (STRIDE), authentication, the authorisation matrix by role, encryption, secrets management, audit logging, incident response, and the penetration-test plan. Realises NFR-09–13 and supports the DPIA.

## Assets to protect (ranked)

1. **P3 conversation content & disclosures** — the most sensitive data; exposure could harm vulnerable people.
2. **Referral integrity & availability** — a tampered/empty referral directory is a safety failure.
3. **Parent identifiers (phone numbers)** — P2.
4. **Audit log integrity** — accountability.
5. **Content-approval integrity** — prevents unsafe/poisoned content reaching users.

## STRIDE threat model

| Threat | Example | Mitigation |
|---|---|---|
| **Spoofing** | Attacker impersonates a parent or the SMS gateway | OTP auth + short-lived JWT; signed, secret-authenticated gateway webhooks; rate-limited OTP |
| **Tampering** | Modify content, referral directory, or a message in transit | TLS 1.2+ everywhere (NFR-09); approval workflow + audit for content (FR-20); config validation pre-deploy (ADR-0010); integrity checks |
| **Repudiation** | Staff denies a clinical/admin action | Immutable, append-only audit log (NFR-11) |
| **Information disclosure** | Leak of P3 content; cross-role read | AES-256 at rest; least-privilege authz (NFR-10); no P3 in logs/prompts; PII scrub |
| **Denial of service** | Flood OTP/coach endpoints; exhaust LLM budget | Rate limiting; circuit breaker + degradation (NFR-06); cost caps on LLM |
| **Elevation of privilege** | Parent gains admin/CPO access | Enforced RBAC at gateway; deny-by-default; audited role changes; regular access review |

Plus AI-specific threats (prompt injection, data poisoning) — see `safety-and-guardrails.md`.

## Authentication

- **Parents:** phone + SMS OTP → short-lived access JWT + refresh token; refresh rotation; device binding where possible.
- **Staff (CHW/champion/reviewer/CPO/admin):** phone/OTP plus role assignment; **MFA for admin/clinical roles** `[VERIFY feasibility]`.
- **Gateways/services:** mutual secret + signed webhook payloads; internal service auth for the AI service.
- OTP: expiry ≤10 min, ≤3 attempts, lockout, strict rate limits (anti-enumeration).

## Authorisation matrix (by role)

Deny-by-default. ✔ = allowed; own = own records only; — = denied. (Full enforcement in code; this is the contract; violations → 403 + audit.)

| Capability | parent | chw | champion | school | cpo | reviewer | admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Use coach / own conversations | own | — | — | — | — | — | — |
| Read others' SRH conversation content | — | — | — | — | — | — | — |
| Assisted onboarding (create parent) | — | ✔ | ✔ | — | — | — | ✔ |
| Raise referral | own | ✔ | ✔ | ✔ | — | — | ✔ |
| View/transition assigned referral | — | — | — | — | ✔ | — | — |
| Schedule sessions / record attendance | — | ✔ | ✔ | ✔ | — | — | ✔ |
| Author content (draft) | — | — | — | — | — | ✔ | ✔ |
| Clinical approve content | — | — | — | — | — | ✔(clinical) | — |
| Manage users/roles/config | — | — | — | — | — | — | ✔ |
| View dashboards | — | limited | limited | limited | limited | — | ✔ |
| Read audit log | — | — | — | — | — | — | ✔ |

**Key invariant (NFR-10):** *no* role — not even admin — has a UI/endpoint to read another user's individual SRH conversation content. Clinical review operates on **anonymised sampled** content only (`evaluation-framework.md`).

## Encryption & key management

- **In transit:** TLS 1.2+ (prefer 1.3); HSTS; no weak ciphers (NFR-09). Verified by TLS scan (TC-sec-009).
- **At rest:** AES-256 for the database and object storage; phone numbers hashed/encrypted (P2).
- **Keys:** managed via the platform KMS/secret store; rotation policy; no keys in code or images.

## Secrets management (NFR-13)

- **No secrets in source control** — enforced by CI secret scanning (blocks merge) and pre-commit hooks.
- Secrets injected at runtime from a secret manager; per-environment separation.
- **Production runs with debug disabled** — asserted by a startup check and CI config test.
- Leaked secret ⇒ rotate immediately (not just revert); documented in incident response.

## Audit logging (NFR-11)

- **Append-only / immutable** store of all admin, clinical, referral, role-change, and access-violation events: actor, action, entity, timestamp, metadata.
- **Never logs P3 content bodies** — actions and identifiers only.
- Tamper-evident (e.g. hash-chaining `[VERIFY implementation]`); retained per `retention-schedule.md`.

## Backup & disaster recovery (NFR-08)

- Daily automated Postgres backups + object-storage versioning; encrypted.
- **RPO ≤24 h, RTO ≤4 h**; a **restore drill** is run and timed (TC-ops-008), not assumed.
- Backups age out per `retention-schedule.md`; erasure reconciled against them.

## Incident response plan

1. **Detect** (alerts, monitoring, report) → 2. **Triage & classify** (P1 = data breach or safety violation) → 3. **Contain** (revoke, isolate, rotate) → 4. **Eradicate & recover** (restore, patch) → 5. **Notify** the DPO and, where required, the supervisory authority and affected users within statutory timelines `[VERIFY breach-notification window]` → 6. **Post-incident review** → update controls & `risk-register.md`.
- A **vulnerability disclosure** channel is published (see CONTRIBUTING.md) — report privately, never a public issue.

## Penetration testing (NFR-12)

- **Before pilot launch and annually thereafter.** Scope: app, API, gateway webhooks, authz matrix, AI endpoints (incl. prompt-injection), infra.
- Criticals/highs remediated before launch; report retained; findings tracked to closure. `[VERIFY tester engaged]`

## Secure SDLC (see `engineering-standards.md`)

Dependency scanning, SAST, secret scanning, and a security review on the diff (`/security-review`) in CI; least-privilege infra; environments separated (dev/staging/prod).
