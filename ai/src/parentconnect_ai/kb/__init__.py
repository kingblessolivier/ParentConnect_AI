"""Knowledge-base ingestion framework.

Structures and pure logic for turning clinician-approved content into
retrievable chunks. Only PUBLISHED content is ever ingested (FR-20) and every
chunk carries the version id it came from so answers can cite it (FR-15,
NFR-22). No embedding model or vector store is wired here — those land in the
Phase-0 retrieval spike (docs/ai/kinyarwanda-strategy.md); this package is the
schema + chunking + approval-guard layer.

See docs/ai/knowledge-base-spec.md and docs/ai/ai-architecture.md.
"""
