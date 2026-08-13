import 'package:flutter/material.dart';

import '../api/client.dart';
import '../theme.dart';

/// Micro-learning modules (FR-16/19).
///
/// Audio is given the same visual weight as the title, not hidden in a menu:
/// the primary design target reads Kinyarwanda slowly and is more comfortable
/// listening (NFR-26, persona P1). Only published content is ever served —
/// that is enforced by the API, not here (FR-20).
class ContentScreen extends StatefulWidget {
  const ContentScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<ContentScreen> createState() => _ContentScreenState();
}

class _ContentScreenState extends State<ContentScreen> {
  List<ContentItem> _items = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final items = await widget.api.content();
      if (mounted) setState(() { _items = items; _loading = false; });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Lessons couldn’t be loaded. Saved lessons stay available offline.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lessons')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                children: [
                  if (_error != null) _Notice(text: _error!),
                  if (_items.isEmpty && _error == null)
                    const _Notice(text: 'No lessons published yet. They’ll appear here once approved.'),
                  ..._items.map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _ContentCard(item: item),
                      )),
                ],
              ),
      ),
    );
  }
}

class _ContentCard extends StatelessWidget {
  const _ContentCard({required this.item});

  final ContentItem item;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: item.hasAudio ? PcColors.teal.withValues(alpha: 0.14) : PcColors.sand,
                borderRadius: BorderRadius.circular(13),
              ),
              child: Icon(
                item.hasAudio ? Icons.play_arrow_rounded : Icons.menu_book_outlined,
                color: item.hasAudio ? PcColors.teal : PcColors.muted,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(
                    [
                      item.topic.replaceAll('_', ' '),
                      item.ageBand == 'all' ? 'all ages' : item.ageBand.replaceAll('_', '–'),
                      if (item.hasAudio) 'audio',
                    ].join(' · '),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
      ),
    );
  }
}
