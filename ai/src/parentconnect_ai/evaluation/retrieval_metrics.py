"""Retrieval metrics: recall@k and MRR.

Used by the Phase-0 retrieval spike to choose the embedding/retrieval approach
empirically on the Kinyarwanda eval set (docs/ai/kinyarwanda-strategy.md,
docs/ai/evaluation-framework.md). Pure functions over id lists — model-agnostic.
"""

from __future__ import annotations

from collections.abc import Sequence

#: A single retrieval sample: (retrieved ids in rank order, relevant/approved ids).
RetrievalSample = tuple[Sequence[str], Sequence[str]]


def recall_at_k(retrieved: Sequence[str], relevant: Sequence[str], k: int) -> float:
    """Fraction of relevant ids present in the top-k retrieved.

    Raises ValueError if k <= 0 or relevant is empty (recall is undefined).
    """
    if k <= 0:
        raise ValueError("k must be positive")
    relevant_set = set(relevant)
    if not relevant_set:
        raise ValueError("relevant set must be non-empty for recall@k")
    top_k = list(retrieved)[:k]
    hits = sum(1 for rid in relevant_set if rid in top_k)
    return hits / len(relevant_set)


def reciprocal_rank(retrieved: Sequence[str], relevant: Sequence[str]) -> float:
    """1 / rank of the first relevant id (0.0 if none retrieved)."""
    relevant_set = set(relevant)
    for index, rid in enumerate(retrieved, start=1):
        if rid in relevant_set:
            return 1.0 / index
    return 0.0


def mean_recall_at_k(samples: Sequence[RetrievalSample], k: int) -> float:
    """Mean recall@k across samples. Raises ValueError on empty input."""
    if not samples:
        raise ValueError("no samples")
    return sum(recall_at_k(r, rel, k) for r, rel in samples) / len(samples)


def mean_reciprocal_rank(samples: Sequence[RetrievalSample]) -> float:
    """MRR across samples. Raises ValueError on empty input."""
    if not samples:
        raise ValueError("no samples")
    return sum(reciprocal_rank(r, rel) for r, rel in samples) / len(samples)
