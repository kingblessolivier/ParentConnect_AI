# Offline-First & Sync

Realises **ADR-0008** and **NFR-07**. Covers what is cached, for how long, the sync protocol, and conflict resolution. Offline-first is a hard constraint (2G, shared devices, field use by CHWs).

## What is cached, and for how long

| Data | Cached on device? | Authority | TTL / refresh |
|---|---|---|---|
| Published content modules (text/audio/illustrations) | Yes (server-authoritative, read-only) | Server | Versioned; refresh on connectivity; audio may be evicted under storage pressure |
| Offline content pack (post-MVP, FR-18) | Yes, explicit download | Server | User-managed; version-checked |
| Referral directory | **Yes — always kept fresh & offline-available** | Server | Refresh eagerly; **never** allowed to be empty (safety-critical) |
| Sessions authored by facilitator (attendance/outcomes) | Yes (device-authored) | Device→server | Held until synced, then retained locally per policy |
| Coach messages composed offline | Yes (queued) | Device→server | Sent on reconnect; then subject to P3 retention |
| Profile & consent | Cached read; edits queued | Server | Refreshed on sync |
| P3 conversation history | Minimised on device; lockable; erasable | User | Honour retention & deletion (NFR-17/19) |

**Storage budget:** app <25 MB, sessions <2 MB data (NFR-28) — audio is fetched on demand and evictable; the offline pack is opt-in.

## Sync protocol

A single batched, idempotent endpoint (`POST /sync`) with push + pull.

```mermaid
sequenceDiagram
    participant D as Device (local store)
    participant S as Server
    Note over D: While offline, changes recorded with<br/>client_id (UUID), updated_at, origin
    D->>S: POST /sync { since: <cursor>, changes: [...] }
    S->>S: For each change: dedupe by client_id (idempotent)
    S->>S: Apply typed conflict rules per entity
    S-->>D: { applied: [...], conflicts: [...], server_changes: [...], cursor: <new> }
    D->>D: Merge server_changes; surface conflicts for review
```

- **Idempotency:** every device-authored record carries a `client_id`; re-sending is a no-op server-side. Safe under flaky 2G and retries.
- **Cursor-based pull:** device sends its last cursor; server returns changes since. Bounded batches.
- **Backoff:** failed syncs retry with exponential backoff; the queue survives app restarts (WorkManager, ADR-0013).

## Conflict resolution (typed, per entity)

| Entity | Rule | Rationale |
|---|---|---|
| Content / content pack | **No conflict** (server-authoritative, read-only) | Users never edit content |
| Session scalar fields (topic, time, notes) | **Last-writer-wins** by `updated_at`; loser kept in history | Rare; human-reviewable |
| Session attendance list | **Set-union** on `parent_id` (idempotent by `client_id`) | Two facilitators adding attendees should merge, not clobber |
| Coach message queue | **Append-only**, ordered by client timestamp | Messages are events, not mutable state |
| Profile edits | **Last-writer-wins**; server validates | Low concurrency |
| Referral | **Server-authoritative status machine**; offline raise allowed, transitions server-side | Safety data must not diverge |

Conflicts that rules can't silently resolve are **flagged** in the `/sync` response and shown to the facilitator for a decision — never dropped.

## Guarantees & non-goals

- **Guarantee:** no acknowledged offline record is lost; sync is idempotent; referral info is always available offline.
- **Guarantee:** an AI outage or no-network never blocks content reading, session capture, or referral access (NFR-06/07).
- **Non-goal (MVP):** real-time multi-device collaborative editing; full CRDT convergence. Deferred; the conflict domain is small and human-reviewable (ADR-0008).

## Test hooks (see `test-strategy.md`)

- Airplane-mode capture → reconnect → server reflects records (TC-ops-007).
- Conflicting concurrent edits → deterministic resolution + surfaced conflict.
- Duplicate `client_id` replay → single server record.
- Referral directory unavailable from network → served from cache.
