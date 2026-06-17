import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../data/repositories/wallet_repository.dart';
import '../../domain/vendor_wallet_summary.dart';

enum WalletPeriod {
  today('today', 'امروز'),
  week('week', 'هفته'),
  month('month', 'ماه'),
  year('year', 'سال');

  const WalletPeriod(this.apiValue, this.label);

  final String apiValue;
  final String label;
}

class WalletViewState {
  const WalletViewState({
    this.summary,
    this.period = WalletPeriod.month,
    this.isLoading = true,
    this.isRefreshing = false,
    this.errorMessage,
  });

  final VendorWalletSummary? summary;
  final WalletPeriod period;
  final bool isLoading;
  final bool isRefreshing;
  final String? errorMessage;

  WalletViewState copyWith({
    VendorWalletSummary? summary,
    WalletPeriod? period,
    bool? isLoading,
    bool? isRefreshing,
    String? errorMessage,
    bool clearError = false,
  }) {
    return WalletViewState(
      summary: summary ?? this.summary,
      period: period ?? this.period,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class WalletViewModel extends ChangeNotifier {
  WalletViewModel({
    required String accessToken,
    WalletRepository repository = const WalletRepository(),
  })  : _accessToken = accessToken,
        _repository = repository;

  final String _accessToken;
  final WalletRepository _repository;
  bool _isDisposed = false;

  WalletViewState _state = const WalletViewState();
  WalletViewState get state => _state;

  Future<void> loadSummary() => _loadSummary(isRefreshing: false);

  Future<void> refresh() => _loadSummary(isRefreshing: true);

  Future<void> setPeriod(WalletPeriod period) async {
    if (period == _state.period) return;

    _state = _state.copyWith(period: period);
    _notifyIfActive();
    await _loadSummary(isRefreshing: true);
  }

  Future<void> _loadSummary({required bool isRefreshing}) async {
    _state = _state.copyWith(
      isLoading: !isRefreshing && _state.summary == null,
      isRefreshing: isRefreshing,
      clearError: true,
    );
    _notifyIfActive();

    try {
      final summary = await _repository.getSummary(
        accessToken: _accessToken,
        period: _state.period.apiValue,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(summary: summary);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } catch (_) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        errorMessage: 'بارگذاری کیف پول و تسویه ناموفق بود.',
      );
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isLoading: false, isRefreshing: false);
      _notifyIfActive();
    }
  }

  void _notifyIfActive() {
    if (!_isDisposed) notifyListeners();
  }

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }
}
