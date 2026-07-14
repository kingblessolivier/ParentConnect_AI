# ADR-0005 — Embeddings & Kinyarwanda-aware retrieval

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Architect, AI lead
- **Related:** FR-08, FR-09, NFR-22; `kinyarwanda-strategy.md`; `CLAUDE.md` constraint #2

## Context

Retrieval quality determines grounding quality, which determines safety. Kinyarwanda is agglutinative and low-resource; standard sub-word tokenizers fragment it, degrading embedding and retrieval quality. This is the project's top technical risk.

## Decision

Adopt a **retrieval interface** (so implementations can change) with an initial implementation that combines:
1. **Multilingual dense embeddings** as the base (candidate models evaluated in `kinyarwanda-strategy.md`).
2. **A Kinyarwanda-aware normalisation layer** before embedding/indexing: morphological normalisation/lemmatisation where tooling exists, plus a curated synonym/stem map for key SRH vocabulary.
3. **Hybrid retrieval**: dense (pgvector) + lexical (Postgres full-text / BM25-style) to catch exact morphological variants dense models miss.
4. **A reranker** over the merged candidate set to lift precision before prompt assembly.

All four are chosen/tuned **empirically against the Kinyarwanda evaluation set** (recall@k, MRR) — not by assumption.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Multilingual + kinyarwanda-aware + hybrid + rerank** | Robust to morphology & code-switching; interface allows swaps | More components to tune | **Chosen** |
| English-only embeddings + translate queries | Simple | Translation loss on SRH nuance; another failure point; residency of translation | Rejected |
| Dense-only retrieval | Simple | Misses exact-term/morphology matches in low-resource text | Rejected as sole method |
| Train a Kinyarwanda embedding model now | Best fit long-term | Cost/time; needs data & expertise; partner-dependent | Deferred; explore with Digital Umuganda/Mbaza `[VERIFY]` |

## Consequences

- Positive: retrieval can improve without touching generation or the corpus; hybrid guards against dense-model blind spots.
- Negative/risks: more moving parts to evaluate; morphology tooling for Kinyarwanda may be immature `[VERIFY]`.
- Revisit trigger: eval recall@k below target; availability of a strong open Kinyarwanda embedding model or partnership.
