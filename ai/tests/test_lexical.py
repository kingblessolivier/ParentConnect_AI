import pytest

from parentconnect_ai.kb.schema import AgeBand, Chunk, Language
from parentconnect_ai.retrieval.lexical import LexicalRetriever


def _chunk(chunk_id: str, text: str) -> Chunk:
    return Chunk(
        chunk_id=chunk_id,
        version_id=f"v-{chunk_id}",
        topic="puberty_development",
        age_band=AgeBand.B13_15,
        language=Language.RW,
        text=text,
    )


def test_retrieve_ranks_exact_term_match_first():
    chunks = [
        _chunk("a", "imihango y'ukwezi ni ikintu gisanzwe ku bakobwa"),
        _chunk("b", "consent na ubwiyunge mu bantu bakuze"),
        _chunk("c", "imyororokere n'ubuzima bw'imyororokere"),
    ]
    retriever = LexicalRetriever(chunks)
    results = retriever.retrieve("imihango", k=3)
    assert results
    assert results[0].chunk_id == "a"


def test_retrieve_respects_k():
    chunks = [_chunk(str(i), "puberty puberty puberty") for i in range(5)]
    retriever = LexicalRetriever(chunks)
    results = retriever.retrieve("puberty", k=2)
    assert len(results) == 2


def test_retrieve_excludes_zero_score_docs():
    chunks = [_chunk("a", "puberty content"), _chunk("b", "totally unrelated words")]
    retriever = LexicalRetriever(chunks)
    results = retriever.retrieve("puberty", k=10)
    assert [r.chunk_id for r in results] == ["a"]


def test_retrieve_empty_query_returns_empty():
    retriever = LexicalRetriever([_chunk("a", "some content")])
    assert retriever.retrieve("   ", k=5) == []


def test_retrieve_empty_corpus_returns_empty():
    retriever = LexicalRetriever([])
    assert retriever.retrieve("anything", k=5) == []


def test_retrieve_rejects_nonpositive_k():
    retriever = LexicalRetriever([_chunk("a", "content")])
    with pytest.raises(ValueError):
        retriever.retrieve("content", k=0)


def test_synonym_map_lets_euphemism_match_clinical_term():
    chunks = [_chunk("a", "menstruation is a normal part of puberty")]
    retriever = LexicalRetriever(chunks, synonym_map={"imihango": "menstruation"})
    results = retriever.retrieve("imihango", k=5)
    assert [r.chunk_id for r in results] == ["a"]


def test_term_frequency_increases_score():
    chunks = [
        _chunk("low", "consent matters"),
        _chunk("high", "consent consent consent consent"),
    ]
    retriever = LexicalRetriever(chunks)
    results = retriever.retrieve("consent", k=2)
    scores = {r.chunk_id: r.score for r in results}
    assert scores["high"] > scores["low"]
