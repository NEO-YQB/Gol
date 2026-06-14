import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../domain/vendor_store_profile.dart';

class StoreProfileApiService {
  const StoreProfileApiService();

  Future<String> uploadStoreLogo({
    required String accessToken,
    required File file,
  }) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConfig.apiBaseUrl}/files/upload-product-image'),
      );

      request.headers['Authorization'] = 'Bearer $accessToken';
      request.files.add(
        await http.MultipartFile.fromPath(
          'file',
          file.path,
        ),
      );

      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 20),
      );
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'آپلود لوگو ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body);
      if (payload is Map<String, dynamic>) {
        final url = payload['url']?.toString().trim() ?? '';
        if (url.isEmpty) {
          throw const AuthApiException('آدرس لوگوی آپلودشده نامعتبر است.');
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }

        final apiRoot = AppConfig.apiBaseUrl.replaceFirst(RegExp(r'/v1/?$'), '');
        return '$apiRoot${url.startsWith('/') ? '' : '/'}$url';
      }

      throw const AuthApiException('پاسخ آپلود لوگو معتبر نیست.');
    } on TimeoutException {
      throw const AuthApiException(
        'آپلود لوگو زمان‌بر شد. دوباره تلاش کن.',
      );
    } on SocketException {
      throw const AuthApiException(
        'اتصال برای آپلود لوگو برقرار نشد.',
      );
    }
  }

  Future<VendorStoreProfile> getStoreProfile({
    required String accessToken,
    required String storeSlug,
  }) async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/stores/$storeSlug'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری پروفایل فروشگاه ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorStoreProfile.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException(
        'پاسخی از سرور دریافت نشد. دوباره تلاش کن.',
      );
    } on SocketException {
      throw const AuthApiException(
        'اتصال به سرور برقرار نشد. اینترنت و آدرس API را بررسی کن.',
      );
    }
  }

  Future<VendorStoreProfile> updateStoreProfile({
    required String accessToken,
    required int storeId,
    required String storeSlug,
    required UpdateVendorStoreProfileInput input,
  }) async {
    try {
      final response = await http
          .patch(
            Uri.parse('${AppConfig.apiBaseUrl}/stores/$storeId'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: jsonEncode(input.toJson()),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'ذخیره پروفایل فروشگاه ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      return getStoreProfile(
        accessToken: accessToken,
        storeSlug: storeSlug,
      );
    } on TimeoutException {
      throw const AuthApiException(
        'پاسخی از سرور دریافت نشد. دوباره تلاش کن.',
      );
    } on SocketException {
      throw const AuthApiException(
        'اتصال به سرور برقرار نشد. اینترنت و آدرس API را بررسی کن.',
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
