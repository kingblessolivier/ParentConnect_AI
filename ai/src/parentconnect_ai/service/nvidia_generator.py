"""NVIDIA-backed generator for the coach pipeline (behind the ``Generator`` seam).

NVIDIA's API (``https://integrate.api.nvidia.com/v1``) is OpenAI-compatible, so
this adapter plugs straight into ``CoachPipeline`` as its ``generate`` step.

**Safety posture (ADR-0003/0004):**
  * The model is instructed to answer **only** from the approved contexts it is
    given and to name the sources it used; if the question can't be answered
    from those contexts it must say so, and we return **no citations** — the
    pipeline then suppresses the answer to an honest "I don't know" (NFR-22).
  * **Residency (Q2):** the public NVIDIA cloud endpoint is offshore. This
    adapter is meant for the **Phase-0 eval spike** against the synthetic eval
    set — never real user PII — so ``build_generator_from_env`` refuses to wire
    the offshore endpoint in production unless residency sign-off is recorded
    (``ALLOW_OFFSHORE_LLM=true``). The in-region path is NVIDIA NIM self-hosted
    (set ``NVIDIA_BASE_URL`` to the in-region host); see docs/ai/model-selection.

The network call is injected (``complete``) so the parsing/grounding logic is
unit-tested without a key or a network.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import urlparse

from ..kb.schema import Chunk
from .pipeline import Citation, GeneratedAnswer

DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "meta/llama-3.1-8b-instruct"

# A completion function takes chat messages and returns the raw model text.
CompletionFn = Callable[[list[dict[str, str]]], str]

_SYSTEM_PROMPT = (
    "You are a careful assistant helping a parent in Rwanda talk with their "
    "adolescent about growing up and reproductive health. You may ONLY use the "
    "APPROVED CONTEXT provided. Never use outside knowledge. If the context does "
    'not answer the question, you must set "answerable" to false. Do not '
    "diagnose, prescribe, or advise on terminating a pregnancy. Reply ONLY with a "
    'JSON object: {"answerable": bool, "answer": string, "used_sources": '
    "[source_id, ...]}. Keep the answer warm, plain, and short."
)


def _context_block(contexts: list[Chunk]) -> str:
    lines = []
    for c in contexts:
        title = c.metadata.get("title", c.topic)
        lines.append(f"[source_id: {c.version_id}] ({title})\n{c.text}")
    return "\n\n".join(lines)


def _title_for(context: Chunk) -> str:
    return context.metadata.get("title", context.topic)


@dataclass(frozen=True)
class NvidiaConfig:
    api_key: str
    base_url: str = DEFAULT_BASE_URL
    model: str = DEFAULT_MODEL
    temperature: float = 0.2
    timeout_seconds: float = 20.0


@dataclass(frozen=True)
class NvidiaGenerator:
    """Generates a grounded answer via an OpenAI-compatible chat completion."""

    complete: CompletionFn

    def generate(self, question: str, contexts: list[Chunk]) -> GeneratedAnswer:
        if not contexts:
            return GeneratedAnswer("", [])

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"APPROVED CONTEXT:\n{_context_block(contexts)}\n\n" f"QUESTION: {question}"
                ),
            },
        ]
        raw = self.complete(messages)
        parsed = _parse_model_json(raw)
        if parsed is None or not parsed.get("answerable"):
            return GeneratedAnswer("", [])

        answer = str(parsed.get("answer", "")).strip()
        if not answer:
            return GeneratedAnswer("", [])

        by_version = {c.version_id: c for c in contexts}
        used = parsed.get("used_sources") or []
        citations: list[Citation] = []
        seen: set[str] = set()
        for sid in used:
            ctx = by_version.get(str(sid))
            if ctx is not None and ctx.version_id not in seen:
                seen.add(ctx.version_id)
                citations.append(Citation(ctx.version_id, _title_for(ctx)))

        # A grounded answer that names no (valid) source is suppressed upstream
        # (NFR-22) — never fabricate a citation to force an answer through.
        return GeneratedAnswer(answer, citations)


def _parse_model_json(raw: str) -> dict | None:
    """Best-effort parse of the model's JSON reply (tolerates code fences)."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        # drop an optional leading "json" language tag
        newline = text.find("\n")
        if newline != -1 and text[:newline].strip().lower() in {"json", ""}:
            text = text[newline + 1 :]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        obj = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return obj if isinstance(obj, dict) else None


def _is_offshore(base_url: str) -> bool:
    host = (urlparse(base_url).hostname or "").lower()
    # The public NVIDIA cloud API is offshore; a self-hosted NIM is whatever
    # host the operator points at (assumed in-region by the operator).
    return host.endswith("api.nvidia.com")


def default_completion(config: NvidiaConfig) -> CompletionFn:
    """A real completion function calling NVIDIA's OpenAI-compatible endpoint.

    ``httpx`` is imported lazily so unit tests (which inject a fake completion)
    don't require it, and so nothing network-related loads unless actually used.
    """

    def _complete(messages: list[dict[str, str]]) -> str:
        import httpx

        resp = httpx.post(
            f"{config.base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {config.api_key}"},
            json={
                "model": config.model,
                "messages": messages,
                "temperature": config.temperature,
                "response_format": {"type": "json_object"},
            },
            timeout=config.timeout_seconds,
        )
        resp.raise_for_status()
        data = resp.json()
        return str(data["choices"][0]["message"]["content"])

    return _complete


def build_generator_from_env(env: dict[str, str]) -> NvidiaGenerator | None:
    """Wire an ``NvidiaGenerator`` from environment, or ``None`` if unconfigured.

    Residency guard (Q2/ADR-0004): refuse the offshore cloud endpoint in
    production unless ``ALLOW_OFFSHORE_LLM=true`` records an explicit sign-off.
    """
    api_key = env.get("NVIDIA_API_KEY")
    if not api_key:
        return None

    base_url = env.get("NVIDIA_BASE_URL", DEFAULT_BASE_URL)
    app_env = env.get("PARENTCONNECT_ENV", "development").lower()
    allow_offshore = env.get("ALLOW_OFFSHORE_LLM", "false").lower() in {"1", "true", "yes"}

    if app_env == "production" and _is_offshore(base_url) and not allow_offshore:
        raise RuntimeError(
            "Refusing to use the offshore NVIDIA cloud endpoint in production "
            "without residency sign-off (Q2/ADR-0004). Point NVIDIA_BASE_URL at "
            "an in-region NIM, or set ALLOW_OFFSHORE_LLM=true once legal has "
            "approved (see docs/ai/model-selection.md)."
        )

    config = NvidiaConfig(
        api_key=api_key,
        base_url=base_url,
        model=env.get("NVIDIA_MODEL", DEFAULT_MODEL),
    )
    return NvidiaGenerator(default_completion(config))
