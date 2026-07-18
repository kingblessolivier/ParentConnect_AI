import pytest

from parentconnect_ai.kb.ingest import (
    ContentNotApprovedError,
    ingest_corpus,
    ingest_version,
)
from parentconnect_ai.kb.schema import (
    AgeBand,
    ContentStatus,
    ContentVersion,
    Language,
)


def _version(status: ContentStatus, vid: str = "kb-1", body: str = "hello world") -> ContentVersion:
    return ContentVersion(
        version_id=vid,
        item_id="item-1",
        version=1,
        status=status,
        language=Language.RW,
        age_band=AgeBand.B13_15,
        topic="puberty_development",
        body=body,
    )


def test_ingest_published_produces_chunks_with_citation_target():
    chunks = ingest_version(_version(ContentStatus.PUBLISHED))
    assert len(chunks) == 1
    assert chunks[0].version_id == "kb-1"
    assert chunks[0].chunk_id == "kb-1:0"
    assert chunks[0].age_band is AgeBand.B13_15


@pytest.mark.parametrize(
    "status",
    [
        ContentStatus.DRAFT,
        ContentStatus.CLINICAL_REVIEW,
        ContentStatus.CULTURAL_REVIEW,
        ContentStatus.APPROVED,  # approved but NOT yet published — still refused
        ContentStatus.RETIRED,
    ],
)
def test_ingest_refuses_non_published(status):
    with pytest.raises(ContentNotApprovedError):
        ingest_version(_version(status))


def test_ingest_corpus_skips_non_published():
    versions = [
        _version(ContentStatus.PUBLISHED, vid="pub-1"),
        _version(ContentStatus.DRAFT, vid="draft-1"),
        _version(ContentStatus.PUBLISHED, vid="pub-2"),
    ]
    chunks = ingest_corpus(versions)
    source_ids = {c.version_id for c in chunks}
    assert source_ids == {"pub-1", "pub-2"}
    assert "draft-1" not in source_ids


def test_ingest_applies_normalisation():
    chunks = ingest_version(_version(ContentStatus.PUBLISHED, body="  HELLO   World  "))
    assert chunks[0].text == "hello world"
