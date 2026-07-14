# ADR-0011 — Modular monolith over microservices

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Architect
- **Related:** NFR-06, NFR-33, small-team/small-budget; `system-architecture.md`

## Context

A small team must build and operate this for years on a small budget. Microservices add operational surface (deployment, networking, observability, data consistency) that a small team pays for continuously. Yet the AI service must be able to **fail independently** (NFR-06) and **scale independently** (NFR-04).

## Decision

Build a **modular monolith**: one deployable backend with strong internal module boundaries (`identity`, `coach`, `content`, `safeguarding`, `sessions`, `me`, `admin`). **Carve out the AI service** as the one separately-deployable component, because it must fail and scale independently. Modules communicate via typed internal interfaces so any hot module can be extracted later with minimal churn.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Modular monolith (+ separate AI service)** | Low ops cost; atomic changes; clear seams for later extraction; AI isolation for NFR-06 | Must enforce module boundaries by discipline | **Chosen** |
| Full microservices | Independent scaling/deploys | Heavy ops for a small team; distributed-data complexity; premature | Rejected |
| Single monolith incl. AI in-process | Simplest | AI outage/latency would take down content+referral → violates NFR-06 | Rejected |

## Consequences

- Positive: cheapest to operate; the one seam that matters (AI) is isolated; extraction path exists if scale demands.
- Negative/risks: boundary erosion over time (mitigate with module ownership + import-linting); a single deploy unit for the core.
- Revisit trigger: a specific module's scale/velocity justifying extraction.
