# Data Protection Impact Assessment (DPIA)

**Against Rwanda's Law No. 058/2021** on the protection of personal data and privacy. This is a living document; it must be signed by the DPO and reviewed before pilot launch and on any material processing change. `[VERIFY]` markers indicate items requiring legal/authority confirmation.

## 1. Why a DPIA is required

The system processes personal data in a context of **high risk to data subjects**: it touches **minors' reproductive health** (indirectly), serves vulnerable users, and operates at community scale. Under Law 058/2021 principles, high-risk processing warrants a DPIA. `[VERIFY: exact statutory trigger & any mandatory-DPIA threshold]`

## 2. Roles

| Role | Party |
|---|---|
| Data controller | The implementing programme/organisation `[VERIFY]` |
| Data processor(s) | Hosting provider (in-region, ADR-0009); aggregator (ADR-0006); LLM provider (ADR-0004, PII-free only) |
| DPO | `[VERIFY: named]` |
| Supervisory authority | Rwanda NCSA data-protection office `[VERIFY V5]`; register as required (NFR-14) |

## 3. Data inventory & lawful basis

| Data | Subject | Class | Purpose | Lawful basis (Law 058/2021) `[VERIFY]` |
|---|---|---|---|---|
| Phone number (hashed/encrypted) | Parent | P2 | Account, OTP, SMS/IVR delivery | Consent; necessary for the service |
| Optional alias | Parent | P1 | Friendly greeting | Consent (optional) |
| District/sector, urban/rural, caregiver gender | Parent | P1 | Referral routing; mandated disaggregation (FR-31) | Consent; legitimate programme purpose |
| Preferred language/channel | Parent | P1 | Service delivery | Consent |
| Child **age band** (enum only) | (about adolescent) | P1 | Age-tailored content (FR-10) | Consent of parent; **no adolescent identity** |
| Coach conversation content | Parent | **P3** | Provide coaching | Consent; explicit for sensitive topics |
| Disclosures / referrals | Parent (adult) | **P3** | Safeguarding (FR-22) | Vital interests / legal obligation for child protection `[VERIFY]` |
| Assessment results | Parent | P1 | M&E (FR-29) | Consent |
| Audit log | Staff/users | P1/P2 | Accountability (NFR-11) | Legal obligation / legitimate interest |

**Explicitly NOT collected** (data minimisation, NFR-15): adolescent name, DOB, national ID, health records, home address/GPS, parent national ID. See `data-model.md` "deliberately absent fields."

## 4. Consent design (NFR-16; detail in `consent-and-transparency.md`)

- Obtained and **recorded in the user's language** before processing, across app, SMS, and IVR — designed for **low literacy** (audio, plain language).
- Separate, explicit acknowledgement for **sensitive SRH conversation** processing.
- **Assisted onboarding** (CHW) captures consent with the parent present, read aloud; recorded with method + language + timestamp.
- Withdrawable at any time (`/consent/withdraw`); withdrawal stops further processing and triggers retention rules.

## 5. Data-subject rights (NFR-17)

| Right | How | Where |
|---|---|---|
| Access / portability | `GET /me/export` (or assisted) | api-spec.md |
| Rectification | `PATCH /me` | api-spec.md |
| Erasure | `DELETE /me` — cascades P2/P3, tombstones record | data-model.md |
| Withdraw consent | `/consent/withdraw` | api-spec.md |
| Object/restrict | Via support + admin | admin svc |

Rights are honoured within a defined SLA `[VERIFY: statutory response window]`.

## 6. Retention (NFR-19; schedule in `retention-schedule.md`)

- **P3 conversation content:** retained ≤ policy window, then deleted (`CONVERSATION.purge_after` job).
- Analytics/model-improvement use **only anonymised, aggregated** data.
- Backups age out per the schedule; erasure requests reconciled against backups per policy.

## 7. Cross-border transfer analysis

- **Personal data hosted in-region** (ADR-0009, NFR-18). No personal data leaves the approved jurisdiction at rest.
- **LLM inference (ADR-0004):** for Option A, only **PII-free** query context (question + approved passages + age band) would transit to the provider — **pending the Q2 legal ruling** on whether even de-identified query text may leave the region. If not permitted, Option B (in-region self-hosted) is used and **no query data transits**. This is the single most important open compliance question. `[VERIFY: legal ruling]`
- Aggregator (SMS/IVR) processes phone numbers/messages in transit; confirm its data location and DPA `[VERIFY]`.

## 8. Risk register (residual)

| # | Risk | Likelihood | Impact | Mitigation | Residual |
|---|---|---|---|---|---|
| R1 | Re-identification of a parent from conversation + location | Low-Med | High | Minimise location to sector; anonymise analytics; short retention | Low |
| R2 | Cross-border transfer of query context deemed unlawful | Med | High | Q2 ruling; Option B fallback; PII-free prompts | Med until Q2 resolved |
| R3 | Adolescent identity inferred/stored via free text | Low | High | No identity fields; PII scrub; review checklist; structural refusal | Low |
| R4 | Shared-phone exposure of SRH content | Med | Med | Lockable coach; generic notifications; erasable history | Low-Med |
| R5 | Aggregator/telecom mishandling of message data | Low-Med | Med | DPA; minimise message content; encryption | Low-Med |
| R6 | Breach of P3 store | Low | High | AES-256, least-privilege, audit, pen-test, incident plan (security-design.md) | Low |
| R7 | Consent not truly informed (low literacy) | Med | High | Audio consent, plain language, assisted flow, cultural review | Low-Med |

## 9. Sign-off

- [ ] DPO review & signature — `[VERIFY]`
- [ ] Supervisory-authority registration evidence attached — `[VERIFY V5]`
- [ ] Legal ruling on Q2 (cross-border query context) recorded
- [ ] Reviewed before pilot launch; scheduled annual review (aligns with pen-test NFR-12)
