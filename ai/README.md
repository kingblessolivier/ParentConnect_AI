# ai — Python RAG & evaluation service

The retrieval-augmented generation and evaluation service. Kept in Python for the strongest RAG/embedding/evaluation tooling ([ADR-0014](../docs/architecture/adr/0014-backend-nodejs.md)); runs as a **separate service** called by the Node backend over an internal HTTP/JSON API.

> **Scaffold only.** No pipeline logic yet. Built in Phase 0 (retrieval spike + eval harness) and Phase 1 (full pipeline).

## What lives here (planned)

- **Ingestion & chunking** (Kinyarwanda-aware) → embeddings → pgvector + lexical index.
- **Retrieval** (hybrid dense + lexical) → **reranking** → **grounding gate** → prompt assembly → generation → **post-generation safety** (citation, refusal, injection, PII).
- **Evaluation harness** and the **release gate** (`docs/ai/evaluation-framework.md`) — the Phase-0 critical path.

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
