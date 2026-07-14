# ADR-0013 — Native Android (Kotlin)

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Architect, Mobile lead
- **Related:** NFR-27 (Android 8, 1 GB RAM), NFR-28 (<25 MB, <2 MB/session), NFR-07 (offline), NFR-25 (usability)

## Context

The app must run on **low-end devices** (Android 8.0+, 1 GB RAM), stay **under 25 MB**, use **under 2 MB per session**, work **offline**, and be usable by low-digital-literacy parents. Only Android is targeted (no iOS in scope for the pilot context).

## Decision

Build a **native Android app in Kotlin** (Jetpack, Room for the local store, WorkManager for sync). Single-platform, so cross-platform frameworks add weight/runtime without payback here.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Native Kotlin** | Smallest footprint; best low-end performance; full offline/OS control | Android-only (acceptable — only Android in scope) | **Chosen** |
| Flutter | Single codebase, good UI | Larger base APK; runtime overhead on 1 GB devices; no iOS need to justify it | Rejected |
| React Native | JS skills reuse | Bridge overhead; size; low-end perf risk | Rejected |
| PWA only | No install; tiny | Weaker offline on low-end Android; push/OS limits; app-store trust | Rejected as primary (revisit as a complement) |

## Consequences

- Positive: meets the hard size/RAM/offline budgets; best control over data-saving behaviour and notification privacy (shared-phone concern).
- Negative/risks: Android-only (documented scope); native skills required on the team.
- Revisit trigger: an iOS requirement, or evidence a PWA meets the low-end constraints.
