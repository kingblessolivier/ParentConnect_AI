# ADR-0003 — AI approach: RAG, not fine-tuning

- **Status:** Accepted (architectural given)
- **Date:** 2026-07-14
- **Deciders:** Sponsor (pre-decided), architect (endorses)
- **Related:** FR-09, NFR-20, NFR-21, NFR-22; `CLAUDE.md` constraint #1

## Context

The system answers health-sensitive questions for parents of minors. Answers must be **traceable to clinician-approved sources** and must not come from a model's open generative memory. This is both a safety and a compliance requirement.

## Decision

Use **Retrieval-Augmented Generation** over a curated, clinician-approved knowledge base. The LLM is used **only** to phrase/synthesise answers grounded in retrieved, approved passages, always with citations. **No foundation-model training or fine-tuning** on user data. (A small, optional retrieval/reranking model may be adapted — see ADR-0005 — but never the answer-generation policy on health facts.)

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **RAG** | Traceable, updatable without retraining, auditable, safest | Retrieval quality is the bottleneck (esp. Kinyarwanda) | **Chosen (given)** |
| Fine-tune an LLM on SRH content | Fluent | Bakes facts into weights → not traceable/updatable; hallucination risk on health; retraining cost | Rejected |
| Open-memory LLM with a good prompt | Cheapest to build | Unattributable health claims → violates NFR-22; unacceptable safety risk | Rejected |

## Consequences

- Positive: content corrections propagate instantly (edit the source, not the model); every answer is auditable (FR-15); model provider can change without losing knowledge.
- Negative/risks: retrieval on an agglutinative low-resource language is hard (see `kinyarwanda-strategy.md`); requires investment in a knowledge base and evaluation set **before** launch (Phase 0).
- Flagged risk (as requested): RAG shifts the hard problem from "the model" to "retrieval + corpus quality." Under-investing in the corpus/eval will silently degrade safety. The roadmap sequences these first for exactly this reason.
