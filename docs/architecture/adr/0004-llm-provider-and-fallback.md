# ADR-0004 — LLM provider & fallback

- **Status:** Accepted for MVP; **revisit before scale** (depends on Q1/Q2 legal answer)
- **Date:** 2026-07-14
- **Deciders:** Architect, DPO, Sponsor
- **Related:** NFR-18 (residency), NFR-01 (latency), NFR-06 (degradation), `model-selection.md`

## Context

Generation needs an LLM strong in multilingual/low-resource settings. Two tensions: (1) the strongest models are offshore commercial APIs, but personal data must stay in-region (NFR-18); (2) the system must keep working if the LLM is unavailable (NFR-06).

## Decision

**MVP:** use a **commercial LLM API** for generation, under strict controls:
- **No PII in prompts.** The coach sends only the (minimised, pseudonymised) question + retrieved approved passages + age band — never phone numbers, names, or profile identifiers.
- A **circuit breaker + timeout** wraps the call; on failure the coach degrades to cached FAQ answers + referral info + "I'll answer when I can."
- A **provider-abstraction interface** so the model can be swapped.

**Migration path:** benchmark an **in-region self-hosted open model** in parallel; switch when residency/cost/quality justify it. See `model-selection.md` for the options analysis and cost-per-conversation.

`[ASSUMPTION Q2]` This assumes legal accepts non-PII query text leaving the region for inference. **If legal says no**, MVP starts on the self-hosted path directly (higher ops cost, possibly lower quality) — the abstraction makes this a config change, not a rewrite.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Commercial API (no PII) + migration path** | Best quality now; fastest to a safe pilot; low ops | Cross-border inference question (Q2); per-token cost at scale | **Chosen for MVP** |
| Self-host open model in-region from day 1 | Full residency; fixed cost | Ops burden for a small team; GPU cost; likely weaker Kinyarwanda `[VERIFY]` | Deferred; keep as target |
| Single-vendor lock-in (no abstraction) | Simplest | Strategic risk; blocks residency migration | Rejected |

## Consequences

- Positive: fast, high-quality pilot without prejudging the residency migration.
- Negative/risks: dependency on an external API's availability (mitigated by degradation) and pricing (tracked in `cost-model.md`); the Q2 legal answer can invalidate the MVP choice — tracked as a blocking decision.
- Revisit trigger: legal ruling on Q2; cost-per-conversation crossing the sustainability envelope (NFR-35); a self-hosted model reaching parity on the Kinyarwanda eval set.
