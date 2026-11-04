import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/auth_session.dart';

class AuthSessionStorage {
  static const _sessionKey = 'vendor_mobile.auth_session';
  static const _channel = MethodChannel('com.golino.vendorapp/session_storage');

  Future<void> save(AuthSession session) async {
    final encoded = jsonEncode(session.toJson());
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_sessionKey, encoded);
      return;
    }
    await _channel.invokeMethod<void>('saveSession', {
      'key': _sessionKey,
      'value': encoded,
    });
  }

  Future<AuthSession?> load() async {
    String? raw;
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      raw = prefs.getString(_sessionKey);
    } else {
      raw = await _channel.invokeMethod<String>('loadSession', {
        'key': _sessionKey,
      });
    }

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
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_sessionKey);
      return;
    }
    await _channel.invokeMethod<void>('clearSession', {
      'key': _sessionKey,
    });
  }
}
