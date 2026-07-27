"""Retrieval spike runner — ties a ``Retriever`` to the evaluation set.

This is the missing end-to-end piece of the Phase-0 retrieval spike
(docs/ai/kinyarwanda-strategy.md "Empirical selection",
docs/ai/evaluation-framework.md): given a corpus and the Kinyarwanda eval set,
run a retriever over each question and report recall@k / MRR against the
approved sources that *should* have surfaced. Running two configs (e.g. BM25
vs a benchmarked embedding model, or fused vs single-arm) through this and
comparing reports is how the embedding/retrieval decision is made by
measurement, not vendor claim (ADR-0005).

Scoring is at the level of **source version id** (the citation target), not
chunk id: an eval case lists the approved ``expected_source_ids`` it should
retrieve, and multiple chunks can come from one source, so retrieved chunks are
mapped back to their version ids (best rank wins, duplicates dropped) before
scoring.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from ..evaluation.dataset import EvalCase
from ..evaluation.retrieval_metrics import mean_recall_at_k, mean_reciprocal_rank
from ..kb.schema import Chunk
from .interface import RetrievalResult, Retriever


def chunk_id_to_version_id(chunk_id: str) -> str:
    """Fallback parse of the ``"{version_id}:{index}"`` convention (ingest.py).

    Only the trailing ``:index`` is stripped, so version ids that themselves
    contain a colon are preserved. Prefer the explicit corpus mapping in
    ``run_spike``; this is the fallback when a chunk id is unknown.
    """
    head, _, tail = chunk_id.rpartition(":")
    if head and tail.isdigit():
        return head
    return chunk_id


def to_version_ids(
    results: Sequence[RetrievalResult], id_to_version: dict[str, str]
) -> list[str]:
    """Map ranked chunk results to a ranked, de-duplicated version-id list.

    Order is preserved (best rank first); once a version id has appeared, later
    lower-ranked chunks from the same source are dropped so the citation-level
    ranking reflects where each *source* first surfaced.
    """
    ordered: list[str] = []
    seen: set[str] = set()
    for result in results:
        version_id = id_to_version.get(result.chunk_id) or chunk_id_to_version_id(result.chunk_id)
        if version_id not in seen:
            seen.add(version_id)
            ordered.append(version_id)
    return ordered


@dataclass(frozen=True)
class SpikeReport:
    """Result of one retrieval configuration over the eval set."""

    config: str
    n_scored_cases: int
    recall_at_k: dict[int, float]
    mrr: float


def run_spike(
    retriever: Retriever,
    chunks: Iterable[Chunk],
    cases: Iterable[EvalCase],
    *,
    k_values: Sequence[int] = (1, 3, 5, 10),
    fetch_k: int | None = None,
    config: str = "default",
) -> SpikeReport:
    """Run ``retriever`` over the scorable eval cases and report recall@k / MRR.

    Only cases carrying ``expected_source_ids`` are scored (accuracy/retrieval
    cases); crisis/refusal/out-of-scope cases are evaluated elsewhere. The
    retriever must already be built over ``chunks`` (the same corpus is passed
    here purely to map chunk ids back to version ids).
    """
    if not k_values:
        raise ValueError("k_values must be non-empty")
    id_to_version = {chunk.chunk_id: chunk.version_id for chunk in chunks}

    scorable = [case for case in cases if case.expected_source_ids]
    if not scorable:
        raise ValueError("no scorable cases (need expected_source_ids)")

    fetch = fetch_k if fetch_k is not None else max(k_values)
    samples: list[tuple[list[str], list[str]]] = []
    for case in scorable:
        results = retriever.retrieve(case.question, fetch)
        version_ids = to_version_ids(results, id_to_version)
        samples.append((version_ids, list(case.expected_source_ids)))

    recall = {k: mean_recall_at_k(samples, k) for k in k_values}
    mrr = mean_reciprocal_rank(samples)
    return SpikeReport(config=config, n_scored_cases=len(scorable), recall_at_k=recall, mrr=mrr)


def compare_reports(reports: Sequence[SpikeReport], *, by_mrr: bool = True) -> list[SpikeReport]:
    """Rank configurations best-first (by MRR, or by the largest recall@k)."""
    if by_mrr:
        return sorted(reports, key=lambda r: r.mrr, reverse=True)
    largest_k = max((k for r in reports for k in r.recall_at_k), default=0)
    return sorted(reports, key=lambda r: r.recall_at_k.get(largest_k, 0.0), reverse=True)


def format_report(report: SpikeReport) -> str:
    """Human-readable one-liner for the spike log / decisions-log."""
    recall_str = " ".join(f"r@{k}={report.recall_at_k[k]:.3f}" for k in sorted(report.recall_at_k))
    return f"[{report.config}] n={report.n_scored_cases} mrr={report.mrr:.3f} {recall_str}"
