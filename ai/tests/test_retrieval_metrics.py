import pytest

from parentconnect_ai.evaluation.retrieval_metrics import (
    mean_reciprocal_rank,
    mean_recall_at_k,
    recall_at_k,
    reciprocal_rank,
)


def test_recall_at_k_full_hit():
    assert recall_at_k(["a", "b", "c"], ["a", "b"], k=3) == 1.0


def test_recall_at_k_partial():
    assert recall_at_k(["a", "x", "y"], ["a", "b"], k=3) == 0.5


def test_recall_at_k_respects_k_cutoff():
    # relevant 'b' is at rank 4, outside top-3
    assert recall_at_k(["x", "y", "z", "b"], ["b"], k=3) == 0.0


def test_recall_at_k_rejects_bad_k():
    with pytest.raises(ValueError):
        recall_at_k(["a"], ["a"], k=0)


def test_recall_at_k_rejects_empty_relevant():
    with pytest.raises(ValueError):
        recall_at_k(["a"], [], k=3)


def test_reciprocal_rank_first_position():
    assert reciprocal_rank(["a", "b"], ["a"]) == 1.0


def test_reciprocal_rank_third_position():
    assert reciprocal_rank(["x", "y", "a"], ["a"]) == pytest.approx(1 / 3)


def test_reciprocal_rank_none_found():
    assert reciprocal_rank(["x", "y"], ["a"]) == 0.0


def test_mean_metrics():
    samples = [(["a", "b"], ["a"]), (["x", "a"], ["a"])]
    assert mean_recall_at_k(samples, k=2) == 1.0
    assert mean_reciprocal_rank(samples) == pytest.approx((1.0 + 0.5) / 2)


def test_mean_metrics_reject_empty():
    with pytest.raises(ValueError):
        mean_recall_at_k([], k=2)
    with pytest.raises(ValueError):
        mean_reciprocal_rank([])
