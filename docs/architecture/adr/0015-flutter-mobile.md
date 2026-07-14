# ADR-0015 — Mobile: Flutter

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** Sponsor (decision), Architect, Mobile lead
- **Supersedes:** [ADR-0013](./0013-android-native.md)
- **Related:** NFR-27 (Android 8, 1 GB RAM), NFR-28 (**<25 MB**, <2 MB/session), NFR-07 (offline), NFR-25 (usability)

## Context

ADR-0013 chose native Android (Kotlin) to meet hard low-end constraints. The sponsor has chosen **Flutter** for mobile (one codebase, and a future path to iOS). This supersedes ADR-0013. Flutter is a reasonable, well-supported choice — but ADR-0013's concerns about **APK size and low-end performance** are real and must be actively managed, not waved away.

## Decision

Build the mobile app in **Flutter (Dart)**. Use:
- **Drift** or **sqflite** for the offline-first local store; **flutter offline sync** via a background worker (`workmanager`) — realising ADR-0008.
- **Split APKs / Android App Bundle per ABI** and aggressive asset management to fight the size budget.
- Generated Dart API models from the shared OpenAPI spec (`openapi.yaml`) so the app, Node backend, and web share one contract.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Flutter** | One codebase; iOS path; good UI; strong ecosystem; sponsor's choice | Larger base binary; runtime overhead on 1 GB devices; the <25 MB budget is **tight** | **Chosen** |
| Native Kotlin (ADR-0013) | Smallest footprint; best low-end perf | Android-only; sponsor chose cross-platform | Superseded |
| React Native | JS reuse with the Node stack | Bridge overhead; size; low-end perf risk | Rejected |

## Consequences

- Positive: single mobile codebase; consistent UI; opens iOS later without a rewrite; shares the OpenAPI contract with backend/web.
- **Risk to validate early (flagged, per honest-engineering):**
  - **NFR-28 (<25 MB APK) is tight for Flutter.** A minimal release Flutter APK is often ~7–12 MB before app assets/audio; with fonts, illustrations, and offline content this can approach or exceed 25 MB. **Mitigations:** per-ABI split App Bundles, tree-shaken icons, fetch audio/illustrations on demand rather than bundling, `--split-debug-info`, remove unused locales. **Action:** measure a release build against NFR-28 in a Phase-1 spike; if unreachable, either revise NFR-28 with the sponsor or reconsider this ADR. Do not assume it passes.
  - **NFR-27 (1 GB RAM / Android 8):** Flutter runs on these, but test on a real low-end device early; watch memory with images/audio.
  - **NFR-25 (≤3 taps, low literacy) & NFR-26 (audio):** unchanged in intent; validated by field testing (`test-strategy.md`).
- Follow-ups: Phase-1 size/perf spike on a reference low-end device; update `test-strategy.md` device matrix; update the monorepo layout (`/mobile` Flutter) in ADR-0012 and `system-architecture.md`.
