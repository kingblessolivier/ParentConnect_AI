"""Reciprocal-rank fusion — merging the dense and lexical candidate sets.

Ranks (not raw scores) are fused because dense and lexical scores live on
different, incomparable scales (docs/ai/ai-architecture.md section 4:
"Merge candidate sets (reciprocal-rank fusion)").
"""

from __future__ import annotations

from collections.abc import Sequence

from .interface import RetrievalResult


def reciprocal_rank_fusion(
    result_lists: Sequence[Sequence[RetrievalResult]],
    *,
    k: int = 60,
) -> list[RetrievalResult]:
    """Fuse multiple ranked result lists into one, best first.

    Each ``result_lists[i]`` is one retriever's ranked output (best first,
    e.g. dense, lexical). A chunk's fused score is ``sum(1 / (k + rank))``
    over every list it appears in (1-indexed rank), rewarding items ranked
    highly by more than one arm. ``k`` dampens the influence of any single
    top rank (standard RRF constant; 60 is the commonly used default).
    """
    if k <= 0:
        raise ValueError("k must be positive")

    fused: dict[str, float] = {}
    for results in result_lists:
        for rank, result in enumerate(results, start=1):
            fused[result.chunk_id] = fused.get(result.chunk_id, 0.0) + 1.0 / (k + rank)

    merged = [RetrievalResult(chunk_id=chunk_id, score=score) for chunk_id, score in fused.items()]
    merged.sort(key=lambda r: r.score, reverse=True)
    return merged
