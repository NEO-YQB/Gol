import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../domain/dashboard_summary.dart';

class DashboardApiService {
  const DashboardApiService();

  Future<DashboardSummary> getSummary({
    required String accessToken,
    required String fallbackStoreName,
  }) async {
    if (AppConfig.enableDevOtpBypass && accessToken == 'dev-preview-token') {
      return DashboardSummary(
        storeName: fallbackStoreName,
        availableBalance: 2450000,
        heldBalance: 580000,
        processingSettlementsCount: 3,
        onHoldSettlementsCount: 1,
        openTicketsCount: 2,
        escalatedTicketsCount: 1,
        healthScore: 92,
        healthStatus: 'GOOD',
        policyNote:
            'این حالت پیش‌نمایش است. برای تست UI بدون هزینه پیامک فعال شده و داده‌ها نمونه هستند.',
        policyTimeline: const [
          DashboardPolicyEvent(
            id: 1,
            aggregateType: 'admin-alert',
            summary: 'هشدار عملکرد فروشگاه ثبت شده و نیاز به بررسی دارد.',
            createdAt: null,
          ),
          DashboardPolicyEvent(
            id: 2,
            aggregateType: 'review',
            summary: 'یک بررسی جدید برای کیفیت سفارش‌ها ثبت شده است.',
            createdAt: null,
          ),
        ],
      );
    }

    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      };

      final responses = await Future.wait([
        http
            .get(
              Uri.parse('${AppConfig.apiBaseUrl}/vendor-dashboard/wallet-summary'),
              headers: headers,
            )
            .timeout(const Duration(seconds: 12)),
        http
            .get(
              Uri.parse('${AppConfig.apiBaseUrl}/vendor-dashboard/settlements-summary'),
              headers: headers,
            )
            .timeout(const Duration(seconds: 12)),
        http
            .get(
              Uri.parse('${AppConfig.apiBaseUrl}/vendor-dashboard/tickets-summary'),
              headers: headers,
            )
            .timeout(const Duration(seconds: 12)),
        http
            .get(
              Uri.parse('${AppConfig.apiBaseUrl}/vendor-dashboard/health-summary'),
              headers: headers,
            )
            .timeout(const Duration(seconds: 12)),
        http
            .get(
              Uri.parse('${AppConfig.apiBaseUrl}/vendor-dashboard/policy-restrictions'),
              headers: headers,
            )
            .timeout(const Duration(seconds: 12)),
        http
            .get(
              Uri.parse('${AppConfig.apiBaseUrl}/vendor-dashboard/policy-timeline'),
              headers: headers,
            )
            .timeout(const Duration(seconds: 12)),
      ]);

      for (final response in responses) {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw AuthApiException(
            _extractErrorMessage(response.body, 'بارگذاری داشبورد ناموفق بود.'),
            statusCode: response.statusCode,
          );
        }
      }

      final walletRecord = jsonDecode(responses[0].body) as Map<String, dynamic>;
      final settlementsRecord = jsonDecode(responses[1].body) as Map<String, dynamic>;
      final ticketsRecord = jsonDecode(responses[2].body) as Map<String, dynamic>;
      final healthRecord = jsonDecode(responses[3].body) as Map<String, dynamic>;
      final policyRecord = jsonDecode(responses[4].body) as Map<String, dynamic>;
      final timelineRecord = jsonDecode(responses[5].body) as Map<String, dynamic>;

      final store = (healthRecord['store'] as Map<String, dynamic>?) ?? const {};
      final wallet = (walletRecord['wallet'] as Map<String, dynamic>?) ?? const {};
      final counts = (settlementsRecord['counts'] as Map<String, dynamic>?) ?? const {};
      final totals = (ticketsRecord['totals'] as Map<String, dynamic>?) ?? const {};
      final restrictions =
          (policyRecord['restrictions'] as Map<String, dynamic>?) ?? const {};
      final explanation =
          (policyRecord['explanation'] as Map<String, dynamic>?) ?? const {};
      final timelineItems =
          (timelineRecord['timeline'] as List<dynamic>?) ?? const [];

      final blockNewDiscounts = restrictions['blockNewDiscounts'] == true;
      final baseNote = (explanation['note'] as String?)?.trim().isNotEmpty == true
          ? explanation['note'] as String
          : 'در حال حاضر policy موثر توضیح اضافه‌ای ندارد.';

      return DashboardSummary(
        storeName: (store['name'] as String?)?.trim().isNotEmpty == true
            ? store['name'] as String
            : fallbackStoreName,
        availableBalance: _asNum(wallet['availableBalance']),
        heldBalance: _asNum(wallet['heldBalance']),
        processingSettlementsCount:
            _asInt(counts['processing']) + _asInt(counts['pending']),
        onHoldSettlementsCount: _asInt(counts['onHold']),
        openTicketsCount: _asInt(totals['open']) + _asInt(totals['inReview']),
        escalatedTicketsCount: _asInt(totals['escalatedToFinance']),
        healthScore: _asNum(store['vendorHealthScore']),
        healthStatus: (store['vendorHealthStatus'] as String?) ?? 'UNKNOWN',
        policyNote: blockNewDiscounts
            ? '$baseNote ایجاد تخفیف جدید فعلاً محدود شده است.'
            : baseNote,
        policyTimeline: timelineItems
            .map(
              (item) => _mapPolicyEvent(item),
            )
            .whereType<DashboardPolicyEvent>()
            .take(3)
            .toList(),
      );
    } on TimeoutException {
      throw const AuthApiException(
        'پاسخی از سرور دریافت نشد. دوباره تلاش کن.',
      );
    } on SocketException {
      throw const AuthApiException(
        'اتصال به سرور برقرار نشد. بررسی کن اینترنت و آدرس API درست باشد.',
      );
    }
  }

  int _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }

  num _asNum(Object? value) {
    if (value is num) return value;
    return num.tryParse('$value') ?? 0;
  }

  DashboardPolicyEvent? _mapPolicyEvent(Object? value) {
    if (value is! Map<String, dynamic>) return null;

    return DashboardPolicyEvent(
      id: _asInt(value['id']),
      aggregateType: (value['aggregateType'] as String?) ?? 'event',
      summary: (value['summary'] as String?)?.trim().isNotEmpty == true
          ? value['summary'] as String
          : 'رویداد جدیدی برای وضعیت فروشگاه ثبت شده است.',
      createdAt: _asDateTime(value['createdAt']),
    );
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
}
