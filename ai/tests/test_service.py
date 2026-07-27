from fastapi.testclient import TestClient

from parentconnect_ai.kb.schema import AgeBand, Chunk, Language
from parentconnect_ai.retrieval.interface import RetrievalResult
from parentconnect_ai.service.app import create_app
from parentconnect_ai.service.pipeline import Citation, CoachPipeline, GeneratedAnswer


class FakeRetriever:
    def __init__(self, results):
        self._results = results

    def retrieve(self, query, k):
        return self._results[:k]


class FakeGenerator:
    def generate(self, question, contexts):
        return GeneratedAnswer("Grounded answer.", [Citation("kb-1", "Puberty")])


def _client(results=None, chunks=None, generator=None) -> TestClient:
    by_id = {c.chunk_id: c for c in (chunks or [])}
    pipeline = CoachPipeline(FakeRetriever(results or []), by_id, generator=generator)
    return TestClient(create_app(pipeline))


def test_health():
    assert _client().get("/health").json() == {"status": "ok"}


def test_coach_idk_when_no_content():
    r = _client().post("/coach", json={"question": "puberty?", "language": "en"})
    assert r.status_code == 200
    body = r.json()
    assert body["safetyFlag"] == "out_of_scope"
    assert body["citations"] == []


def test_coach_crisis_flag():
    r = _client().post("/coach", json={"question": "she is pregnant", "language": "en"})
    assert r.json()["safetyFlag"] == "crisis"


def test_coach_grounded_response_shape_matches_node_contract():
    chunk = Chunk("kb-1:0", "kb-1", "srh", AgeBand.B13_15, Language.EN, "text")
    r = _client([RetrievalResult("kb-1:0", 5.0)], [chunk], FakeGenerator()).post(
        "/coach", json={"question": "puberty", "language": "en", "ageBand": "13_15"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["answer"] == "Grounded answer."
    assert body["safetyFlag"] == "none"
    assert body["citations"][0] == {"contentVersionId": "kb-1", "title": "Puberty"}
    assert body["conversationStarters"] == []


def test_coach_rejects_invalid_language():
    r = _client().post("/coach", json={"question": "hi", "language": "sw"})
    assert r.status_code == 422  # Node treats non-2xx as failure -> degrades
