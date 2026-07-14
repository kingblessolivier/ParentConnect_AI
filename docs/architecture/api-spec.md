# API Specification

REST API design, resource by resource. The machine-readable contract is [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1); this document is the human rationale. FastAPI generates the served spec from code — `openapi.yaml` is the reviewed source of truth for the design.

## Conventions

- Base path: `/api/v1`. JSON. `snake_case` fields.
- **AuthN:** phone + OTP → short-lived JWT access token + refresh token. Channel gateways authenticate via mutual secret + signed webhooks.
- **AuthZ:** role-based (FR-05); every endpoint declares required role(s); violations → `403` and an audit event (NFR-11).
- **Errors:** RFC 9457 `application/problem+json` (`type`, `title`, `status`, `detail`, `instance`).
- **Idempotency:** mutating client-originated actions accept an `Idempotency-Key` (and `client_id` for offline-authored records).
- **Rate limiting:** per-account & per-IP at the gateway; OTP endpoints strictly limited.
- **Pagination:** cursor-based (`?cursor=&limit=`), default limit 20.
- **PII discipline:** requests/responses avoid P3 content except for the owning user; no child identity fields exist to send.

## Resources

### Auth & identity
| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/auth/otp/request` | Request an SMS OTP for a phone number (FR-01) | public (rate-limited) |
| POST | `/auth/otp/verify` | Verify OTP → tokens | public |
| POST | `/auth/refresh` | Refresh access token | authenticated |
| POST | `/auth/logout` | Revoke refresh token | authenticated |

### Parents & profile
| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/me` | Current profile | self |
| PATCH | `/me` | Update district/sector/language/channel/age-bands (FR-06) | self |
| POST | `/parents` | Assisted onboarding — create a parent (FR-03) | chw, champion, admin |
| GET | `/me/export` | Export my data (NFR-17) | self |
| DELETE | `/me` | Delete my account & history (NFR-17) | self |

### Consent
| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/consent` | Record informed consent (purpose, language, method) (NFR-16) | self, or assisted by chw/champion |
| POST | `/consent/withdraw` | Withdraw consent | self |

### Coach (AI)
| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/conversations` | Start a conversation | self |
| POST | `/conversations/{id}/messages` | Send a message; returns grounded answer + citations + `is_ai:true` (FR-07/09/11) | self |
| GET | `/conversations/{id}` | Retrieve own conversation | self (owner only, NFR-10) |
| DELETE | `/conversations/{id}` | Delete conversation (NFR-17) | self |

`POST /conversations/{id}/messages` response includes: `answer`, `citations[]` (approved `content_version_id` + title), `safety_flag`, `conversation_starters[]` (FR-11), `is_ai`. If `safety_flag=crisis`, response leads with **referral info** and may omit generative content.

### Content & learning
| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/content` | List published modules (filter topic/age_band/language) (FR-16) | self |
| GET | `/content/{id}` | Module incl. `audio_uri` (FR-19) | self |
| GET | `/content/pack` | Offline pack manifest (post-MVP, FR-18) | self |
| POST | `/content/{id}/feedback` | Rate/feedback (FR-34) | self |

### Content management (CMS)
| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/cms/items` | Create draft | reviewer, admin |
| POST | `/cms/versions/{id}/transition` | draft→clinical→cultural→approved→published→retired (FR-20) | reviewer(clinical), admin |
| GET | `/cms/versions/{id}/audit` | Version audit trail | reviewer, admin |

### Safeguarding & referral
| Method | Path | Purpose | Roles |
|---|---|---|---|
| GET | `/referral-directory` | Isange/helpline/facility numbers for a district (FR-21) — **works when AI is down** | self (public-ish) |
| POST | `/referrals` | Raise a confidential referral (FR-22) — no child identity (FR-24) | self, chw, champion |
| GET | `/referrals` | List referrals assigned to me | cpo |
| POST | `/referrals/{id}/transition` | acknowledged→actioned→closed (FR-23) | cpo |

### Community sessions
| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/sessions` | Schedule a session (FR-25) | chw, champion |
| GET | `/sessions/{id}/guide` | Facilitator guide/materials (FR-26) | chw, champion |
| POST | `/sessions/{id}/attendance` | Record attendance (offline-idempotent) (FR-27/28) | chw, champion |
| POST | `/sync` | Batch push/pull offline changes (offline-sync.md) | chw, champion, self |

### Measurement & admin
| Method | Path | Purpose | Roles |
|---|---|---|---|
| POST | `/assessments/{type}` | Submit baseline/follow-up (FR-29) | self |
| GET | `/dashboards/indicators` | Indicators, disaggregated (FR-30/31) | admin, cpo(limited) |
| GET | `/export/indicators.csv` | Aggregated CSV/Excel (FR-32) | admin |
| GET | `/export/dhis2` | DHIS2 payload (post-MVP, NFR-32) | admin |
| CRUD | `/admin/users`, `/admin/campaigns`, `/admin/languages`, `/admin/referral-directory` | Config without deploy (FR-33) | admin |

### Channel webhooks (gateway → backend)
| Method | Path | Purpose |
|---|---|---|
| POST | `/webhooks/sms/inbound` | Inbound SMS (signed) |
| POST | `/webhooks/ussd/session` | USSD session step |
| POST | `/webhooks/ivr/event` | IVR event (post-MVP) |

## Cross-cutting behaviours

- **Degradation (NFR-06):** `/referral-directory`, `/content`, and SMS inbound handling do **not** depend on the AI service; the coach endpoint returns a graceful fallback payload when the AI circuit breaker is open.
- **Audit (NFR-11):** all `cms/*`, `referrals/*`, `admin/*`, and role-violation events emit immutable audit records.
- **Data-subject rights (NFR-17):** `/me/export` and `DELETE /me` implement access/export/erasure.
