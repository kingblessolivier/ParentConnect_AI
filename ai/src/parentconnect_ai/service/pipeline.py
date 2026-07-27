"""The coach pipeline (docs/ai/ai-architecture.md).

Order (safety first): crisis detection → refusal policy → retrieval → grounding
gate → generation → post-generation citation check. A health answer is produced
only when approved context clears the grounding gate AND the generator cites an
approved source; otherwise the pipeline returns an honest "I don't know".

Generation is behind a ``Generator`` seam. No LLM is wired yet (the model choice
is ADR-0004, pending the Q2 residency ruling), so the default pipeline has no
generator and the grounded path returns "I don't know" until one is configured.
Tests inject a fake generator to exercise the grounded path.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from ..kb.schema import AgeBand, Chunk, Language
from ..retrieval.gate import evaluate_grounding_gate
from ..retrieval.interface import Retriever
from ..safety.crisis import detect_crisis
from ..safety.refusal import detect_refusal_reasons

SafetyFlag = str  # 'none' | 'crisis' | 'out_of_scope' | 'refused'


@dataclass(frozen=True)
class Citation:
    content_version_id: str
    title: str


@dataclass(frozen=True)
class CoachResult:
    answer: str
    citations: list[Citation]
    safety_flag: SafetyFlag
    conversation_starters: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class GeneratedAnswer:
    answer: str
    citations: list[Citation]


class Generator(Protocol):
    """Produces a grounded answer from approved context, or raises if it can't.

    The generator MUST answer only from ``contexts`` and cite the approved
    sources it used (FR-09/NFR-22); an answer with no citations is suppressed
    by the pipeline.
    """

    def generate(self, question: str, contexts: list[Chunk]) -> GeneratedAnswer: ...


# Minimal localized fallbacks. Real wording is authored + culturally reviewed
# (NFR-24); referral CONTACTS are attached by the Node tier from the per-district
# directory (this service only sets the safety flag).
_CRISIS_MESSAGE: dict[str, str] = {
    "rw": "Urakoze kubwira. Ibi ni ibintu bikomeye, kandi hari abashobora kugufasha nonaha. Reba imibare y'ubufasha iri hepfo.",
    "en": "Thank you for reaching out. This is serious and there are people who can help right now. Please see the help numbers below.",
    "fr": "Merci de vous être confié. C'est sérieux et des personnes peuvent vous aider tout de suite. Voir les numéros ci-dessous.",
}
_REFUSAL_MESSAGE: dict[str, str] = {
    "rw": "Iki kibazo gisaba umuganga w'umwuga. Sinshobora gutanga isuzuma cyangwa imiti; nyabuna gana umuganga cyangwa ivuriro.",
    "en": "This needs a qualified health professional. I can't diagnose or advise on medication — please see a health worker or clinic.",
    "fr": "Cela nécessite un professionnel de santé qualifié. Je ne peux pas diagnostiquer ni conseiller de médicaments — consultez un soignant ou une clinique.",
}
_IDK_MESSAGE: dict[str, str] = {
    "rw": "Nta makuru yemejwe mfite kuri iki kibazo. Nagusaba kubaza umujyanama w'ubuzima cyangwa ivuriro.",
    "en": "I don't have approved information on that. I'd suggest asking a community health worker or a clinic.",
    "fr": "Je n'ai pas d'information approuvée à ce sujet. Je vous suggère de demander à un agent de santé ou à une clinique.",
}


def _msg(table: dict[str, str], language: str) -> str:
    return table.get(language, table["en"])


class CoachPipeline:
    def __init__(
        self,
        retriever: Retriever,
        chunks_by_id: dict[str, Chunk],
        *,
        generator: Generator | None = None,
        k: int = 5,
    ) -> None:
        self._retriever = retriever
        self._chunks_by_id = chunks_by_id
        self._generator = generator
        self._k = k

    def run(
        self, question: str, language: Language, age_band: AgeBand | None = None
    ) -> CoachResult:
        lang = language.value if isinstance(language, Language) else str(language)

        # L1 pre-generation safety — runs before retrieval/generation so it works
        # even if those fail (safety-and-guardrails.md).
        if detect_crisis(question):
            return CoachResult(_msg(_CRISIS_MESSAGE, lang), [], "crisis")
        if detect_refusal_reasons(question):
            return CoachResult(_msg(_REFUSAL_MESSAGE, lang), [], "refused")

        # Retrieval + grounding gate.
        results = self._retriever.retrieve(question, self._k)
        gate = evaluate_grounding_gate(results)
        if not gate.passed or self._generator is None:
            return CoachResult(_msg(_IDK_MESSAGE, lang), [], "out_of_scope")

        contexts = [
            self._chunks_by_id[cid] for cid in gate.matched_chunk_ids if cid in self._chunks_by_id
        ]
        generated = self._generator.generate(question, contexts)

        # Post-generation: an uncited health answer is suppressed (NFR-22).
        if not generated.citations:
            return CoachResult(_msg(_IDK_MESSAGE, lang), [], "out_of_scope")

        return CoachResult(generated.answer, generated.citations, "none")
