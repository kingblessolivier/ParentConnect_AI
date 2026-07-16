"""Kinyarwanda-aware normalisation and semantic chunking.

Chunking is semantic (paragraph-packed toward a word target), NOT fixed-token,
because agglutinative Kinyarwanda token counts mislead fixed-size splitters
(docs/ai/kinyarwanda-strategy.md, docs/ai/ai-architecture.md). The morphological
analyser and the curated SRH synonym/stem map are wired in Phase 0; here we
expose the seam (``normalize`` takes an optional synonym map) plus correct,
tested packing logic.
"""

from __future__ import annotations

import re

_WHITESPACE = re.compile(r"\s+")
_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")


def normalize(text: str, synonym_map: dict[str, str] | None = None) -> str:
    """Orthographic normalisation + optional synonym/stem mapping.

    Lowercases, collapses whitespace, and (if provided) rewrites known SRH
    euphemisms/stems to their canonical form so a parent's phrasing retrieves
    the right approved content. The synonym map is authored with the clinical +
    cultural reviewers (kinyarwanda-strategy.md).
    """
    normalized = _WHITESPACE.sub(" ", text.strip().lower())
    if synonym_map:
        for term, canonical in synonym_map.items():
            normalized = re.sub(rf"\b{re.escape(term.lower())}\b", canonical.lower(), normalized)
    return normalized


def chunk_text(text: str, target_words: int = 200, min_words: int = 50) -> list[str]:
    """Pack paragraphs into chunks near ``target_words``.

    A new chunk starts when adding the next paragraph would exceed the target
    AND the current chunk already has at least ``min_words`` (so we don't emit
    tiny fragments). A single oversized paragraph becomes its own chunk;
    sentence-level splitting of very long paragraphs is a Phase-0 refinement.
    """
    if target_words <= 0:
        raise ValueError("target_words must be positive")
    paragraphs = [p.strip() for p in _PARAGRAPH_SPLIT.split(text) if p.strip()]

    chunks: list[str] = []
    current: list[str] = []
    current_words = 0

    for para in paragraphs:
        words = len(para.split())
        if current and current_words + words > target_words and current_words >= min_words:
            chunks.append(" ".join(current))
            current = [para]
            current_words = words
        else:
            current.append(para)
            current_words += words

    if current:
        chunks.append(" ".join(current))
    return chunks
