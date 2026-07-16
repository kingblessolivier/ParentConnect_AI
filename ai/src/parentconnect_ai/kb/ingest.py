"""Ingestion with an approval guard.

The single most important safety property of the corpus layer: **only PUBLISHED
content is ever ingested** (FR-20, FR-09). Attempting to ingest anything else
raises — there is no path for draft/unapproved content to reach the retriever.
"""

from __future__ import annotations

from collections.abc import Iterable

from .chunking import chunk_text, normalize
from .schema import Chunk, ContentVersion


class ContentNotApprovedError(ValueError):
    """Raised when ingestion is attempted on non-published content (FR-20)."""


def ingest_version(
    version: ContentVersion,
    *,
    target_words: int = 200,
    synonym_map: dict[str, str] | None = None,
) -> list[Chunk]:
    """Normalise, chunk, and tag one PUBLISHED content version.

    Raises ContentNotApprovedError if the version is not retrievable.
    """
    if not version.is_retrievable():
        raise ContentNotApprovedError(
            f"refusing to ingest {version.version_id}: status={version.status.value} "
            f"(only 'published' content may be ingested — FR-20)"
        )

    normalized = normalize(version.body, synonym_map=synonym_map)
    texts = chunk_text(normalized, target_words=target_words)
    return [
        Chunk(
            chunk_id=f"{version.version_id}:{index}",
            version_id=version.version_id,
            topic=version.topic,
            age_band=version.age_band,
            language=version.language,
            text=text,
        )
        for index, text in enumerate(texts)
    ]


def ingest_corpus(
    versions: Iterable[ContentVersion],
    *,
    target_words: int = 200,
    synonym_map: dict[str, str] | None = None,
) -> list[Chunk]:
    """Ingest a corpus, silently skipping non-published versions.

    Unlike ``ingest_version`` (which raises), this is the batch path: it filters
    to retrievable versions so a mixed corpus can be processed. Non-published
    content is skipped, never chunked.
    """
    chunks: list[Chunk] = []
    for version in versions:
        if version.is_retrievable():
            chunks.extend(
                ingest_version(version, target_words=target_words, synonym_map=synonym_map)
            )
    return chunks
