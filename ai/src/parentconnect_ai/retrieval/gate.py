"""The grounding gate — retrieval-side decision (ai-architecture.md stage 6).

"If reranked relevance is below a threshold, or too few approved chunks
match, the system does not generate a health answer." A wrong answer is
worse than "I don't know" (NFR-21). Thresholds default conservative and are
tuned empirically against the real Kinyarwanda evaluation set once it exists
(kinyarwanda-strategy.md) — same "tune empirically" posture as chunk sizing
in kb/chunking.py.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from .interface import RetrievalResult


@dataclass(frozen=True)
class GroundingGateThresholds:
    min_score: float = 0.0  # per-result relevance floor [tune empirically]
    min_matches: int = 1  # chunks that must clear min_score to generate


@dataclass(frozen=True)
class GroundingGateResult:
    passed: bool
    matched_chunk_ids: tuple[str, ...]


def evaluate_grounding_gate(
    results: Sequence[RetrievalResult],
    thresholds: GroundingGateThresholds | None = None,
) -> GroundingGateResult:
    """Decide whether there is enough approved context to generate.

    ``results`` should already be reranked (best first) and filtered to
    approved sources upstream; this function only applies the score/count
    bar. On failure, the caller routes to the "I don't know" / referral path
    (docs/ai/ai-architecture.md) rather than generating.
    """
    thresholds = thresholds or GroundingGateThresholds()
    matched = tuple(r.chunk_id for r in results if r.score >= thresholds.min_score)
    return GroundingGateResult(
        passed=len(matched) >= thresholds.min_matches,
        matched_chunk_ids=matched,
    )
