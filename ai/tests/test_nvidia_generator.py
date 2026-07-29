"""Unit tests for the NVIDIA generator adapter.

The network call is injected, so these exercise prompt assembly, JSON parsing,
citation mapping, the safety suppression paths, and the residency guard — with
no key and no network.
"""

import pytest

from parentconnect_ai.kb.schema import AgeBand, Chunk, Language
from parentconnect_ai.service.nvidia_generator import (
    DEFAULT_BASE_URL,
    NvidiaConfig,
    NvidiaGenerator,
    build_generator_from_env,
    default_completion,
)


def _chunk(vid: str, title: str, text: str = "approved text") -> Chunk:
    return Chunk(f"{vid}:0", vid, "srh", AgeBand.B13_15, Language.RW, text, {"title": title})


CTX = [_chunk("kb-1", "Puberty basics"), _chunk("kb-2", "Talking about consent")]


def _gen(reply: str) -> tuple[NvidiaGenerator, list]:
    seen: list[list[dict[str, str]]] = []

    def fake_complete(messages):
        seen.append(messages)
        return reply

    return NvidiaGenerator(fake_complete), seen


def test_grounded_answer_maps_used_sources_to_citations():
    gen, seen = _gen(
        '{"answerable": true, "answer": "Puberty is normal.", "used_sources": ["kb-1"]}'
    )
    out = gen.generate("what is puberty?", CTX)
    assert out.answer == "Puberty is normal."
    assert [(c.content_version_id, c.title) for c in out.citations] == [("kb-1", "Puberty basics")]
    # the approved context and question both reach the model
    user_msg = seen[0][1]["content"]
    assert "kb-1" in user_msg and "what is puberty?" in user_msg


def test_multiple_sources_are_deduped_and_titled():
    gen, _ = _gen('{"answerable": true, "answer": "A.", "used_sources": ["kb-2", "kb-1", "kb-1"]}')
    out = gen.generate("q", CTX)
    assert [c.content_version_id for c in out.citations] == ["kb-2", "kb-1"]


def test_unanswerable_yields_no_citations():
    gen, _ = _gen('{"answerable": false, "answer": "", "used_sources": []}')
    out = gen.generate("q", CTX)
    assert out.answer == "" and out.citations == []


def test_answer_citing_unknown_source_is_dropped():
    # model cites a source that was not in the provided context → no citation,
    # so the pipeline will suppress it (never fabricate a citation, NFR-22).
    gen, _ = _gen('{"answerable": true, "answer": "A.", "used_sources": ["kb-999"]}')
    out = gen.generate("q", CTX)
    assert out.citations == []


def test_tolerates_code_fenced_json():
    gen, _ = _gen('```json\n{"answerable": true, "answer": "Yes.", "used_sources": ["kb-1"]}\n```')
    out = gen.generate("q", CTX)
    assert out.answer == "Yes." and out.citations[0].content_version_id == "kb-1"


def test_unparseable_reply_is_safe():
    gen, _ = _gen("the model rambled without json")
    out = gen.generate("q", CTX)
    assert out.answer == "" and out.citations == []


def test_answerable_but_blank_answer_is_suppressed():
    gen, _ = _gen('{"answerable": true, "answer": "   ", "used_sources": ["kb-1"]}')
    out = gen.generate("q", CTX)
    assert out.answer == "" and out.citations == []


def test_default_completion_calls_openai_compatible_endpoint(monkeypatch):
    captured = {}

    class FakeResp:
        def raise_for_status(self):
            captured["raised"] = True

        def json(self):
            return {"choices": [{"message": {"content": '{"answerable": false}'}}]}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, body=json, timeout=timeout)
        return FakeResp()

    import httpx

    monkeypatch.setattr(httpx, "post", fake_post)
    complete = default_completion(
        NvidiaConfig(api_key="secret", model="meta/llama-3.1-8b-instruct")
    )
    out = complete([{"role": "user", "content": "hi"}])

    assert out == '{"answerable": false}'
    assert captured["url"].endswith("/chat/completions")
    assert captured["headers"]["Authorization"] == "Bearer secret"
    assert captured["body"]["model"] == "meta/llama-3.1-8b-instruct"
    assert captured["body"]["response_format"] == {"type": "json_object"}


def test_no_contexts_short_circuits_without_calling_model():
    called = []
    gen = NvidiaGenerator(lambda m: called.append(m) or "{}")
    out = gen.generate("q", [])
    assert out.answer == "" and out.citations == [] and called == []


class TestResidencyGuard:
    def test_unconfigured_returns_none(self):
        assert build_generator_from_env({}) is None

    def test_dev_offshore_is_allowed(self):
        gen = build_generator_from_env({"NVIDIA_API_KEY": "k"})
        assert gen is not None

    def test_production_offshore_refused_without_signoff(self):
        with pytest.raises(RuntimeError, match="residency"):
            build_generator_from_env({"NVIDIA_API_KEY": "k", "PARENTCONNECT_ENV": "production"})

    def test_production_offshore_allowed_with_explicit_signoff(self):
        gen = build_generator_from_env(
            {
                "NVIDIA_API_KEY": "k",
                "PARENTCONNECT_ENV": "production",
                "ALLOW_OFFSHORE_LLM": "true",
            }
        )
        assert gen is not None

    def test_production_in_region_nim_is_allowed(self):
        gen = build_generator_from_env(
            {
                "NVIDIA_API_KEY": "k",
                "PARENTCONNECT_ENV": "production",
                "NVIDIA_BASE_URL": "https://nim.parentconnect.internal/v1",
            }
        )
        assert gen is not None

    def test_default_base_url_is_the_public_cloud(self):
        # guards the _is_offshore assumption in the residency check
        assert DEFAULT_BASE_URL.endswith("api.nvidia.com/v1")
