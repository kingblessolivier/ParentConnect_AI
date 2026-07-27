from parentconnect_ai.kb.schema import AgeBand, Chunk, Language
from parentconnect_ai.retrieval.interface import RetrievalResult, Retriever
from parentconnect_ai.service.pipeline import (
    Citation,
    CoachPipeline,
    GeneratedAnswer,
)


class FakeRetriever:
    def __init__(self, results: list[RetrievalResult]) -> None:
        self._results = results

    def retrieve(self, query: str, k: int) -> list[RetrievalResult]:
        return self._results[:k]


class FakeGenerator:
    def __init__(self, answer: str, citations: list[Citation]) -> None:
        self._answer = answer
        self._citations = citations

    def generate(self, question: str, contexts: list[Chunk]) -> GeneratedAnswer:
        return GeneratedAnswer(self._answer, self._citations)


def _chunk(cid: str, vid: str) -> Chunk:
    return Chunk(cid, vid, "srh", AgeBand.B13_15, Language.RW, "approved text")


def _pipeline(results=None, chunks=None, generator=None) -> CoachPipeline:
    retriever: Retriever = FakeRetriever(results or [])
    by_id = {c.chunk_id: c for c in (chunks or [])}
    return CoachPipeline(retriever, by_id, generator=generator)


def test_crisis_short_circuits_before_retrieval():
    result = _pipeline().run("she is pregnant", Language.EN)
    assert result.safety_flag == "crisis"
    assert result.citations == []


def test_refusal_detected():
    result = _pipeline().run("do i have an infection?", Language.EN)
    assert result.safety_flag == "refused"


def test_no_approved_context_returns_i_dont_know():
    # empty retrieval -> grounding gate fails
    result = _pipeline().run("when does puberty start?", Language.EN)
    assert result.safety_flag == "out_of_scope"
    assert result.citations == []


def test_no_generator_configured_returns_i_dont_know_even_if_grounded():
    chunk = _chunk("kb-1:0", "kb-1")
    results = [RetrievalResult("kb-1:0", 5.0)]
    result = _pipeline(results, [chunk], generator=None).run("puberty", Language.EN)
    assert result.safety_flag == "out_of_scope"


def test_grounded_answer_with_generator():
    chunk = _chunk("kb-1:0", "kb-1")
    results = [RetrievalResult("kb-1:0", 5.0)]
    gen = FakeGenerator("Puberty usually begins...", [Citation("kb-1", "Puberty")])
    result = _pipeline(results, [chunk], generator=gen).run("puberty", Language.EN)
    assert result.safety_flag == "none"
    assert result.answer.startswith("Puberty")
    assert result.citations[0].content_version_id == "kb-1"


def test_uncited_generation_is_suppressed():
    chunk = _chunk("kb-1:0", "kb-1")
    results = [RetrievalResult("kb-1:0", 5.0)]
    gen = FakeGenerator("An answer with no sources", [])  # uncited -> suppressed
    result = _pipeline(results, [chunk], generator=gen).run("puberty", Language.EN)
    assert result.safety_flag == "out_of_scope"


def test_localized_idk_message():
    result = _pipeline().run("puberty", Language.RW)
    assert result.answer == _pipeline().run("puberty", Language.RW).answer
    # Kinyarwanda idk message (not the English one)
    assert "approved information" not in result.answer
