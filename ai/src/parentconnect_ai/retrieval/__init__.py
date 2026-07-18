"""Hybrid retrieval — the Phase-0 retrieval spike's pure logic.

Implements the retrieval side of docs/ai/ai-architecture.md section 4-5 and
ADR-0005: a model-agnostic ``Retriever`` interface, a real lexical/BM25
retriever (the arm that doesn't depend on choosing an embedding model), and
reciprocal-rank fusion to merge it with a dense arm.

No embedding model is wired here. Which multilingual model to use is decided
empirically on the real Kinyarwanda evaluation set (kinyarwanda-strategy.md) —
that choice, and the dense ``Retriever`` implementation that wraps it, is the
next Phase-0 step once the eval set exists. This package is the reusable
scaffolding that choice plugs into, plus the hybrid-merge logic that doesn't
depend on it at all.
"""
