import 'dart:convert';

import '../domain/auth_session.dart';

class AuthSessionStorage {
  static const _sessionKey = 'vendor_mobile.auth_session';
  static String? _memorySession;

  Future<void> save(AuthSession session) async {
    _memorySession = jsonEncode(session.toJson());
  }

  Future<AuthSession?> load() async {
    final raw = _memorySession;
    if (raw == null || raw.isEmpty) return null;

    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return AuthSession.fromJson(json);
    } catch (_) {
      await clear();
      return null;
    }
  }

  Future<void> clear() async {
    _memorySession = null;
  }
}
