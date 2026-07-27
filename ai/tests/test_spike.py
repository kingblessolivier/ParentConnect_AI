import pytest

from parentconnect_ai.evaluation.dataset import EvalCase, EvalCategory
from parentconnect_ai.kb.schema import AgeBand, Chunk, Language
from parentconnect_ai.retrieval.interface import RetrievalResult
from parentconnect_ai.retrieval.lexical import LexicalRetriever
from parentconnect_ai.retrieval.spike import (
    SpikeReport,
    chunk_id_to_version_id,
    compare_reports,
    format_report,
    run_spike,
    to_version_ids,
)


def _chunk(chunk_id: str, version_id: str, text: str) -> Chunk:
    return Chunk(
        chunk_id=chunk_id,
        version_id=version_id,
        topic="srh",
        age_band=AgeBand.B13_15,
        language=Language.RW,
        text=text,
    )


def _case(cid: str, question: str, sources: tuple[str, ...]) -> EvalCase:
    return EvalCase(
        case_id=cid,
        question=question,
        language=Language.RW,
        category=EvalCategory.ACCURACY,
        expected_source_ids=sources,
        reference_answer="ref",
    )


def test_chunk_id_to_version_id_strips_trailing_index():
    assert chunk_id_to_version_id("kb-1:0") == "kb-1"
    assert chunk_id_to_version_id("ns:kb-1:2") == "ns:kb-1"


def test_chunk_id_to_version_id_leaves_non_indexed_alone():
    assert chunk_id_to_version_id("kb-1") == "kb-1"


def test_to_version_ids_dedupes_preserving_best_rank():
    results = [
        RetrievalResult("kb-1:0", 3.0),
        RetrievalResult("kb-2:0", 2.0),
        RetrievalResult("kb-1:1", 1.0),  # same source as first, lower rank -> dropped
    ]
    mapping = {"kb-1:0": "kb-1", "kb-2:0": "kb-2", "kb-1:1": "kb-1"}
    assert to_version_ids(results, mapping) == ["kb-1", "kb-2"]


def test_to_version_ids_falls_back_to_parse_for_unknown_chunk():
    results = [RetrievalResult("kb-9:0", 1.0)]
    assert to_version_ids(results, {}) == ["kb-9"]


def _corpus():
    return [
        _chunk("kb-puberty:0", "kb-puberty", "puberty body changes menstruation hygiene"),
        _chunk("kb-consent:0", "kb-consent", "consent boundaries saying no respect"),
        _chunk("kb-comm:0", "kb-comm", "how to start a conversation listening"),
    ]


def test_run_spike_perfect_retrieval_scores_one():
    corpus = _corpus()
    retriever = LexicalRetriever(corpus)
    cases = [
        _case("c1", "menstruation hygiene", ("kb-puberty",)),
        _case("c2", "consent boundaries", ("kb-consent",)),
    ]
    report = run_spike(retriever, corpus, cases, k_values=(1, 3), config="bm25")
    assert isinstance(report, SpikeReport)
    assert report.n_scored_cases == 2
    assert report.recall_at_k[1] == 1.0
    assert report.mrr == 1.0
    assert "bm25" in format_report(report)


def test_run_spike_skips_non_scorable_cases():
    corpus = _corpus()
    retriever = LexicalRetriever(corpus)
    cases = [
        _case("c1", "menstruation", ("kb-puberty",)),
        EvalCase("crisis", "someone is hurting my child", Language.EN, EvalCategory.CRISIS),
    ]
    report = run_spike(retriever, corpus, cases, k_values=(1,))
    assert report.n_scored_cases == 1


def test_run_spike_raises_without_scorable_cases():
    corpus = _corpus()
    retriever = LexicalRetriever(corpus)
    only_crisis = [EvalCase("x", "hurt", Language.EN, EvalCategory.CRISIS)]
    with pytest.raises(ValueError):
        run_spike(retriever, corpus, only_crisis)


def test_run_spike_rejects_empty_k_values():
    corpus = _corpus()
    retriever = LexicalRetriever(corpus)
    with pytest.raises(ValueError):
        run_spike(retriever, corpus, [_case("c1", "menstruation", ("kb-puberty",))], k_values=())


def test_compare_reports_orders_by_mrr():
    weak = SpikeReport("weak", 5, {1: 0.2}, mrr=0.3)
    strong = SpikeReport("strong", 5, {1: 0.9}, mrr=0.8)
    assert [r.config for r in compare_reports([weak, strong])] == ["strong", "weak"]


def test_compare_reports_by_recall():
    a = SpikeReport("a", 5, {5: 0.4}, mrr=0.9)
    b = SpikeReport("b", 5, {5: 0.7}, mrr=0.1)
    assert [r.config for r in compare_reports([a, b], by_mrr=False)] == ["b", "a"]
