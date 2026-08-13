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

## Implemented so far

Three parent-facing screens behind a bottom-tab shell (`lib/main.dart`):

- **Coach** (`screens/coach_screen.dart`, FR-07/11/15) — asks the backend, never an LLM directly (ADR-0003). The AI is always labelled as an AI (D4); answers show the approved sources they cited (NFR-22); if the coach is unreachable the parent is told plainly and offered help rather than left on a spinner (NFR-06). Only a question + language + age band are sent — never a name, never a child (FR-24, ADR-0004).
- **Lessons** (`screens/content_screen.dart`, FR-16/19) — published modules only (enforced by the API, FR-20). Audio carries the same visual weight as the title rather than hiding in a menu, because the primary design target is more comfortable listening than reading (NFR-26, persona P1).
- **Get help** (`screens/help_screen.dart`, FR-21, journey J9) — **the screen that must always work**: no login, no AI, no network. Cached contacts render instantly from device storage (`help_store.dart`); a refresh happens quietly in the background and a failure is never shown as an error, it just means the parent keeps the numbers they already had (NFR-06/07). It is a permanent tab, never buried in a menu.

Shared: `theme.dart` (the "Empowered Trust" palette, matching the console and site), `api/client.dart` (typed backend client).

## Not done yet

- **No `android/` or `ios/` platform folders**, so a release APK can't be built — which means **NFR-28 (<25 MB) is still unvalidated**. Generating them (`flutter create --platforms=android .`) needs an application ID decided first (e.g. `rw.parentconnect.app`).
- Onboarding/consent (FR-03, NFR-16), nudges opt-in (FR-17), assessments (FR-29), offline content pack (FR-18), CHW session capture (FR-25–28), app-lock for shared phones (J3), and i18n (NFR-30) are not built.
- The coach returns "I don't know" for health questions until an approved corpus and a model are configured — a Phase-0 gate, not an app bug.

## Getting started

```bash
flutter pub get
flutter analyze && flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000   # 10.0.2.2 = host from the Android emulator
```
