# ai — Python RAG & evaluation service

The retrieval-augmented generation and evaluation service. Kept in Python for the strongest RAG/embedding/evaluation tooling ([ADR-0014](../docs/architecture/adr/0014-backend-nodejs.md)); runs as a **separate service** called by the Node backend over an internal HTTP/JSON API.

> **Scaffold only.** No pipeline logic yet. Built in Phase 0 (retrieval spike + eval harness) and Phase 1 (full pipeline).

## What lives here

**Phase 0 foundation (implemented — pure logic, no models yet):**

| Module | Purpose |
|---|---|
| `kb/schema.py` | Content/version/chunk types; workflow statuses (only `published` is retrievable) |
| `kb/chunking.py` | Kinyarwanda-aware `normalize()` (synonym-map seam) + semantic `chunk_text()` |
| `kb/ingest.py` | Ingestion with an **approval guard** — non-published content raises / is skipped (FR-20) |
| `evaluation/dataset.py` | Eval-set schema + validation (accuracy/crisis/refusal/out-of-scope/adversarial); held-out slice |
| `evaluation/retrieval_metrics.py` | `recall@k`, `MRR` for the retrieval spike |
| `evaluation/gate.py` | The **release gate**: pass/fail vs the launch thresholds (NFR-20/21/22, FR-21) |
| `grounding.py` | Citation/grounding checks (a health answer must cite an approved source) |

**Planned (Phase 0 spike / Phase 1):** embeddings → pgvector + lexical index; hybrid retrieval → reranking → prompt assembly → generation → post-generation safety; wiring the gate to real pipeline runs.

Design docs: [`ai-architecture.md`](../docs/ai/ai-architecture.md), [`kinyarwanda-strategy.md`](../docs/ai/kinyarwanda-strategy.md), [`safety-and-guardrails.md`](../docs/ai/safety-and-guardrails.md), [`evaluation-framework.md`](../docs/ai/evaluation-framework.md).

## Getting started

```bash
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
ruff check . && black --check .
pytest --cov --cov-fail-under=70
```

## Standards

- ruff + black; type hints.
- Coverage ≥70% on core logic (NFR-33).
- **No PII in prompts** to the LLM (ADR-0004); **only approved sources** ground health answers (see `grounding.py`).
- AI-path changes must additionally pass the **evaluation release gate** before merge (wired into CI in Phase 1).
