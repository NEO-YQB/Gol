import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../domain/vendor_wallet_summary.dart';

class WalletApiService {
  const WalletApiService();

  Future<VendorWalletSummary> getSummary({
    required String accessToken,
    required String period,
  }) async {
    if (AppConfig.enableDevOtpBypass && accessToken == 'dev-preview-token') {
      return _previewSummary(period);
    }

    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      };

      final walletUri = Uri.parse(
        '${AppConfig.apiBaseUrl}/vendor-dashboard/wallet-summary?period=$period',
      );
      final settlementsUri = Uri.parse(
        '${AppConfig.apiBaseUrl}/vendor-dashboard/settlements-summary?period=$period',
      );

      final responses = await Future.wait([
        http.get(walletUri, headers: headers).timeout(const Duration(seconds: 12)),
        http
            .get(settlementsUri, headers: headers)
            .timeout(const Duration(seconds: 12)),
      ]);

      for (final response in responses) {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw AuthApiException(
            _extractErrorMessage(
              response.body,
              'بارگذاری اطلاعات کیف پول ناموفق بود.',
            ),
            statusCode: response.statusCode,
          );
        }
      }

      final walletRecord = jsonDecode(responses[0].body) as Map<String, dynamic>;
      final settlementsRecord =
          jsonDecode(responses[1].body) as Map<String, dynamic>;

      final range = (walletRecord['range'] as Map<String, dynamic>?) ?? const {};
      final wallet = (walletRecord['wallet'] as Map<String, dynamic>?) ?? const {};
      final activity =
          (walletRecord['activity'] as Map<String, dynamic>?) ?? const {};
      final counts =
          (settlementsRecord['counts'] as Map<String, dynamic>?) ?? const {};
      final amounts =
          (settlementsRecord['amounts'] as Map<String, dynamic>?) ?? const {};

      final transactions =
          (walletRecord['recentTransactions'] as List<dynamic>?) ?? const [];
      final settlements =
          (settlementsRecord['recentOrders'] as List<dynamic>?) ?? const [];

      return VendorWalletSummary(
        period: (range['period'] as String?) ?? period,
        fromDateJalali: (range['fromDateJalali'] as String?) ?? '',
        toDateJalali: (range['toDateJalali'] as String?) ?? '',
        currentBalance: _asNum(wallet['currentBalance']),
        availableBalance: _asNum(wallet['availableBalance']),
        heldBalance: _asNum(wallet['heldBalance']),
        transactionCount: _asInt(activity['transactionCount']),
        creditAmount: _asNum(activity['creditAmount']),
        debitAmount: _asNum(activity['debitAmount']),
        recentTransactions: transactions
            .map(_mapTransaction)
            .whereType<VendorWalletTransaction>()
            .toList(),
        pendingSettlementsCount: _asInt(counts['pending']),
        eligibleSettlementsCount: _asInt(counts['eligible']),
        processingSettlementsCount: _asInt(counts['processing']),
        settledSettlementsCount: _asInt(counts['settled']),
        onHoldSettlementsCount: _asInt(counts['onHold']),
        reversedSettlementsCount: _asInt(counts['reversed']),
        vendorShareTotal: _asNum(amounts['vendorShareTotal']),
        releasedTotal: _asNum(amounts['releasedTotal']),
        reversedTotal: _asNum(amounts['reversedTotal']),
        releasableEstimate: _asNum(amounts['releasableEstimate']),
        recentSettlements: settlements
            .map(_mapSettlement)
            .whereType<VendorSettlementOrder>()
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

  VendorWalletSummary _previewSummary(String period) {
    return VendorWalletSummary(
      period: period,
      fromDateJalali: '1405-03-01',
      toDateJalali: '1405-03-25',
      currentBalance: 12450000,
      availableBalance: 9350000,
      heldBalance: 3100000,
      transactionCount: 18,
      creditAmount: 6850000,
      debitAmount: 920000,
      recentTransactions: const [
        VendorWalletTransaction(
          id: 1,
          type: 'SETTLEMENT_RELEASE',
          direction: 'CREDIT',
          amount: 1850000,
          title: 'آزادسازی settlement سفارش #412',
          description: 'مبلغ hold شده آزاد شد',
          orderId: 412,
          createdAt: null,
        ),
        VendorWalletTransaction(
          id: 2,
          type: 'MANUAL_DEBIT',
          direction: 'DEBIT',
          amount: 120000,
          title: 'تعدیل دستی',
          description: 'ثبت اصلاح مالی',
          orderId: null,
          createdAt: null,
        ),
      ],
      pendingSettlementsCount: 3,
      eligibleSettlementsCount: 2,
      processingSettlementsCount: 1,
      settledSettlementsCount: 14,
      onHoldSettlementsCount: 4,
      reversedSettlementsCount: 1,
      vendorShareTotal: 18600000,
      releasedTotal: 12400000,
      reversedTotal: 250000,
      releasableEstimate: 5950000,
      recentSettlements: const [
        VendorSettlementOrder(
          id: 412,
          settlementStatus: 'ON_HOLD',
          vendorShareAmount: 950000,
          settlementReleasedAmount: 0,
          settlementReversedAmount: 0,
          settlementEligibleAt: null,
          updatedAt: null,
        ),
        VendorSettlementOrder(
          id: 407,
          settlementStatus: 'SETTLED',
          vendorShareAmount: 1250000,
          settlementReleasedAmount: 1250000,
          settlementReversedAmount: 0,
          settlementEligibleAt: null,
          updatedAt: null,
        ),
      ],
    );
  }

  VendorWalletTransaction? _mapTransaction(Object? value) {
    if (value is! Map<String, dynamic>) return null;

    return VendorWalletTransaction(
      id: _asInt(value['id']),
      type: (value['type'] as String?) ?? 'UNKNOWN',
      direction: (value['direction'] as String?) ?? 'CREDIT',
      amount: _asNum(value['amount']),
      title: (value['title'] as String?)?.trim().isNotEmpty == true
          ? value['title'] as String
          : 'تراکنش مالی',
      description: (value['description'] as String?)?.trim().isNotEmpty == true
          ? value['description'] as String
          : null,
      orderId: value['orderId'] == null ? null : _asInt(value['orderId']),
      createdAt: _asDateTime(value['createdAt']),
    );
  }

  VendorSettlementOrder? _mapSettlement(Object? value) {
    if (value is! Map<String, dynamic>) return null;

    return VendorSettlementOrder(
      id: _asInt(value['id']),
      settlementStatus: (value['settlementStatus'] as String?) ?? 'PENDING',
      vendorShareAmount: _asNum(value['vendorShareAmount']),
      settlementReleasedAmount: _asNum(value['settlementReleasedAmount']),
      settlementReversedAmount: _asNum(value['settlementReversedAmount']),
      settlementEligibleAt: _asDateTime(value['settlementEligibleAt']),
      updatedAt: _asDateTime(value['updatedAt']),
    );
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
