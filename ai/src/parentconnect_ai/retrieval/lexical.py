"""Lexical retrieval (BM25) — the arm of hybrid retrieval that doesn't depend
on an embedding model.

Catches exact morphological variants that a dense model may miss on
low-resource, agglutinative Kinyarwanda (docs/ai/kinyarwanda-strategy.md,
ADR-0005). Tokenisation reuses ``kb.chunking.normalize`` so indexing and
querying see text through the same normalisation (including the synonym/stem
map, once authored).
"""

from __future__ import annotations

import math
import re
from collections import Counter
from collections.abc import Iterable

from ..kb.chunking import normalize
from ..kb.schema import Chunk
from .interface import RetrievalResult

_TOKEN = re.compile(r"\w+", re.UNICODE)


def _tokenize(text: str, synonym_map: dict[str, str] | None = None) -> list[str]:
    return _TOKEN.findall(normalize(text, synonym_map=synonym_map))


class LexicalRetriever:
    """BM25 over an in-memory corpus of chunks.

    Postgres full-text search is the production lexical index (ADR-0002); this
    implementation is deliberately storage-agnostic pure logic so the ranking
    behaviour can be unit-tested and benchmarked (recall@k/MRR) without a
    database — the same BM25 parameters transfer to the SQL implementation.
    """

    def __init__(
        self,
        chunks: Iterable[Chunk],
        *,
        synonym_map: dict[str, str] | None = None,
        k1: float = 1.5,
        b: float = 0.75,
    ) -> None:
        self._synonym_map = synonym_map
        self._k1 = k1
        self._b = b
        self._chunks: dict[str, Chunk] = {}
        self._term_freqs: dict[str, Counter[str]] = {}
        self._doc_lengths: dict[str, int] = {}

        for chunk in chunks:
            tokens = _tokenize(chunk.text, synonym_map)
            self._chunks[chunk.chunk_id] = chunk
            self._term_freqs[chunk.chunk_id] = Counter(tokens)
            self._doc_lengths[chunk.chunk_id] = len(tokens)

        self._avg_doc_length = (
            sum(self._doc_lengths.values()) / len(self._doc_lengths) if self._doc_lengths else 0.0
        )
        self._doc_freq: Counter[str] = Counter()
        for freqs in self._term_freqs.values():
            self._doc_freq.update(freqs.keys())

    def _idf(self, term: str) -> float:
        n = len(self._chunks)
        df = self._doc_freq.get(term, 0)
        return math.log((n - df + 0.5) / (df + 0.5) + 1)

    def _score(self, chunk_id: str, query_terms: list[str]) -> float:
        freqs = self._term_freqs[chunk_id]
        doc_len = self._doc_lengths[chunk_id]
        score = 0.0
        for term in query_terms:
            f = freqs.get(term, 0)
            if f == 0:
                continue
            numerator = f * (self._k1 + 1)
            denominator = f + self._k1 * (
                1 - self._b + self._b * (doc_len / self._avg_doc_length if self._avg_doc_length else 0)
            )
            score += self._idf(term) * (numerator / denominator)
        return score

    def retrieve(self, query: str, k: int) -> list[RetrievalResult]:
        if k <= 0:
            raise ValueError("k must be positive")
        if not self._chunks:
            return []

        query_terms = _tokenize(query, self._synonym_map)
        if not query_terms:
            return []

        scored = [
            RetrievalResult(chunk_id=chunk_id, score=self._score(chunk_id, query_terms))
            for chunk_id in self._chunks
        ]
        scored = [result for result in scored if result.score > 0]
        scored.sort(key=lambda r: r.score, reverse=True)
        return scored[:k]
