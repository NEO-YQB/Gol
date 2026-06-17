import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../domain/vendor_onboarding_request.dart';

class VendorOnboardingApiService {
  const VendorOnboardingApiService();

  Future<VendorOnboardingRequest> getMyRequest({
    required String accessToken,
  }) async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/vendor-onboarding/me'),
            headers: _headers(accessToken),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری وضعیت ثبت‌نام فروشنده ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorOnboardingRequest.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد. اینترنت و آدرس API را بررسی کن.');
    }
  }

  Future<VendorOnboardingRequest> submitApplication({
    required String accessToken,
    required Map<String, dynamic> input,
  }) async {
    return _postRequest(
      accessToken: accessToken,
      path: '/vendor-onboarding/me/application',
      input: input,
      fallback: 'ثبت درخواست فروشندگی ناموفق بود.',
    );
  }

  Future<VendorOnboardingRequest> submitProduct({
    required String accessToken,
    required Map<String, dynamic> input,
  }) async {
    return _postRequest(
      accessToken: accessToken,
      path: '/vendor-onboarding/me/product',
      input: input,
      fallback: 'ثبت محصول نمونه ناموفق بود.',
    );
  }

  Future<String> uploadDocument({
    required String accessToken,
    required File file,
  }) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConfig.apiBaseUrl}/files/upload-product-image'),
      );

      request.headers['Authorization'] = 'Bearer $accessToken';
      request.files.add(await http.MultipartFile.fromPath('file', file.path));

      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 20),
      );
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'آپلود فایل ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body);
      if (payload is Map<String, dynamic>) {
        final url = payload['url']?.toString().trim() ?? '';
        if (url.isEmpty) {
          throw const AuthApiException('آدرس فایل آپلودشده نامعتبر است.');
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }

        final apiRoot = AppConfig.apiBaseUrl.replaceFirst(RegExp(r'/v1/?$'), '');
        return '$apiRoot${url.startsWith('/') ? '' : '/'}$url';
      }

      throw const AuthApiException('پاسخ آپلود فایل معتبر نیست.');
    } on TimeoutException {
      throw const AuthApiException('آپلود فایل زمان‌بر شد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال برای آپلود فایل برقرار نشد.');
    }
  }

  Future<VendorOnboardingRequest> _postRequest({
    required String accessToken,
    required String path,
    required Map<String, dynamic> input,
    required String fallback,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('${AppConfig.apiBaseUrl}$path'),
            headers: _headers(accessToken),
            body: jsonEncode(input),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, fallback),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorOnboardingRequest.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد. اینترنت و آدرس API را بررسی کن.');
    }
  }

  Map<String, String> _headers(String accessToken) => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      };

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
