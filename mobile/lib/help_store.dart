import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'api/client.dart';

/// Offline cache for the referral directory (FR-21, NFR-06/07).
///
/// "Get help" is the one screen that must work when everything else doesn't:
/// no network, no login, AI down. So the last known directory is cached on
/// device and served immediately, then refreshed in the background when a
/// connection happens to exist. A failed refresh is not an error the user ever
/// sees — it just means they keep the contacts they already had.
class HelpStore {
  HelpStore({required this.api, SharedPreferences? prefs}) : _prefs = prefs;

  static const _cacheKey = 'referral_directory_v1';

  final ApiClient api;
  SharedPreferences? _prefs;

  Future<SharedPreferences> get _store async => _prefs ??= await SharedPreferences.getInstance();

  /// Contacts held on device, or an empty list on first run before any sync.
  Future<List<ReferralContact>> cached() async {
    final raw = (await _store).getString(_cacheKey);
    if (raw == null) return const [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((e) => ReferralContact.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      // A corrupt cache must not break the help screen.
      return const [];
    }
  }

  /// Refresh from the API, returning the contacts actually available now.
  /// Never throws: on failure the cached copy is returned instead.
  Future<List<ReferralContact>> refresh({String? district}) async {
    try {
      final fresh = await api.referralDirectory(district: district);
      if (fresh.isNotEmpty) {
        await (await _store)
            .setString(_cacheKey, jsonEncode(fresh.map((c) => c.toJson()).toList()));
      }
      return fresh;
    } catch (_) {
      return cached();
    }
  }
}
