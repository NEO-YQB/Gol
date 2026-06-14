import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../../products/domain/vendor_product_summary.dart';
import '../domain/vendor_discount.dart';

class VendorDiscountsApiService {
  const VendorDiscountsApiService();

  Future<VendorDiscountListResponse> getDiscounts({
    required String accessToken,
    required int storeId,
    bool? isActive,
  }) async {
    try {
      final uri = Uri.parse('${AppConfig.apiBaseUrl}/vendor-discounts/mine').replace(
        queryParameters: {
          'storeId': '$storeId',
          'limit': '40',
          if (isActive != null) 'isActive': '$isActive',
        },
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
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری تخفیف‌ها ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorDiscountListResponse.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<VendorDiscount> getDiscountDetail({
    required String accessToken,
    required int discountId,
  }) async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/vendor-discounts/$discountId'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری جزئیات تخفیف ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorDiscount.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<VendorDiscount> createDiscount({
    required String accessToken,
    required Map<String, dynamic> input,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('${AppConfig.apiBaseUrl}/vendor-discounts'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: jsonEncode(input),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'ثبت تخفیف ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorDiscount.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<VendorDiscount> updateDiscount({
    required String accessToken,
    required int discountId,
    required Map<String, dynamic> input,
  }) async {
    try {
      final response = await http
          .patch(
            Uri.parse('${AppConfig.apiBaseUrl}/vendor-discounts/$discountId'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: jsonEncode(input),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'ذخیره تخفیف ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorDiscount.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<void> deleteDiscount({
    required String accessToken,
    required int discountId,
  }) async {
    try {
      final response = await http
          .delete(
            Uri.parse('${AppConfig.apiBaseUrl}/vendor-discounts/$discountId'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'حذف تخفیف ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<List<VendorProductSummary>> getStoreProducts({
    required String accessToken,
    required int storeId,
  }) async {
    try {
      final uri = Uri.parse('${AppConfig.apiBaseUrl}/products').replace(
        queryParameters: {
          'storeId': '$storeId',
          'limit': '100',
        },
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
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری محصولات ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      final data = payload['data'] is List ? payload['data'] as List : const [];
      return data
          .whereType<Map<String, dynamic>>()
          .map(VendorProductSummary.fromJson)
          .toList();
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
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

num resolveDiscountedPrice({
  required num basePrice,
  required VendorDiscount discount,
  required DateTime now,
}) {
  if (!discount.isActive) return basePrice;

  final startAt = _parseDate(discount.startAt);
  final endAt = _parseDate(discount.endAt);
  if (startAt != null && now.isBefore(startAt)) return basePrice;
  if (endAt != null && now.isAfter(endAt)) return basePrice;

  if (discount.valueType == 'PERCENTAGE') {
    final next = basePrice - ((basePrice * discount.value) / 100);
    return next < 0 ? 0 : next;
  }

  final next = basePrice - discount.value;
  return next < 0 ? 0 : next;
}

DateTime? _parseDate(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return DateTime.tryParse(trimmed)?.toLocal();
}
