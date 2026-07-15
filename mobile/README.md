# mobile — Flutter app

The parent-facing mobile app. Offline-first, low-end devices. See [ADR-0015](../docs/architecture/adr/0015-flutter-mobile.md).

> **Scaffold only.** No features yet. Built in Phase 1.

## Constraints (hard)

- **Android 8.0+, 1 GB RAM** (NFR-27).
- **APK < 25 MB, session < 2 MB data** (NFR-28) — **tight for Flutter; validate a release build early** (per-ABI App Bundles, on-demand audio/illustrations). If unreachable, revise NFR-28 with the sponsor or revisit ADR-0015.
- **Offline-first** (NFR-07, ADR-0008): local store (drift/sqflite) + background sync (workmanager).
- **≤3 taps** to core tasks; **audio** for low-literacy (NFR-25/26).

## Getting started

```bash
flutter pub get
flutter analyze
flutter test
flutter run
```

## Standards

- `flutter_lints`; widget + unit tests.
- The app talks to the **backend API**, never the LLM directly (ADR-0003).
- No SRH content in OS notification previews (shared-phone privacy, user-journeys J3).
- Client types generated from `../docs/architecture/openapi.yaml` in Phase 1.
