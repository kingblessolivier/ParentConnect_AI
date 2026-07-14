# Architecture Decision Records (ADRs)

One decision per file. Format: [MADR](https://adr.github.io/madr/)-lite — Context, Decision, Alternatives, Consequences. Once **Accepted**, an ADR is immutable: to change a decision, add a new ADR that **supersedes** it (don't edit history).

Status values: `Proposed` · `Accepted` · `Superseded by ADR-nnnn` · `Deprecated`.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-backend-framework.md) | Backend framework: Python + FastAPI | Accepted |
| [0002](./0002-database-and-vector-store.md) | Database & vector store: PostgreSQL + pgvector | Accepted |
| [0003](./0003-rag-not-fine-tuning.md) | AI approach: RAG, not fine-tuning | Accepted (given) |
| [0004](./0004-llm-provider-and-fallback.md) | LLM provider & fallback | Accepted (MVP), revisit |
| [0005](./0005-embeddings-and-retrieval.md) | Embeddings & Kinyarwanda-aware retrieval | Accepted |
| [0006](./0006-sms-ussd-aggregator.md) | SMS/USSD aggregator abstraction | Accepted |
| [0007](./0007-ivr-platform.md) | IVR platform (deferred) | Proposed |
| [0008](./0008-offline-sync-strategy.md) | Offline sync strategy | Accepted |
| [0009](./0009-hosting-jurisdiction.md) | Hosting jurisdiction | Accepted (pending legal, Q1) |
| [0010](./0010-config-driven-deployment.md) | Config-driven multi-context deployment | Accepted |
| [0011](./0011-modular-monolith.md) | Modular monolith over microservices | Accepted |
| [0012](./0012-monorepo.md) | Monorepo over polyrepo | Accepted |
| [0013](./0013-android-native.md) | Native Android (Kotlin) | Accepted |

## Template

See [`_template.md`](./_template.md).
