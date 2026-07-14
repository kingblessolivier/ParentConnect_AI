# ADR-0008 — Offline sync strategy

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Architect, Mobile lead
- **Related:** NFR-07, FR-18, FR-27, FR-28; `offline-sync.md`; `CLAUDE.md` constraint #5

## Context

CHWs record sessions/attendance with no signal; parents read content offline. Offline-first is a hard constraint. We need a sync model a small team can build correctly and that resolves conflicts predictably.

## Decision

Use a **local-first store on device + an outbound change queue + server reconciliation** with **typed, per-entity conflict resolution**:
- **Content & content packs:** server-authoritative, read-only on device; versioned pull; no conflicts.
- **Session attendance/outcomes:** device-authored; **last-writer-wins on scalar fields**, **set-union on attendance lists**, conflicts flagged for facilitator review.
- **Coach messages composed offline:** queued and sent on reconnect (idempotent by client-generated message id).
- Every syncable record carries `client_id` (UUID), `updated_at`, and `origin` to make sync idempotent and auditable.

No full CRDT framework for MVP — the conflict domain is small and human-reviewable; CRDTs are a later option if warranted.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Queue + typed conflict rules** | Simple, predictable, testable; fits the small conflict domain | Manual rule per entity | **Chosen** |
| Full CRDT sync | Automatic merges | Complexity a small team shouldn't own for this scope | Deferred |
| Online-only | Trivial | Violates NFR-07; unusable in the field | Rejected |
| Off-the-shelf sync platform (e.g. Couch/PouchDB) | Batteries included | Another datastore + residency/ops questions | Rejected for MVP |

## Consequences

- Positive: predictable, auditable sync; idempotent replays; works on flaky 2G.
- Negative/risks: per-entity rules must be maintained as the model grows; flagged conflicts need a review UI.
- Revisit trigger: conflict volume/complexity rising, or multi-device concurrent editing becoming common.
