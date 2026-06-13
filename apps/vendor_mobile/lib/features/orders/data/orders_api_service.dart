import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../domain/vendor_order_detail.dart';
import '../domain/vendor_order_summary.dart';

class OrdersApiService {
  const OrdersApiService();

  Future<List<VendorOrderSummary>> getVendorOrders(String accessToken) async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/orders/vendor'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری سفارش‌ها ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body);
      if (payload is! List) return const [];

      return payload
          .whereType<Map<String, dynamic>>()
          .map(VendorOrderSummary.fromJson)
          .toList();
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

  Future<VendorOrderDetail> getOrderDetail({
    required String accessToken,
    required int orderId,
  }) async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/orders/$orderId'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری سفارش ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorOrderDetail.fromJson(payload);
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

  Future<VendorOrderDetail> acceptOrder({
    required String accessToken,
    required int orderId,
  }) {
    return _runOrderAction(
      accessToken: accessToken,
      orderId: orderId,
      path: 'accept',
      body: const {},
    );
  }

  Future<VendorOrderDetail> shipOrder({
    required String accessToken,
    required int orderId,
  }) {
    return _runOrderAction(
      accessToken: accessToken,
      orderId: orderId,
      path: 'ship',
      body: const {},
    );
  }

  Future<VendorOrderDetail> deliverOrder({
    required String accessToken,
    required int orderId,
  }) {
    return _runOrderAction(
      accessToken: accessToken,
      orderId: orderId,
      path: 'deliver',
      body: const {},
    );
  }

  Future<VendorOrderDetail> cancelOrder({
    required String accessToken,
    required int orderId,
    String reason = 'عدم امکان انجام سفارش',
  }) {
    return _runOrderAction(
      accessToken: accessToken,
      orderId: orderId,
      path: 'vendor-cancel',
      body: {
        'reason': reason,
      },
    );
  }

  Future<VendorOrderDetail> _runOrderAction({
    required String accessToken,
    required int orderId,
    required String path,
    required Map<String, dynamic> body,
  }) async {
    try {
      final response = await http
          .patch(
            Uri.parse('${AppConfig.apiBaseUrl}/orders/$orderId/$path'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'اجرای عملیات سفارش ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorOrderDetail.fromJson(payload);
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
