"""Entrypoint: build the default pipeline and serve it.

Run: ``uvicorn parentconnect_ai.service.main:app`` (or ``python -m ...``).

The default pipeline has an **empty corpus and no generator** — until the
approved knowledge base is ingested and a model is chosen (ADR-0004), every
answer routes to the safe "I don't know" / crisis / refusal paths. That is the
correct behaviour: the coach must not answer health questions without approved
content (FR-09).
"""

from __future__ import annotations

from ..retrieval.lexical import LexicalRetriever
from .app import create_app
from .pipeline import CoachPipeline


def build_default_pipeline() -> CoachPipeline:
    # No approved content ingested yet -> retrieval is empty -> grounding gate
    # fails -> "I don't know". Ingest real KB chunks here once approved.
    return CoachPipeline(retriever=LexicalRetriever([]), chunks_by_id={}, generator=None)


app = create_app(build_default_pipeline())
