import pytest

from parentconnect_ai.retrieval.fusion import reciprocal_rank_fusion
from parentconnect_ai.retrieval.interface import RetrievalResult


def _results(*chunk_ids: str) -> list[RetrievalResult]:
    return [RetrievalResult(chunk_id=cid, score=1.0) for cid in chunk_ids]


def test_item_ranked_by_both_arms_beats_single_arm_item():
    dense = _results("a", "b", "c")
    lexical = _results("a", "d", "e")
    fused = reciprocal_rank_fusion([dense, lexical])
    assert fused[0].chunk_id == "a"


def test_fusion_of_single_list_preserves_order():
    dense = _results("x", "y", "z")
    fused = reciprocal_rank_fusion([dense])
    assert [r.chunk_id for r in fused] == ["x", "y", "z"]


def test_fusion_includes_items_from_all_lists():
    dense = _results("a")
    lexical = _results("b")
    fused = reciprocal_rank_fusion([dense, lexical])
    assert {r.chunk_id for r in fused} == {"a", "b"}


def test_empty_lists_return_empty():
    assert reciprocal_rank_fusion([]) == []
    assert reciprocal_rank_fusion([[], []]) == []


def test_lower_k_constant_sharpens_top_rank_advantage():
    dense = _results("a", "b")
    tight = {r.chunk_id: r.score for r in reciprocal_rank_fusion([dense], k=1)}
    loose = {r.chunk_id: r.score for r in reciprocal_rank_fusion([dense], k=1000)}
    # with a small k, rank-1 pulls further ahead of rank-2 than with a huge k
    assert (tight["a"] - tight["b"]) > (loose["a"] - loose["b"])


def test_rejects_nonpositive_k():
    with pytest.raises(ValueError):
        reciprocal_rank_fusion([_results("a")], k=0)
