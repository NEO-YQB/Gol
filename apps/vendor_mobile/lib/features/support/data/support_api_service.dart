import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../domain/vendor_support_ticket.dart';

class SupportApiService {
  const SupportApiService();

  Future<List<VendorSupportTicket>> getTickets({
    required String accessToken,
  }) async {
    if (AppConfig.enableDevOtpBypass && accessToken == 'dev-preview-token') {
      return _previewTickets;
    }

    try {
      final ticketsSummaryResponse = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/vendor-dashboard/tickets-summary'),
            headers: _headers(accessToken),
          )
          .timeout(const Duration(seconds: 12));

      if (ticketsSummaryResponse.statusCode < 200 ||
          ticketsSummaryResponse.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(
            ticketsSummaryResponse.body,
            'بارگذاری تیکت‌ها ناموفق بود.',
          ),
          statusCode: ticketsSummaryResponse.statusCode,
        );
      }

      final payload =
          jsonDecode(ticketsSummaryResponse.body) as Map<String, dynamic>;
      final recentTickets = (payload['recentTickets'] as List<dynamic>?) ?? const [];

      final details = await Future.wait(
        recentTickets
            .map((item) => _ticketIdFromSummary(item))
            .where((id) => id != null)
            .map(
              (id) => getTicketDetail(
                accessToken: accessToken,
                ticketId: id!,
              ),
            ),
      );

      return details
          .map(
            (detail) => VendorSupportTicket(
              id: detail.id,
              orderId: detail.orderId,
              status: detail.status,
              reason: detail.reason,
              title: detail.title,
              customerName: detail.customerName,
              customerPhone: detail.customerPhone,
              createdAt: detail.createdAt,
              resolvedAt: detail.resolvedAt,
              latestOperationalFlags: detail.latestOperationalFlags,
            ),
          )
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

