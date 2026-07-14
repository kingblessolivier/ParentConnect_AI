"""Grounding checks — seed of the post-generation safety layer.

A health answer must cite at least one APPROVED source (FR-09, NFR-22); an
answer with no valid citation is suppressed and the coach returns the
"I don't know / refer" path (docs/ai/safety-and-guardrails.md). These are pure
helpers so the coverage gate has real logic to measure; the full pipeline is
built in Phase 1.
"""

from __future__ import annotations

from collections.abc import Iterable


def is_grounded(cited_source_ids: Iterable[str], approved_source_ids: Iterable[str]) -> bool:
    """True iff at least one cited source is in the approved set.

    Only clinician-approved sources may ground a health answer. An empty or
    unapproved-only citation set is NOT grounded.
    """
    approved = set(approved_source_ids)
    return any(source_id in approved for source_id in cited_source_ids)


def unsupported_citations(
    cited_source_ids: Iterable[str], approved_source_ids: Iterable[str]
) -> list[str]:
    """Return cited sources that are not in the approved set (should be empty)."""
    approved = set(approved_source_ids)
    return [source_id for source_id in cited_source_ids if source_id not in approved]
