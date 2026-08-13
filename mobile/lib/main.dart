// ParentConnect AI mobile app (Flutter, ADR-0015).
//
// Parent-facing surfaces: the AI coach (FR-07), micro-learning with audio
// (FR-16/19), and "get help" (FR-21) — which works with no login, no AI and
// no network (NFR-06/07), because that is the screen a parent may need most.
//
// No child identity exists anywhere in this app (FR-24/NFR-15).

import 'package:flutter/material.dart';

import 'api/client.dart';
import 'help_store.dart';
import 'screens/coach_screen.dart';
import 'screens/content_screen.dart';
import 'screens/help_screen.dart';
import 'theme.dart';

/// Backend base URL, overridable at build time:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000');

void main() {
  runApp(const ParentConnectApp());
}

class ParentConnectApp extends StatelessWidget {
  const ParentConnectApp({super.key, this.api});

  /// Injectable so widget tests can drive the app without a network.
  final ApiClient? api;

  @override
  Widget build(BuildContext context) {
    final client = api ?? ApiClient(baseUrl: apiBaseUrl);
    return MaterialApp(
      title: 'ParentConnect',
      theme: buildPcTheme(),
      debugShowCheckedModeBanner: false,
      home: HomeShell(api: client),
    );
  }
}

/// Bottom-tab shell. "Get help" is a permanent tab rather than something
/// buried in a menu — it must always be one tap away (J9).
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.api});

  final ApiClient api;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  late final HelpStore _helpStore = HelpStore(api: widget.api);

  static const _helpTabIndex = 2;

  void _goToHelp() => setState(() => _index = _helpTabIndex);

  @override
  Widget build(BuildContext context) {
    final screens = [
      CoachScreen(api: widget.api, onGetHelp: _goToHelp),
      ContentScreen(api: widget.api),
      HelpScreen(store: _helpStore),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Coach',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Lessons',
          ),
          NavigationDestination(
            icon: Icon(Icons.support_agent_outlined, color: PcColors.danger),
            selectedIcon: Icon(Icons.support_agent, color: PcColors.danger),
            label: 'Get help',
          ),
        ],
      ),
    );
  }
}
