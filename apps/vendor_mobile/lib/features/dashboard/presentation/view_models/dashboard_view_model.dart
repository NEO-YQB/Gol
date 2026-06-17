import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../data/repositories/dashboard_repository.dart';
import '../../domain/dashboard_summary.dart';

class DashboardViewState {
  const DashboardViewState({
    this.summary,
    this.isLoading = true,
    this.isRefreshing = false,
    this.errorMessage,
  });

  final DashboardSummary? summary;
  final bool isLoading;
  final bool isRefreshing;
  final String? errorMessage;

  DashboardViewState copyWith({
    DashboardSummary? summary,
    bool? isLoading,
    bool? isRefreshing,
    String? errorMessage,
    bool clearError = false,
  }) {
    return DashboardViewState(
      summary: summary ?? this.summary,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class DashboardViewModel extends ChangeNotifier {
  DashboardViewModel({
    required String accessToken,
    required String fallbackStoreName,
    DashboardRepository repository = const DashboardRepository(),
  })  : _accessToken = accessToken,
        _fallbackStoreName = fallbackStoreName,
        _repository = repository;

  final String _accessToken;
  final String _fallbackStoreName;
  final DashboardRepository _repository;
  bool _isDisposed = false;

  DashboardViewState _state = const DashboardViewState();
  DashboardViewState get state => _state;

  Future<void> loadSummary() => _loadSummary(isRefreshing: false);

  Future<void> refresh() => _loadSummary(isRefreshing: true);

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
        fallbackStoreName: _fallbackStoreName,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(summary: summary);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } catch (_) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        errorMessage: 'بارگذاری داشبورد ناموفق بود.',
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
