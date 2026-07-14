# ADR-0006 — SMS/USSD aggregator abstraction

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Architect, Programme
- **Related:** NFR-31, FR-01 (OTP), FR-14, FR-17; Q5

## Context

The system must reach basic phones via SMS/USSD (and later IVR) across MTN and Airtel, with a toll-free/short-code arrangement. Operator integrations are slow, commercial, and vary. We must not couple core logic to any one operator or vendor.

## Decision

Define a **Channel Gateway** with a **swappable adapter interface** (`send_sms`, `receive_sms`, `ussd_session`, `send_otp`, later `place_ivr`). Ship one adapter for an **aggregator** (candidate: **Africa's Talking** `[VERIFY]`, which fronts multiple operators) for the pilot. Core services speak only the interface.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Aggregator behind an adapter** | One integration fronts multiple operators; swappable (NFR-31); faster to pilot | Aggregator margin; dependency on their uptime | **Chosen** |
| Direct per-operator integration | Potentially cheaper per message | 2× integrations, 2× contracts, slow; brittle | Rejected for pilot |
| Vendor SDK hard-wired into core | Fastest to code | Violates NFR-31; lock-in | Rejected |

## Consequences

- Positive: swap aggregator/operator by writing an adapter; testable via a fake adapter; supports the config-driven multi-context goal (ADR-0010).
- Negative/risks: message deliverability, latency (NFR-01 SMS 30 s), and cost depend on the aggregator (tracked in `cost-model.md`); short-code/toll-free arrangement is an external dependency (Q5).
- Revisit trigger: aggregator reliability/cost issues; direct-operator deal becomes worthwhile at scale.
