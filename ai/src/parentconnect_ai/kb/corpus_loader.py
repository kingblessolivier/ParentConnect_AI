"""Load seed corpus files into ``ContentVersion`` objects (FR-20).

Two invariants are enforced here rather than trusted to the file:

1. **Status is forced to DRAFT.** A YAML file cannot declare itself approved.
   Approval is a human act recorded through the editorial workflow, so the only
   status this loader can produce is ``DRAFT`` — which the ingest guard then
   refuses to index. A file that tries to set ``status: published`` is rejected
   outright rather than quietly downgraded, because that attempt is a red flag
   worth surfacing.

2. **Every entry must name its sources.** An unsourced claim in an SRH corpus is
   the exact failure mode this whole architecture exists to prevent (FR-09,
   NFR-22), so an entry with no ``sources`` is a load error, not a warning.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from .schema import AgeBand, ContentStatus, ContentVersion, Language


class CorpusLoadError(ValueError):
    """Raised when a seed corpus file is malformed or unsafe to load."""


@dataclass(frozen=True)
class SeedEntry:
    """A drafted corpus entry plus the provenance a reviewer needs."""

    version: ContentVersion
    title: str
    sources: tuple[str, ...]


def _require(raw: dict[str, Any], key: str, where: str) -> Any:
    if key not in raw or raw[key] in (None, "", []):
        raise CorpusLoadError(f"{where}: '{key}' is required")
    return raw[key]


def _parse_entry(raw: dict[str, Any], index: int) -> SeedEntry:
    where = f"entry[{index}]"
    if not isinstance(raw, dict):
        raise CorpusLoadError(f"{where}: must be a mapping")

    # A seed file may never claim approval for itself.
    declared = raw.get("status")
    if declared is not None and declared != ContentStatus.DRAFT.value:
        raise CorpusLoadError(
            f"{where}: refusing to load status={declared!r} — seed corpus entries are "
            f"drafts by definition; approval happens through the editorial workflow (FR-20)"
        )

    item_id = str(_require(raw, "item_id", where))
    sources = _require(raw, "sources", where)
    if not isinstance(sources, list) or not all(isinstance(s, str) and s.strip() for s in sources):
        raise CorpusLoadError(f"{where}: 'sources' must be a non-empty list of strings")

    try:
        language = Language(str(_require(raw, "language", where)))
        age_band = AgeBand(str(_require(raw, "age_band", where)))
    except ValueError as err:
        raise CorpusLoadError(f"{where}: {err}") from err

    version = ContentVersion(
        version_id=f"{item_id}-v1",
        item_id=item_id,
        version=1,
        status=ContentStatus.DRAFT,  # forced, never read from the file
        language=language,
        age_band=age_band,
        topic=str(_require(raw, "topic", where)),
        body=str(_require(raw, "body", where)).strip(),
    )
    return SeedEntry(
        version=version,
        title=str(_require(raw, "title", where)),
        sources=tuple(sources),
    )


def load_seed_corpus(path: str | Path) -> list[SeedEntry]:
    """Load and validate one seed corpus YAML file."""
    text = Path(path).read_text(encoding="utf-8")
    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as err:
        raise CorpusLoadError(f"{path}: invalid YAML: {err}") from err

    if not isinstance(data, dict):
        raise CorpusLoadError(f"{path}: top level must be a mapping")
    entries = data.get("entries")
    if not isinstance(entries, list) or not entries:
        raise CorpusLoadError(f"{path}: 'entries' must be a non-empty list")

    parsed = [_parse_entry(entry, i) for i, entry in enumerate(entries)]

    seen: set[str] = set()
    for entry in parsed:
        if entry.version.item_id in seen:
            raise CorpusLoadError(f"{path}: duplicate item_id {entry.version.item_id!r}")
        seen.add(entry.version.item_id)
    return parsed


def load_seed_directory(directory: str | Path) -> list[SeedEntry]:
    """Load every ``*.yaml`` seed file in a directory, sorted by filename."""
    root = Path(directory)
    if not root.is_dir():
        raise CorpusLoadError(f"{directory}: not a directory")
    entries: list[SeedEntry] = []
    for path in sorted(root.glob("*.yaml")):
        entries.extend(load_seed_corpus(path))
    return entries
