import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/client.dart';
import '../help_store.dart';
import '../theme.dart';

/// "Get help" (FR-21, J9).
///
/// The one screen that must always work: no login, no AI, and no network
/// required (NFR-06). Cached contacts render immediately; a refresh happens
/// quietly in the background and never blocks or errors in the user's face.
///
/// Tone matters here as much as function — a parent reaching this screen may
/// have just disclosed something frightening. Supportive and plain, never
/// alarmist (J9).
class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key, required this.store});

  final HelpStore store;

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  List<ReferralContact> _contacts = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    // Show whatever is on device first — instantly, offline.
    final cached = await widget.store.cached();
    if (mounted) setState(() { _contacts = cached; _loading = false; });

    final fresh = await widget.store.refresh();
    if (mounted && fresh.isNotEmpty) setState(() => _contacts = fresh);
  }

  Future<void> _call(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone.replaceAll(RegExp(r'[^\d+]'), ''));
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Get help')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Text('If you or someone you know is in danger', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            'These services are here to help. You do not need to give your name, '
            'or your child’s name, to anyone here.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          else if (_contacts.isEmpty)
            const _NoContactsYet()
          else
            ..._contacts.map((c) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _ContactCard(contact: c, onCall: () => _call(c.phone)),
                )),
        ],
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({required this.contact, required this.onCall});

  final ReferralContact contact;
  final VoidCallback onCall;

  static const _labels = {
    'one_stop_centre': 'Isange One Stop Centre',
    'child_helpline': 'Child helpline',
    'health_facility': 'Health facility',
  };

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(contact.name, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 2),
            Builder(builder: (context) {
              final typeLabel = _labels[contact.type] ?? contact.type;
              // Don't repeat the service type when the name already says it
              // ("Isange One Stop Centre" is both the name and the type).
              final parts = [
                if (!contact.name.toLowerCase().contains(typeLabel.toLowerCase())) typeLabel,
                if (contact.district != null) contact.district!,
              ];
              if (parts.isEmpty) return const SizedBox.shrink();
              return Text(parts.join(' · '), style: Theme.of(context).textTheme.bodyMedium);
            }),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: onCall,
              icon: const Icon(Icons.call),
              label: Text('Call ${contact.phone}'),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoContactsYet extends StatelessWidget {
  const _NoContactsYet();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.wifi_off, color: PcColors.muted),
            const SizedBox(height: 10),
            Text('Help numbers not downloaded yet', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(
              'Connect to a network once and these will be saved on this phone, '
              'so they are here even when you are offline.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}
