import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../domain/mobile_runtime_config.dart';
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

  Future<String> uploadApplicationDocument({
    required String accessToken,
    required File file,
  }) async {
    return _uploadFile(
      accessToken: accessToken,
      file: file,
      path: '/files/upload-document-image',
    );
  }

  Future<String> uploadProductImage({
    required String accessToken,
    required File file,
  }) async {
    return _uploadFile(
      accessToken: accessToken,
      file: file,
      path: '/files/upload-product-image',
    );
  }

  Future<MapReverseGeocodeResult> reverseGeocode({
    required String accessToken,
    required double lat,
    required double lng,
  }) async {
    try {
      final uri = Uri.parse(
        '${AppConfig.apiBaseUrl}/mobile-app/reverse-geocode?lat=$lat&lng=$lng',
      );
      final response = await http
          .get(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw const AuthApiException('دریافت آدرس از روی نقشه ناموفق بود.');
      }

      final payload = jsonDecode(response.body);
      if (payload is! Map<String, dynamic>) {
        throw const AuthApiException('پاسخ آدرس نقشه معتبر نیست.');
      }

      return MapReverseGeocodeResult(
        formattedAddress: payload['formattedAddress']?.toString().trim() ?? '',
      );
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرویس نقشه دریافت نشد.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرویس نقشه برقرار نشد.');
    }
  }

  Future<MobileRuntimeConfig> getRuntimeConfig() async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/mobile-app/config'),
            headers: const {
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw const AuthApiException('بارگذاری تنظیمات اپ ناموفق بود.');
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return MobileRuntimeConfig.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور برای تنظیمات اپ دریافت نشد.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برای تنظیمات اپ برقرار نشد.');
    }
  }

  Future<String> _uploadFile({
    required String accessToken,
    required File file,
    required String path,
  }) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConfig.apiBaseUrl}$path'),
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

class MapReverseGeocodeResult {
  const MapReverseGeocodeResult({
    required this.formattedAddress,
  });

  final String formattedAddress;
}
