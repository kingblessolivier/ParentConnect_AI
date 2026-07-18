"""The retrieval interface (ADR-0005).

``Retriever`` is deliberately minimal so the dense (embedding-based) and
lexical arms of hybrid retrieval are interchangeable, and so a benchmarked
embedding model can be swapped in later without touching fusion or the
grounding gate.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class RetrievalResult:
    """One scored candidate. Higher ``score`` ranks first within an arm.

    Scores are only comparable *within* a single retriever's output — dense
    and lexical scores are not on the same scale, which is exactly why fusion
    (fusion.py) ranks by reciprocal rank rather than combining raw scores.
    """

    chunk_id: str
    score: float


class Retriever(Protocol):
    """A source of ranked candidate chunk ids for a query."""

    def retrieve(self, query: str, k: int) -> list[RetrievalResult]:
        """Return up to ``k`` results, best first."""
        ...
