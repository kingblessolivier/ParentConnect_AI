# ADR-0007 — IVR platform (deferred)

- **Status:** Proposed (deferred to post-MVP)
- **Date:** 2026-07-14
- **Deciders:** Architect, Programme
- **Related:** FR-14 (IVR), NFR-03, NFR-29; `mvp-scope.md`; Q5

## Context

IVR is essential for low-literacy/no-smartphone users (persona P1) but is the most expensive and integration-heavy channel: toll-free voice, Kinyarwanda TTS/ASR quality, per-minute cost, and telephony ops. The MVP defers it; SMS covers basic phones at launch.

## Decision

**Defer IVR to post-MVP.** When built, deliver it **behind the Channel Gateway** (ADR-0006) as an `place_ivr`/voice adapter over an aggregator/telephony voice API. Content is served as **pre-recorded human audio** (already required by FR-19/NFR-26) rather than live TTS where possible, to control quality and cost; ASR for free-form questions is evaluated separately (Common Voice Kinyarwanda as a starting asset `[VERIFY]`).

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Defer; later via aggregator voice + pre-recorded audio** | Controls cost/quality; reuses audio content; toll-free via operator | Menu-driven, limited free-form early | **Chosen** |
| Live TTS/ASR IVR from day 1 | Rich, dynamic | Kinyarwanda TTS/ASR quality risk; cost; scope explosion at pilot | Rejected for MVP |
| Build own telephony stack (SIP/Asterisk) | Full control | Ops burden a small team can't carry | Rejected |

## Consequences

- Positive: keeps MVP affordable; audio investment (FR-19) is reused; toll-free obligation (NFR-29) handled by the operator arrangement.
- Negative/risks: the most vulnerable users wait longer for their ideal channel — an equity concern to state openly to funders; mitigated by SMS + community sessions in the interim.
- Revisit trigger: telecom voice/short-code agreement (Q5) + validated Kinyarwanda audio pipeline.
