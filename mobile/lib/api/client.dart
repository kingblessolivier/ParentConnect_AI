import 'dart:convert';

import 'package:http/http.dart' as http;

/// Referral contact shown on a disclosure (FR-21).
class ReferralContact {
  const ReferralContact({
    required this.name,
    required this.phone,
    required this.type,
    this.district,
  });

  final String name;
  final String phone;
  final String type;
  final String? district;

  factory ReferralContact.fromJson(Map<String, dynamic> json) => ReferralContact(
        name: json['name'] as String,
        phone: json['phone'] as String,
        type: json['type'] as String,
        district: json['district'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        'type': type,
        if (district != null) 'district': district,
      };
}

/// A published micro-learning module (FR-16/19).
class ContentItem {
  const ContentItem({
    required this.id,
    required this.title,
    required this.topic,
    required this.ageBand,
    required this.language,
    this.audioUri,
  });

  final String id;
  final String title;
  final String topic;
  final String ageBand;
  final String language;
  final String? audioUri;

  bool get hasAudio => audioUri != null && audioUri!.isNotEmpty;

  factory ContentItem.fromJson(Map<String, dynamic> json) => ContentItem(
        id: (json['itemId'] ?? json['id']) as String,
        title: json['title'] as String,
        topic: json['topic'] as String? ?? '',
        ageBand: json['ageBand'] as String? ?? 'all',
        language: json['language'] as String? ?? 'rw',
        audioUri: json['audioUri'] as String?,
      );
}

/// One coach turn: the grounded answer plus the sources it cited (FR-15/NFR-22).
class CoachAnswer {
  const CoachAnswer({
    required this.answer,
    required this.citations,
    required this.conversationStarters,
    this.safetyFlag,
    this.queued = false,
  });

  final String answer;
  final List<String> citations;
  final List<String> conversationStarters;
  final String? safetyFlag;

  /// True when the AI was unreachable and the question was queued (NFR-06).
  final bool queued;

  factory CoachAnswer.fromJson(Map<String, dynamic> json) => CoachAnswer(
        answer: json['answer'] as String? ?? '',
        citations: ((json['citations'] as List<dynamic>?) ?? const [])
            .map((c) => c is Map<String, dynamic> ? (c['title'] ?? c['sourceId'] ?? '').toString() : c.toString())
            .where((c) => c.isNotEmpty)
            .toList(),
        conversationStarters: ((json['conversationStarters'] as List<dynamic>?) ?? const [])
            .map((s) => s.toString())
            .toList(),
        safetyFlag: json['safetyFlag'] as String?,
        queued: json['queued'] as bool? ?? false,
      );
}

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;
  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Talks to the ParentConnect backend — never to an LLM directly (ADR-0003).
///
/// No child identity is ever sent; the coach receives a question, a language
/// and an age band only (FR-24, ADR-0004).
class ApiClient {
  ApiClient({required this.baseUrl, http.Client? httpClient, this.token})
      : _http = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _http;
  final String? token;

  static const _timeout = Duration(seconds: 20);

  Map<String, String> get _headers => {
        'content-type': 'application/json',
        if (token != null) 'authorization': 'Bearer $token',
      };

  Future<List<ReferralContact>> referralDirectory({String? district}) async {
    final uri = Uri.parse('$baseUrl/api/v1/referral-directory')
        .replace(queryParameters: district == null ? null : {'district': district});
    final res = await _http.get(uri, headers: _headers).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException(res.statusCode, 'referral directory unavailable');
    final list = jsonDecode(res.body) as List<dynamic>;
    return list.map((e) => ReferralContact.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ContentItem>> content({String? topic, String? language}) async {
    final uri = Uri.parse('$baseUrl/api/v1/content').replace(queryParameters: {
      if (topic != null) 'topic': topic,
      if (language != null) 'language': language,
    });
    final res = await _http.get(uri, headers: _headers).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException(res.statusCode, 'content unavailable');
    final list = jsonDecode(res.body) as List<dynamic>;
    return list.map((e) => ContentItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<String> startConversation() async {
    final res = await _http
        .post(Uri.parse('$baseUrl/api/v1/conversations'), headers: _headers, body: '{}')
        .timeout(_timeout);
    if (res.statusCode >= 400) throw ApiException(res.statusCode, 'could not start a conversation');
    return (jsonDecode(res.body) as Map<String, dynamic>)['id'] as String;
  }

  Future<CoachAnswer> ask({
    required String conversationId,
    required String question,
    required String language,
    required String ageBand,
  }) async {
    final res = await _http
        .post(
          Uri.parse('$baseUrl/api/v1/conversations/$conversationId/messages'),
          headers: _headers,
          // Deliberately only these fields — no name, no child identity (FR-24).
          body: jsonEncode({'body': question, 'language': language, 'ageBand': ageBand}),
        )
        .timeout(_timeout);
    if (res.statusCode >= 400) throw ApiException(res.statusCode, 'the coach could not answer');
    return CoachAnswer.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }
}
