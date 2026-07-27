"""FastAPI app exposing ``POST /coach`` to the Node backend (ADR-0014).

The response shape matches the Node ``AiCoachResult`` contract (camelCase keys).
No PII is received or stored — only question, language, and age band (ADR-0004).
"""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

from ..kb.schema import AgeBand, Language
from .pipeline import CoachPipeline


class CoachRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    question: str
    language: Language = Language.RW
    age_band: AgeBand | None = Field(default=None, alias="ageBand")


class CitationModel(BaseModel):
    content_version_id: str = Field(serialization_alias="contentVersionId")
    title: str


class CoachResponse(BaseModel):
    answer: str
    citations: list[CitationModel]
    safety_flag: str = Field(serialization_alias="safetyFlag")
    conversation_starters: list[str] = Field(serialization_alias="conversationStarters")


def create_app(pipeline: CoachPipeline) -> FastAPI:
    app = FastAPI(title="ParentConnect AI service", version="0.0.0")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/coach", response_model=CoachResponse)
    def coach(req: CoachRequest) -> CoachResponse:
        result = pipeline.run(req.question, req.language, req.age_band)
        return CoachResponse(
            answer=result.answer,
            citations=[
                CitationModel(content_version_id=c.content_version_id, title=c.title)
                for c in result.citations
            ],
            safety_flag=result.safety_flag,
            conversation_starters=result.conversation_starters,
        )

    return app
