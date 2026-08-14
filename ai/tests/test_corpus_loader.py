"""Tests for the seed corpus loader — and for the guarantee that seed content
cannot reach the retrieval index without human approval (FR-20)."""

from __future__ import annotations

from pathlib import Path

import pytest

from parentconnect_ai.kb.corpus_loader import (
    CorpusLoadError,
    load_seed_corpus,
    load_seed_directory,
)
from parentconnect_ai.kb.ingest import ContentNotApprovedError, ingest_corpus, ingest_version
from parentconnect_ai.kb.schema import ContentStatus

SEED_DIR = Path(__file__).resolve().parents[1] / "corpus" / "seed"


def write(tmp_path: Path, body: str) -> Path:
    path = tmp_path / "seed.yaml"
    path.write_text(body, encoding="utf-8")
    return path


VALID = """
entries:
  - item_id: kb-test
    topic: communication
    age_band: all
    language: en
    title: A title
    sources: ["WHO fact sheet, 2026"]
    body: "Some drafted guidance."
"""


class TestLoading:
    def test_loads_a_valid_entry_as_draft(self, tmp_path: Path) -> None:
        [entry] = load_seed_corpus(write(tmp_path, VALID))
        assert entry.version.status is ContentStatus.DRAFT
        assert entry.version.item_id == "kb-test"
        assert entry.sources == ("WHO fact sheet, 2026",)

    def test_refuses_a_file_that_claims_approval(self, tmp_path: Path) -> None:
        # The dangerous case: a file trying to grant itself publication.
        bad = VALID.replace("    title: A title", "    status: published\n    title: A title")
        with pytest.raises(CorpusLoadError, match="refusing to load status"):
            load_seed_corpus(write(tmp_path, bad))

    def test_requires_sources_on_every_entry(self, tmp_path: Path) -> None:
        bad = VALID.replace('    sources: ["WHO fact sheet, 2026"]\n', "")
        with pytest.raises(CorpusLoadError, match="sources"):
            load_seed_corpus(write(tmp_path, bad))

    def test_rejects_empty_sources_list(self, tmp_path: Path) -> None:
        bad = VALID.replace('sources: ["WHO fact sheet, 2026"]', "sources: []")
        with pytest.raises(CorpusLoadError, match="sources"):
            load_seed_corpus(write(tmp_path, bad))

    def test_rejects_unknown_language_or_age_band(self, tmp_path: Path) -> None:
        with pytest.raises(CorpusLoadError):
            load_seed_corpus(write(tmp_path, VALID.replace("language: en", "language: sw")))
        with pytest.raises(CorpusLoadError):
            load_seed_corpus(write(tmp_path, VALID.replace("age_band: all", "age_band: 30_40")))

    def test_rejects_duplicate_item_ids(self, tmp_path: Path) -> None:
        doubled = VALID + VALID.split("entries:")[1]
        with pytest.raises(CorpusLoadError, match="duplicate"):
            load_seed_corpus(write(tmp_path, doubled))

    def test_rejects_malformed_yaml_and_empty_entries(self, tmp_path: Path) -> None:
        with pytest.raises(CorpusLoadError):
            load_seed_corpus(write(tmp_path, "entries: []"))
        with pytest.raises(CorpusLoadError):
            load_seed_corpus(write(tmp_path, "just a string"))


class TestShippedSeedCorpus:
    """The real drafted corpus in ai/corpus/seed."""

    def test_loads_and_is_entirely_draft(self) -> None:
        entries = load_seed_directory(SEED_DIR)
        assert entries, "seed corpus should not be empty"
        assert all(e.version.status is ContentStatus.DRAFT for e in entries)

    def test_every_entry_names_at_least_one_source(self) -> None:
        for entry in load_seed_directory(SEED_DIR):
            assert entry.sources, f"{entry.version.item_id} has no source"

    def test_no_entry_is_empty(self) -> None:
        for entry in load_seed_directory(SEED_DIR):
            assert len(entry.version.body) > 100, f"{entry.version.item_id} looks like a stub"


class TestApprovalGateStillHolds:
    """The point of the whole exercise: research does NOT bypass review."""

    def test_ingesting_a_seed_entry_raises(self) -> None:
        entry = load_seed_directory(SEED_DIR)[0]
        with pytest.raises(ContentNotApprovedError):
            ingest_version(entry.version)

    def test_batch_ingest_silently_indexes_nothing_from_the_seed_corpus(self) -> None:
        versions = [e.version for e in load_seed_directory(SEED_DIR)]
        assert ingest_corpus(versions) == []
