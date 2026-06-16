import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../data/repositories/vendor_discounts_repository.dart';
import '../../domain/vendor_discount.dart';

class DiscountFilterItem {
  const DiscountFilterItem({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;
}

class DiscountsViewState {
  const DiscountsViewState({
    this.response,
    this.isLoading = true,
    this.errorMessage,
    this.filter = 'ALL',
  });

  final VendorDiscountListResponse? response;
  final bool isLoading;
  final String? errorMessage;
  final String filter;

  List<VendorDiscount> get items =>
      response?.items ?? const <VendorDiscount>[];

  DiscountsViewState copyWith({
    VendorDiscountListResponse? response,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    String? filter,
  }) {
    return DiscountsViewState(
      response: response ?? this.response,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      filter: filter ?? this.filter,
    );
  }
}

class DiscountsViewModel extends ChangeNotifier {
  DiscountsViewModel({
    required String accessToken,
    required int storeId,
    VendorDiscountsRepository repository = const VendorDiscountsRepository(),
  })  : _accessToken = accessToken,
        _storeId = storeId,
        _repository = repository;

  static const filters = <DiscountFilterItem>[
    DiscountFilterItem(label: 'همه', value: 'ALL'),
    DiscountFilterItem(label: 'فعال', value: 'ACTIVE'),
    DiscountFilterItem(label: 'غیرفعال', value: 'INACTIVE'),
  ];

  final String _accessToken;
  final int _storeId;
  final VendorDiscountsRepository _repository;
  bool _isDisposed = false;

  DiscountsViewState _state = const DiscountsViewState();
  DiscountsViewState get state => _state;

  Future<void> loadDiscounts() async {
    _state = _state.copyWith(isLoading: true, clearError: true);
    _notifyIfActive();

    try {
      final response = await _repository.getDiscounts(
        accessToken: _accessToken,
        storeId: _storeId,
        filter: _state.filter,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(response: response);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isLoading: false);
      _notifyIfActive();
    }
  }

  Future<void> setFilter(String filter) async {
    if (filter == _state.filter) return;

    _state = _state.copyWith(filter: filter);
    _notifyIfActive();
    await loadDiscounts();
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
