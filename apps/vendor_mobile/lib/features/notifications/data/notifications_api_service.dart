import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../domain/vendor_notification.dart';

class NotificationsApiService {
  const NotificationsApiService();

  Future<List<VendorNotification>> getNotifications({
    required String accessToken,
  }) async {
    if (AppConfig.enableDevOtpBypass && accessToken == 'dev-preview-token') {
      return _previewNotifications;
    }

    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/notifications/vendor/me'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری اعلان‌ها ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body);
      if (payload is! List) return const [];

      return payload
          .map(_mapNotification)
          .whereType<VendorNotification>()
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

  VendorNotification? _mapNotification(Object? value) {
    if (value is! Map<String, dynamic>) return null;

    final deliveries = (value['deliveries'] as List<dynamic>?) ?? const [];

    return VendorNotification(
      id: _asInt(value['id']),
      topic: (value['topic'] as String?) ?? 'notification',
      title: (value['title'] as String?)?.trim().isNotEmpty == true
          ? value['title'] as String
          : 'اعلان جدید',
      body: (value['body'] as String?)?.trim().isNotEmpty == true
          ? value['body'] as String
          : 'توضیحی برای این اعلان ثبت نشده است.',
      status: (value['status'] as String?) ?? 'PENDING',
      channel: (value['channel'] as String?) ?? 'IN_APP',
      createdAt: _asDateTime(value['createdAt']),
      orderId: value['orderId'] == null ? null : _asInt(value['orderId']),
      supportTicketId: value['supportTicketId'] == null
          ? null
          : _asInt(value['supportTicketId']),
      deliveries: deliveries
          .map(_mapDelivery)
          .whereType<VendorNotificationDelivery>()
          .toList(),
    );
  }

  VendorNotificationDelivery? _mapDelivery(Object? value) {
    if (value is! Map<String, dynamic>) return null;

    return VendorNotificationDelivery(
      id: _asInt(value['id']),
      channel: (value['channel'] as String?) ?? 'IN_APP',
      status: (value['status'] as String?) ?? 'PENDING',
      attempts: _asInt(value['attempts']),
      sentAt: _asDateTime(value['sentAt']),
    );
  }

  int _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }

  DateTime? _asDateTime(Object? value) {
    if (value is String && value.trim().isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
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

  static const List<VendorNotification> _previewNotifications = [
    VendorNotification(
      id: 91,
      topic: 'support.ticket.created',
      title: 'تیکت جدید برای سفارش ثبت شد',
      body: 'برای سفارش #۴۱۲ یک پرونده پشتیبانی جدید ایجاد شده است.',
      status: 'PENDING',
      channel: 'IN_APP',
      createdAt: null,
      orderId: 412,
      supportTicketId: 301,
      deliveries: [
        VendorNotificationDelivery(
          id: 1,
          channel: 'IN_APP',
          status: 'PENDING',
          attempts: 0,
          sentAt: null,
        ),
      ],
    ),
    VendorNotification(
      id: 88,
      topic: 'settlement.released',
      title: 'تسویه یک سفارش آزاد شد',
      body: 'مبلغ نگه‌داری‌شده سفارش #۴۰۷ به موجودی قابل برداشت منتقل شد.',
      status: 'SENT',
      channel: 'IN_APP',
      createdAt: null,
      orderId: 407,
      supportTicketId: null,
      deliveries: [
        VendorNotificationDelivery(
          id: 2,
          channel: 'IN_APP',
          status: 'SENT',
          attempts: 1,
          sentAt: null,
        ),
      ],
    ),
  ];
}
