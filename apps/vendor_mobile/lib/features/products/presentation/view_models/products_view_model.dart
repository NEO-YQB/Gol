import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../../discounts/domain/vendor_discount.dart';
import '../../data/repositories/products_repository.dart';
import '../../domain/vendor_product_summary.dart';

class ProductFilterItem {
  const ProductFilterItem({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;
}

class ProductsViewState {
  const ProductsViewState({
    this.response,
    this.discounts = const [],
    this.isLoading = true,
    this.errorMessage,
    this.statusFilter = 'ALL',
  });

  final VendorProductListResponse? response;
  final List<VendorDiscount> discounts;
  final bool isLoading;
  final String? errorMessage;
  final String statusFilter;

  List<VendorProductSummary> get products =>
      response?.items ?? const <VendorProductSummary>[];

  ProductsViewState copyWith({
    VendorProductListResponse? response,
    List<VendorDiscount>? discounts,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    String? statusFilter,
  }) {
    return ProductsViewState(
      response: response ?? this.response,
      discounts: discounts ?? this.discounts,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      statusFilter: statusFilter ?? this.statusFilter,
    );
  }
}

class ProductsViewModel extends ChangeNotifier {
  ProductsViewModel({
    required String accessToken,
    required int storeId,
    ProductsRepository repository = const ProductsRepository(),
  })  : _accessToken = accessToken,
        _storeId = storeId,
        _repository = repository;

  static const filters = <ProductFilterItem>[
    ProductFilterItem(label: 'همه', value: 'ALL'),
    ProductFilterItem(label: 'منتشرشده', value: 'PUBLISHED'),
    ProductFilterItem(label: 'بازبینی', value: 'SUBMITTED'),
    ProductFilterItem(label: 'پیش‌نویس', value: 'DRAFT'),
    ProductFilterItem(label: 'برگشت‌خورده', value: 'CHANGES_REQUESTED'),
  ];

  final String _accessToken;
  final int _storeId;
  final ProductsRepository _repository;
  bool _isDisposed = false;

  ProductsViewState _state = const ProductsViewState();
  ProductsViewState get state => _state;

  Future<void> loadProducts({required String search}) async {
    _state = _state.copyWith(isLoading: true, clearError: true);
    _notifyIfActive();

    try {
      final overview = await _repository.getProductsOverview(
        accessToken: _accessToken,
        storeId: _storeId,
        search: search,
        statusFilter: _state.statusFilter,
      );

      if (_isDisposed) return;
      _state = _state.copyWith(
        response: overview.products,
        discounts: overview.discounts,
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isLoading: false);
      _notifyIfActive();
    }
  }

  Future<void> setStatusFilter({
    required String value,
    required String search,
  }) async {
    if (value == _state.statusFilter) return;

    _state = _state.copyWith(statusFilter: value);
    _notifyIfActive();
    await loadProducts(search: search);
  }

  VendorDiscount? findActiveDiscount(int productId) {
    final now = DateTime.now();
    for (final item in _state.discounts) {
      if (item.productId != productId || !item.isActive) continue;
      final startAt = DateTime.tryParse(item.startAt)?.toLocal();
      final endAt = DateTime.tryParse(item.endAt)?.toLocal();
      if (startAt != null && now.isBefore(startAt)) continue;
      if (endAt != null && now.isAfter(endAt)) continue;
      return item;
    }
    return null;
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
