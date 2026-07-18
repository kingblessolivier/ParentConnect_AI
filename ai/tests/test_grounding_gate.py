from parentconnect_ai.retrieval.gate import (
    GroundingGateThresholds,
    evaluate_grounding_gate,
)
from parentconnect_ai.retrieval.interface import RetrievalResult


def _results(*scored: tuple[str, float]) -> list[RetrievalResult]:
    return [RetrievalResult(chunk_id=cid, score=score) for cid, score in scored]


def test_default_thresholds_pass_with_one_positive_score_match():
    results = _results(("a", 0.5))
    result = evaluate_grounding_gate(results)
    assert result.passed
    assert result.matched_chunk_ids == ("a",)


def test_fails_when_no_results():
    result = evaluate_grounding_gate([])
    assert not result.passed
    assert result.matched_chunk_ids == ()


def test_fails_when_scores_below_min_score_threshold():
    results = _results(("a", 0.1), ("b", 0.05))
    thresholds = GroundingGateThresholds(min_score=0.2)
    result = evaluate_grounding_gate(results, thresholds)
    assert not result.passed
    assert result.matched_chunk_ids == ()


def test_min_matches_requires_multiple_chunks():
    results = _results(("a", 0.9))
    thresholds = GroundingGateThresholds(min_matches=2)
    result = evaluate_grounding_gate(results, thresholds)
    assert not result.passed


def test_min_matches_passes_when_enough_chunks_clear_the_bar():
    results = _results(("a", 0.9), ("b", 0.8), ("c", 0.01))
    thresholds = GroundingGateThresholds(min_score=0.5, min_matches=2)
    result = evaluate_grounding_gate(results, thresholds)
    assert result.passed
    assert result.matched_chunk_ids == ("a", "b")
