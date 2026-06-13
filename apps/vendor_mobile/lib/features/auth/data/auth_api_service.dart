import 'dart:convert';
import 'dart:async';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../domain/auth_session.dart';
import '../domain/vendor_bootstrap.dart';

class AuthApiException implements Exception {
  const AuthApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;
}

class AuthApiService {
  const AuthApiService();

  Future<void> sendOtp(String phoneNumber) async {
    try {
      final response = await http
          .post(
            Uri.parse('${AppConfig.apiBaseUrl}/auth/send-otp'),
            headers: const {
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'phoneNumber': phoneNumber,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return;
      }

      throw AuthApiException(
        _extractErrorMessage(response.body, 'ارسال کد تایید ناموفق بود.'),
        statusCode: response.statusCode,
      );
    } on TimeoutException {
      throw const AuthApiException(
        'پاسخی از سرور دریافت نشد. بررسی کن backend در حال اجرا باشد.',
      );
    } on SocketException {
      throw const AuthApiException(
        'اتصال به سرور برقرار نشد. آدرس API یا اجرای backend را بررسی کن.',
      );
    }
  }

  Future<AuthSession> verifyOtp(String phoneNumber, String code) async {
    try {
      final response = await http
          .post(
            Uri.parse('${AppConfig.apiBaseUrl}/auth/verify-otp'),
            headers: const {
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'phoneNumber': phoneNumber,
              'code': code,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'کد تایید معتبر نیست.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      final user = payload['user'] as Map<String, dynamic>? ?? <String, dynamic>{};

      return AuthSession(
        accessToken: payload['access_token'] as String? ?? '',
        phoneNumber: user['phoneNumber'] as String? ?? phoneNumber,
      );
    } on TimeoutException {
      throw const AuthApiException(
        'پاسخی از سرور دریافت نشد. دوباره تلاش کن.',
      );
    } on SocketException {
      throw const AuthApiException(
        'اتصال به سرور برقرار نشد. اجرای backend و آدرس API را بررسی کن.',
      );
    }
  }

  Future<VendorBootstrap> getSessionBootstrap(String accessToken) async {
    if (AppConfig.enableDevOtpBypass && accessToken == 'dev-preview-token') {
      return const VendorBootstrap(
        roles: ['VENDOR'],
        store: BootstrapStore(
          id: 0,
          isVerified: true,
          name: 'پیش‌نمایش فروشگاه',
          slug: 'preview-store',
        ),
        vendorOnboarding: VendorOnboardingState(
          applicationStatus: 'APPROVED',
          productStatus: 'APPROVED',
          storeActivatedAt: null,
        ),
      );
    }

    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/auth/session-bootstrap'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'دریافت اطلاعات نشست ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorBootstrap.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException(
        'پاسخی از سرور دریافت نشد. دوباره تلاش کن.',
      );
    } on SocketException {
      throw const AuthApiException(
        'اتصال به سرور برقرار نشد. اجرای backend و آدرس API را بررسی کن.',
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
        final error = payload['error'];
        if (error is String && error.trim().isNotEmpty) {
          return error;
        }
      }
    } catch (_) {
      return fallback;
    }

    return fallback;
  }
}
