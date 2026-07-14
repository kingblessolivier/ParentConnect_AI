// ParentConnect AI mobile app (Flutter) — scaffold only.
//
// No feature logic yet. Offline-first store, the AI coach client (which calls
// the backend, never the LLM directly), content/audio, safeguarding referral,
// and community-session capture are built in Phase 1. Design: ADR-0015,
// docs/architecture/offline-sync.md, docs/product/user-journeys.md.

import 'package:flutter/material.dart';

void main() {
  runApp(const ParentConnectApp());
}

class ParentConnectApp extends StatelessWidget {
  const ParentConnectApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ParentConnect',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.teal),
      home: const _ScaffoldHome(),
    );
  }
}

class _ScaffoldHome extends StatelessWidget {
  const _ScaffoldHome();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ParentConnect')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Scaffold only. Features arrive in Phase 1 '
            '(see docs/delivery/roadmap.md).',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
