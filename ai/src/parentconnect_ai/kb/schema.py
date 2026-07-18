"""Knowledge-base schema types.

Mirrors docs/architecture/data-model.md (CONTENT_ITEM / CONTENT_VERSION) and
docs/ai/knowledge-base-spec.md. Uses stdlib dataclasses + enums only (no third-
party dependency) so it runs anywhere.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Language(str, Enum):
    RW = "rw"  # Kinyarwanda (default)
    EN = "en"
    FR = "fr"


class AgeBand(str, Enum):
    B10_12 = "10_12"
    B13_15 = "13_15"
    B16_19 = "16_19"
    ALL = "all"


class ContentStatus(str, Enum):
    """Editorial workflow states (FR-20). Only PUBLISHED is retrievable."""

    DRAFT = "draft"
    CLINICAL_REVIEW = "clinical_review"
    CULTURAL_REVIEW = "cultural_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    RETIRED = "retired"


#: The only status whose content may enter the retrieval index (FR-20, FR-09).
RETRIEVABLE_STATUSES: frozenset[ContentStatus] = frozenset({ContentStatus.PUBLISHED})


@dataclass(frozen=True)
class ContentVersion:
    """One version of a content item. Citation target for answers (FR-15)."""

    version_id: str
    item_id: str
    version: int
    status: ContentStatus
    language: Language
    age_band: AgeBand
    topic: str
    body: str
    audio_uri: str | None = None
    clinical_approved_by: str | None = None
    cultural_approved_by: str | None = None

    def is_retrievable(self) -> bool:
        return self.status in RETRIEVABLE_STATUSES


@dataclass(frozen=True)
class Chunk:
    """A retrievable unit. Carries its source version id for citation (NFR-22)."""

    chunk_id: str
    version_id: str
    topic: str
    age_band: AgeBand
    language: Language
    text: str
    metadata: dict[str, str] = field(default_factory=dict)
