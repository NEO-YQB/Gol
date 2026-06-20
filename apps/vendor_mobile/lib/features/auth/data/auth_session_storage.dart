import 'dart:convert';
import 'package:flutter/services.dart';

import '../domain/auth_session.dart';

class AuthSessionStorage {
  static const _sessionKey = 'vendor_mobile.auth_session';
  static const _channel = MethodChannel('com.golino.vendorapp/session_storage');

  Future<void> save(AuthSession session) async {
    await _channel.invokeMethod<void>('saveSession', {
      'key': _sessionKey,
      'value': jsonEncode(session.toJson()),
    });
  }

  Future<AuthSession?> load() async {
    final raw = await _channel.invokeMethod<String>('loadSession', {
      'key': _sessionKey,
    });
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
    await _channel.invokeMethod<void>('clearSession', {
      'key': _sessionKey,
    });
  }
}
