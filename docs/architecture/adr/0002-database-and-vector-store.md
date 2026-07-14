# ADR-0002 — Database & vector store: PostgreSQL + pgvector

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Lead architect
- **Related:** NFR-04 (scale), NFR-08 (backup), FR-09/22 (retrieval), small-team/small-budget

## Context

We need durable storage for relational data (accounts, profiles, referrals, sessions, M&E) and a vector index for RAG retrieval. A small team should operate the **fewest moving datastores** possible. The pilot corpus is small (hundreds–low thousands of chunks).

## Decision

Use **PostgreSQL** as the single primary datastore, with the **`pgvector`** extension for embedding search. Object storage (audio/media/content packs) sits alongside; Redis is used for ephemeral session/queue/rate-limit state only.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Postgres + pgvector** | One datastore to back up, secure, and reason about; ACID; JSON + relational + vectors; managed everywhere | Not the fastest ANN at very large scale | **Chosen** |
| Dedicated vector DB (Pinecone/Weaviate/Qdrant) | Best-in-class ANN | Second datastore to operate/secure; residency/cost concerns; overkill for pilot corpus | Rejected for MVP; graduate later if corpus grows |
| MongoDB | Flexible schema | Weaker relational integrity for referrals/audit; another engine | Rejected |
| MySQL | Familiar | Weaker JSON/extension story; no first-class vector | Rejected |

## Consequences

- Positive: one backup/restore path (NFR-08); simpler DPIA data inventory; strong constraints enforce data minimisation at the schema level.
- Negative/risks: pgvector ANN may need tuning (HNSW index) as the corpus grows; a future split to a dedicated vector store is a known, bounded migration (retrieval is behind an interface, ADR-0005).
- Revisit if: corpus exceeds ~10⁵–10⁶ chunks or retrieval latency breaches the NFR-01 budget.
