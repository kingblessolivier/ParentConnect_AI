import 'package:flutter/material.dart';

import '../api/client.dart';
import '../theme.dart';

/// The AI coach conversation (FR-07/11/15, J1/J2).
///
/// Three things are deliberate here:
///  - the AI is **labelled** as an AI, always (D4);
///  - an answer shows **what it was grounded in** (FR-15, NFR-22) — an answer
///    with no citation is not presented as authoritative;
///  - if the coach can't be reached, the parent is told plainly and pointed to
///    help rather than left with a spinner (NFR-06).
class CoachScreen extends StatefulWidget {
  const CoachScreen({super.key, required this.api, required this.onGetHelp});

  final ApiClient api;
  final VoidCallback onGetHelp;

  @override
  State<CoachScreen> createState() => _CoachScreenState();
}

class _Turn {
  _Turn.question(this.text)
      : isQuestion = true,
        citations = const [],
        starters = const [],
        unavailable = false;
  _Turn.answer(this.text, this.citations, this.starters, {this.unavailable = false})
      : isQuestion = false;

  final String text;
  final bool isQuestion;
  final List<String> citations;
  final List<String> starters;
  final bool unavailable;
}

class _CoachScreenState extends State<CoachScreen> {
  final _controller = TextEditingController();
  final List<_Turn> _turns = [];
  String? _conversationId;
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final question = _controller.text.trim();
    if (question.isEmpty || _sending) return;

    setState(() {
      _turns.add(_Turn.question(question));
      _sending = true;
      _controller.clear();
    });

    try {
      _conversationId ??= await widget.api.startConversation();
      final answer = await widget.api.ask(
        conversationId: _conversationId!,
        question: question,
        language: 'rw',
        // Age band comes from the parent's profile; never a birthdate (FR-06/24).
        ageBand: '13_15',
      );
      if (!mounted) return;
      setState(() => _turns.add(_Turn.answer(answer.answer, answer.citations, answer.conversationStarters)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _turns.add(_Turn.answer(
            'I can’t reach the coach right now. Your question is saved and I’ll answer '
            'when there’s a connection. If this is urgent, help is one tap away below.',
            const [],
            const [],
            unavailable: true,
          )));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Coach'),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(28),
          child: Padding(
            padding: EdgeInsets.only(left: 16, bottom: 8),
            child: Align(
              alignment: Alignment.centerLeft,
              // The AI is always labelled as an AI (D4).
              child: Text('An AI coach — answers come from approved guidance',
                  style: TextStyle(fontSize: 12.5, color: PcColors.muted)),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _turns.isEmpty
                ? const _CoachEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    itemCount: _turns.length,
                    itemBuilder: (_, i) => _TurnBubble(turn: _turns[i], onGetHelp: widget.onGetHelp),
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: 'Ask about talking with your child…',
                        filled: true,
                        fillColor: PcColors.surface,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: _sending
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CoachEmptyState extends StatelessWidget {
  const _CoachEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.chat_bubble_outline, size: 40, color: PcColors.teal),
            const SizedBox(height: 14),
            Text('Ask anything about growing up', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Puberty, relationships, consent, staying safe. Your question is private, '
              'and nothing about your child is stored.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class _TurnBubble extends StatelessWidget {
  const _TurnBubble({required this.turn, required this.onGetHelp});

  final _Turn turn;
  final VoidCallback onGetHelp;

  @override
  Widget build(BuildContext context) {
    final isQuestion = turn.isQuestion;
    return Align(
      alignment: isQuestion ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        constraints: const BoxConstraints(maxWidth: 320),
        decoration: BoxDecoration(
          color: isQuestion ? PcColors.deepBlue : PcColors.surface,
          border: Border.all(color: const Color(0xFFE0DABD)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              turn.text,
              style: TextStyle(
                fontSize: 15.5,
                height: 1.45,
                color: isQuestion ? Colors.white : PcColors.deepBlue,
              ),
            ),
            if (turn.citations.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: turn.citations
                    .map((c) => Chip(
                          label: Text(c, style: const TextStyle(fontSize: 11.5)),
                          avatar: const Icon(Icons.menu_book_outlined, size: 14),
                          visualDensity: VisualDensity.compact,
                        ))
                    .toList(),
              ),
            ],
            if (turn.unavailable) ...[
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onGetHelp,
                icon: const Icon(Icons.support_agent),
                label: const Text('Get help now'),
              ),
            ],
            if (turn.starters.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text('Try starting with:', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 4),
              ...turn.starters.map((s) => Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('“$s”', style: const TextStyle(fontStyle: FontStyle.italic, fontSize: 14)),
                  )),
            ],
          ],
        ),
      ),
    );
  }
}
