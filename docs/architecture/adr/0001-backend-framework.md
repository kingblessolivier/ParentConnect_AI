# ADR-0001 — Backend framework: Python + FastAPI

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Lead architect
- **Related:** NFR-33 (maintainability), NFR-01 (latency), small-team constraint

## Context

We need a backend framework a small team can build and maintain for years. The AI/RAG stack (embeddings, retrieval orchestration, evaluation tooling) is overwhelmingly Python. Running the API layer in a *different* language would fragment an already-small team's skills and duplicate model/client code.

## Decision

Use **Python 3.11+ with FastAPI** for the backend API and the coach orchestrator. Use async I/O for channel fan-out and outbound LLM/gateway calls. Package as a modular monolith (ADR-0011).

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Python + FastAPI** | One language across API + AI; async; boring; huge ecosystem; fast to hire for | GIL for CPU-bound work (mitigated: heavy compute is in the AI service / native libs) | **Chosen** |
| Node.js + NestJS | Great async; TS types | Second language alongside Python AI stack; ORM/data-science gap | Rejected |
| Django | Batteries-included, admin | Heavier; sync-first; more than we need | Rejected (but Django-admin-style CMS considered for `admin`) |
| Go | Fast, low footprint | Away from the Python AI ecosystem; smaller local talent pool `[VERIFY]` | Rejected |

## Consequences

- Positive: single language reduces context-switching; FastAPI's OpenAPI generation feeds `api-spec.md`/`openapi.yaml` for free; strong typing via Pydantic aids the data-minimisation review.
- Negative/risks: CPU-bound request handling must stay out of the web workers (offload to the AI service / task queue).
- Revisit if: p95 latency budgets (NFR-01) cannot be met on the chosen hosting, or team composition shifts decisively.