  Future<VendorSupportTicketDetail> getTicketDetail({
    required String accessToken,
    required int ticketId,
  }) async {
    if (AppConfig.enableDevOtpBypass && accessToken == 'dev-preview-token') {
      return _previewDetails.firstWhere(
        (item) => item.id == ticketId,
        orElse: () => _previewDetails.first,
      );
    }

    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/support/tickets/$ticketId'),
            headers: _headers(accessToken),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری جزئیات تیکت ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      final customer = (payload['customer'] as Map<String, dynamic>?) ?? const {};
      final store = (payload['store'] as Map<String, dynamic>?) ?? const {};
      final notes = (payload['timeline'] as List<dynamic>?) ?? const [];

      return VendorSupportTicketDetail(
        id: _asInt(payload['id']),
        orderId: payload['orderId'] == null ? null : _asInt(payload['orderId']),
        status: (payload['status'] as String?) ?? 'OPEN',
        reason: (payload['reason'] as String?) ?? 'OTHER',
        title: (payload['title'] as String?)?.trim().isNotEmpty == true
            ? payload['title'] as String
            : 'تیکت پشتیبانی',
        description: (payload['description'] as String?)?.trim().isNotEmpty == true
            ? payload['description'] as String
            : 'توضیحی ثبت نشده است.',
        customerName: (customer['fullName'] as String?)?.trim().isNotEmpty == true
            ? customer['fullName'] as String
            : 'مشتری',
        customerPhone: (customer['phoneNumber'] as String?) ?? '—',
        storeName: (store['name'] as String?) ?? 'فروشگاه',
        createdAt: _asDateTime(payload['createdAt']),
        resolvedAt: _asDateTime(payload['resolvedAt']),
        timeline: notes
            .map(_mapMessage)
            .whereType<VendorSupportTicketMessage>()
            .toList(),
        latestOperationalFlags:
            ((payload['latestOperationalFlags'] as List<dynamic>?) ?? const [])
                .map((item) => '$item')
                .toList(),
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

  Future<void> addTicketNote({
    required String accessToken,
    required int ticketId,
    required String message,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('${AppConfig.apiBaseUrl}/support/tickets/$ticketId/notes'),
            headers: _headers(accessToken),
            body: jsonEncode({
              'message': message,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'ارسال پیام ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }
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

  Map<String, String> _headers(String accessToken) => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      };

  int? _ticketIdFromSummary(Object? value) {
    if (value is! Map<String, dynamic>) return null;
    return _asInt(value['id']);
  }

  VendorSupportTicketMessage? _mapMessage(Object? value) {
    if (value is! Map<String, dynamic>) return null;

    return VendorSupportTicketMessage(
      id: _asInt(value['id']),
      actorType: (value['actorType'] as String?) ?? 'CUSTOMER',
      message: (value['message'] as String?)?.trim().isNotEmpty == true
          ? value['message'] as String
          : 'پیام خالی است.',
      createdAt: _asDateTime(value['createdAt']),
      isInternal: value['isInternal'] == true,
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

  static const List<VendorSupportTicket> _previewTickets = [
    VendorSupportTicket(
      id: 301,
      orderId: 412,
      status: 'WAITING_VENDOR',
      reason: 'DAMAGED_FLOWERS',
      title: 'آسیب دیدن بخشی از سفارش',
      customerName: 'مشتری نمونه',
      customerPhone: '09120000000',
      createdAt: null,
      resolvedAt: null,
      latestOperationalFlags: ['FOLLOW_UP_REQUIRED'],
    ),
    VendorSupportTicket(
      id: 294,
      orderId: 407,
      status: 'ESCALATED_TO_FINANCE',
      reason: 'REFUND_REQUEST',
      title: 'درخواست بررسی مالی سفارش',
      customerName: 'کاربر مالی',
      customerPhone: '09121111111',
      createdAt: null,
      resolvedAt: null,
      latestOperationalFlags: [
        'FOLLOW_UP_REQUIRED',
        'FINANCE_REVIEW_PENDING',
      ],
    ),
  ];

  static const List<VendorSupportTicketDetail> _previewDetails = [
    VendorSupportTicketDetail(
      id: 301,
      orderId: 412,
      status: 'WAITING_VENDOR',
      reason: 'DAMAGED_FLOWERS',
      title: 'آسیب دیدن بخشی از سفارش',
      description: 'بخشی از گل‌ها در لحظه تحویل آسیب دیده بودند و مشتری عکس ارسال کرده است.',
      customerName: 'مشتری نمونه',
      customerPhone: '09120000000',
      storeName: 'فروشگاه نمونه',
      createdAt: null,
      resolvedAt: null,
      latestOperationalFlags: ['FOLLOW_UP_REQUIRED'],
      timeline: [
        VendorSupportTicketMessage(
          id: 1,
          actorType: 'CUSTOMER',
          message: 'عکس سفارش را ارسال کردم، لطفا بررسی کنید.',
          createdAt: null,
          isInternal: false,
        ),
        VendorSupportTicketMessage(
          id: 2,
          actorType: 'ADMIN',
          message: 'نیاز به پاسخ فروشنده دارد.',
          createdAt: null,
          isInternal: false,
        ),
      ],
    ),
    VendorSupportTicketDetail(
      id: 294,
      orderId: 407,
      status: 'ESCALATED_TO_FINANCE',
      reason: 'REFUND_REQUEST',
      title: 'درخواست بررسی مالی سفارش',
      description: 'مشتری درخواست بازبینی مالی و بخشی از بازگشت وجه را ثبت کرده است.',
      customerName: 'کاربر مالی',
      customerPhone: '09121111111',
      storeName: 'فروشگاه نمونه',
      createdAt: null,
      resolvedAt: null,
      latestOperationalFlags: [
        'FOLLOW_UP_REQUIRED',
        'FINANCE_REVIEW_PENDING',
      ],
      timeline: [
        VendorSupportTicketMessage(
          id: 3,
          actorType: 'CUSTOMER',
          message: 'پرداخت انجام شد اما بخشی از سفارش مطابق انتظار نبود.',
          createdAt: null,
          isInternal: false,
        ),
        VendorSupportTicketMessage(
          id: 4,
          actorType: 'ADMIN',
          message: 'پرونده برای بررسی مالی ارجاع شد.',
          createdAt: null,
          isInternal: false,
        ),
      ],
    ),
  ];
}
