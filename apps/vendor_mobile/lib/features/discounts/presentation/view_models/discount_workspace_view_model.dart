import 'package:flutter/foundation.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../../products/domain/vendor_product_summary.dart';
import '../../data/repositories/vendor_discounts_repository.dart';
import '../../domain/vendor_discount.dart';

class DiscountWorkspaceViewState {
  const DiscountWorkspaceViewState({
    this.isLoading = true,
    this.isSaving = false,
    this.errorMessage,
    this.products = const [],
    this.discount,
    this.selectedProductId,
    this.valueType = 'PERCENTAGE',
    this.isActive = true,
    this.isExclusive = false,
    this.allowCouponStacking = false,
    this.startAt,
    this.endAt,
  });

  final bool isLoading;
  final bool isSaving;
  final String? errorMessage;
  final List<VendorProductSummary> products;
  final VendorDiscount? discount;
  final int? selectedProductId;
  final String valueType;
  final bool isActive;
  final bool isExclusive;
  final bool allowCouponStacking;
  final DateTime? startAt;
  final DateTime? endAt;

  String get startAtLabel => _formatDateTimeLabel(startAt);
  String get endAtLabel => _formatDateTimeLabel(endAt);

  DiscountWorkspaceViewState copyWith({
    bool? isLoading,
    bool? isSaving,
    String? errorMessage,
    bool clearError = false,
    List<VendorProductSummary>? products,
    VendorDiscount? discount,
    int? selectedProductId,
    bool clearSelectedProductId = false,
    String? valueType,
    bool? isActive,
    bool? isExclusive,
    bool? allowCouponStacking,
    DateTime? startAt,
    bool clearStartAt = false,
    DateTime? endAt,
    bool clearEndAt = false,
  }) {
    return DiscountWorkspaceViewState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      products: products ?? this.products,
      discount: discount ?? this.discount,
      selectedProductId: clearSelectedProductId
          ? null
          : selectedProductId ?? this.selectedProductId,
      valueType: valueType ?? this.valueType,
      isActive: isActive ?? this.isActive,
      isExclusive: isExclusive ?? this.isExclusive,
      allowCouponStacking:
          allowCouponStacking ?? this.allowCouponStacking,
      startAt: clearStartAt ? null : startAt ?? this.startAt,
      endAt: clearEndAt ? null : endAt ?? this.endAt,
    );
  }
}

class DiscountWorkspaceViewModel extends ChangeNotifier {
  DiscountWorkspaceViewModel({
    required String accessToken,
    required int storeId,
    required int? discountId,
    VendorDiscountsRepository repository = const VendorDiscountsRepository(),
  })  : _accessToken = accessToken,
        _storeId = storeId,
        _discountId = discountId,
        _repository = repository;

  final String _accessToken;
  final int _storeId;
  final int? _discountId;
  final VendorDiscountsRepository _repository;
  bool _isDisposed = false;

  bool get isEdit => _discountId != null;

  DiscountWorkspaceViewState _state = const DiscountWorkspaceViewState();
  DiscountWorkspaceViewState get state => _state;

