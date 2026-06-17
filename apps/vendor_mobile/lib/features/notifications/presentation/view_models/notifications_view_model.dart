import 'package:flutter/foundation.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../data/repositories/notifications_repository.dart';
import '../../domain/vendor_notification.dart';

class NotificationsViewState {
  const NotificationsViewState({
    this.items = const [],
    this.isLoading = true,
    this.isRefreshing = false,
    this.errorMessage,
  });

  final List<VendorNotification> items;
  final bool isLoading;
  final bool isRefreshing;
  final String? errorMessage;

  Map<String, List<VendorNotification>> get groupedItems {
    final Map<String, List<VendorNotification>> grouped = {};

    for (final item in items) {
      final label = _groupLabel(item.createdAt);
      grouped.putIfAbsent(label, () => []).add(item);
    }

    return grouped;
  }

  NotificationsViewState copyWith({
    List<VendorNotification>? items,
    bool? isLoading,
    bool? isRefreshing,
    String? errorMessage,
    bool clearError = false,
  }) {
    return NotificationsViewState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class NotificationsViewModel extends ChangeNotifier {
  NotificationsViewModel({
    required String accessToken,
    NotificationsRepository repository = const NotificationsRepository(),
  })  : _accessToken = accessToken,
        _repository = repository;

  final String _accessToken;
  final NotificationsRepository _repository;
  bool _isDisposed = false;

  NotificationsViewState _state = const NotificationsViewState();
  NotificationsViewState get state => _state;

  Future<void> loadNotifications() => _loadNotifications(isRefreshing: false);

  Future<void> refresh() => _loadNotifications(isRefreshing: true);

  Future<void> _loadNotifications({required bool isRefreshing}) async {
    _state = _state.copyWith(
      isLoading: !isRefreshing && _state.items.isEmpty,
      isRefreshing: isRefreshing,
      clearError: true,
    );
    _notifyIfActive();

    try {
      final items = await _repository.getNotifications(accessToken: _accessToken);
      if (_isDisposed) return;
      _state = _state.copyWith(items: items);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } catch (_) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        errorMessage: 'بارگذاری اعلان‌ها ناموفق بود.',
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

String _groupLabel(DateTime? dateTime) {
  if (dateTime == null) {
    return 'بدون تاریخ';
  }

  final local = dateTime.toLocal();
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final itemDay = DateTime(local.year, local.month, local.day);
  final diff = today.difference(itemDay).inDays;

  if (diff == 0) return 'امروز';
  if (diff == 1) return 'دیروز';

  final jalali = Jalali.fromDateTime(local);
  return _toPersianDigits(jalali.formatCompactDate());
}

String _toPersianDigits(Object value) {
  const english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  var output = value.toString();
  for (var i = 0; i < english.length; i++) {
    output = output.replaceAll(english[i], persian[i]);
  }
  return output;
}
