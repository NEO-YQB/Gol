import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';

class PushDeviceApiService {
  const PushDeviceApiService();

  Future<void> registerDevice({
    required String accessToken,
    required String token,
    required String platform,
    String? deviceLabel,
    String? appVersion,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('${AppConfig.apiBaseUrl}/notifications/devices'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: jsonEncode({
              'token': token,
              'platform': platform,
              if (deviceLabel != null && deviceLabel.trim().isNotEmpty)
                'deviceLabel': deviceLabel.trim(),
              if (appVersion != null && appVersion.trim().isNotEmpty)
                'appVersion': appVersion.trim(),
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'ثبت device token ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }
    } on TimeoutException {
      throw const AuthApiException(
        'ثبت device token با timeout مواجه شد.',
      );
    } on SocketException {
      throw const AuthApiException(
        'اتصال برای ثبت device token برقرار نشد.',
      );
    }
  }

  String _extractErrorMessage(String body, String fallback) {
    if (body.isEmpty) return fallback;

    try {
      final payload = jsonDecode(body);
      if (payload is Map<String, dynamic>) {
        final message = payload['message'];
        if (message is String && message.trim().isNotEmpty) {
          return message;
        }
        if (message is List && message.isNotEmpty) {
          return message.first.toString();
        }
      }
    } catch (_) {
      return fallback;
    }

    return fallback;
  }
}