  Future<void> loadData() async {
    _state = _state.copyWith(isLoading: true, clearError: true);
    _notifyIfActive();

    try {
      final productsFuture = _repository.getStoreProducts(
        accessToken: _accessToken,
        storeId: _storeId,
      );
      final discountFuture = isEdit
          ? _repository.getDiscountDetail(
              accessToken: _accessToken,
              discountId: _discountId!,
            )
          : Future<VendorDiscount?>.value();

      final products = await productsFuture;
      final discount = await discountFuture;

      if (_isDisposed) return;
      if (discount != null) {
        _state = _state.copyWith(
          products: products,
          discount: discount,
          selectedProductId: discount.productId,
          valueType: discount.valueType,
          isActive: discount.isActive,
          isExclusive: discount.isExclusive,
          allowCouponStacking: discount.allowCouponStacking,
          startAt: _parseDateTime(discount.startAt),
          endAt: _parseDateTime(discount.endAt),
        );
      } else {
        _state = _state.copyWith(
          products: products,
          selectedProductId: products.isNotEmpty ? products.first.id : null,
          clearSelectedProductId: products.isEmpty,
        );
      }
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isLoading: false);
      _notifyIfActive();
    }
  }

  void selectProduct(int? productId) {
    if (isEdit) return;
    _state = _state.copyWith(
      selectedProductId: productId,
      clearSelectedProductId: productId == null,
    );
    _notifyIfActive();
  }

  void setValueType(String valueType) {
    _state = _state.copyWith(valueType: valueType);
    _notifyIfActive();
  }

  void setIsActive(bool value) {
    _state = _state.copyWith(isActive: value);
    _notifyIfActive();
  }

  void setIsExclusive(bool value) {
    _state = _state.copyWith(isExclusive: value);
    _notifyIfActive();
  }

  void setAllowCouponStacking(bool value) {
    _state = _state.copyWith(allowCouponStacking: value);
    _notifyIfActive();
  }

  void setStartAt(DateTime? value) {
    _state = _state.copyWith(
      startAt: value,
      clearStartAt: value == null,
      clearEndAt: value != null &&
          _state.endAt != null &&
          !_state.endAt!.isAfter(value),
    );
    _notifyIfActive();
  }

  void setEndAt(DateTime? value) {
    _state = _state.copyWith(
      endAt: value,
      clearEndAt: value == null,
    );
    _notifyIfActive();
  }

  Future<bool> save({
    required String title,
    required String description,
    required String value,
    required String priority,
  }) async {
    if (title.trim().isEmpty ||
        value.trim().isEmpty ||
        _state.selectedProductId == null) {
      _state = _state.copyWith(
        errorMessage: 'عنوان، مقدار و محصول الزامی هستند.',
      );
      _notifyIfActive();
      return false;
    }

    final now = DateTime.now();
    if (_state.startAt != null && _state.startAt!.isBefore(now)) {
      _state = _state.copyWith(
        errorMessage: 'زمان شروع نمی‌تواند قبل از الان باشد.',
      );
      _notifyIfActive();
      return false;
    }

    if (_state.endAt != null && _state.endAt!.isBefore(now)) {
      _state = _state.copyWith(
        errorMessage: 'زمان پایان نمی‌تواند قبل از الان باشد.',
      );
      _notifyIfActive();
      return false;
    }

    if (_state.startAt != null &&
        _state.endAt != null &&
        !_state.endAt!.isAfter(_state.startAt!)) {
      _state = _state.copyWith(
        errorMessage: 'زمان پایان باید بعد از زمان شروع باشد.',
      );
      _notifyIfActive();
      return false;
    }

    _state = _state.copyWith(isSaving: true, clearError: true);
    _notifyIfActive();

    final input = {
      'productId': _state.selectedProductId,
      'title': title.trim(),
      'description': _emptyToNull(description),
      'valueType': _state.valueType,
      'value': _parseNum(value) ?? 0,
      'priority': _parseInt(priority) ?? 100,
      'isActive': _state.isActive,
      'isExclusive': _state.isExclusive,
      'allowCouponStacking': _state.allowCouponStacking,
      'startAt': _state.startAt?.toUtc().toIso8601String(),
      'endAt': _state.endAt?.toUtc().toIso8601String(),
    };

    try {
      if (isEdit) {
        await _repository.updateDiscount(
          accessToken: _accessToken,
          discountId: _discountId!,
          input: input,
        );
      } else {
        await _repository.createDiscount(
          accessToken: _accessToken,
          input: input,
        );
      }
      return true;
    } on AuthApiException catch (error) {
      if (!_isDisposed) {
        _state = _state.copyWith(errorMessage: error.message);
      }
      return false;
    } finally {
      if (!_isDisposed) {
        _state = _state.copyWith(isSaving: false);
        _notifyIfActive();
      }
    }
  }

  Future<bool> delete() async {
    if (!isEdit) return false;

    try {
      await _repository.deleteDiscount(
        accessToken: _accessToken,
        discountId: _discountId!,
      );
      return true;
    } on AuthApiException catch (error) {
      if (!_isDisposed) {
        _state = _state.copyWith(errorMessage: error.message);
        _notifyIfActive();
      }
      return false;
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

int? _parseInt(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return int.tryParse(trimmed);
}

num? _parseNum(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return num.tryParse(trimmed);
}

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

DateTime? _parseDateTime(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return DateTime.tryParse(trimmed)?.toLocal();
}

String _formatDateTimeLabel(DateTime? value) {
  if (value == null) return '';
  final jalali = Jalali.fromDateTime(value);
  final month = jalali.month.toString().padLeft(2, '0');
  final day = jalali.day.toString().padLeft(2, '0');
  final hour = value.hour.toString().padLeft(2, '0');
  final minute = value.minute.toString().padLeft(2, '0');
  return '${jalali.year}/$month/$day - $hour:$minute';
}
