import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../data/repositories/orders_repository.dart';
import '../../domain/vendor_order_detail.dart';
import '../../domain/vendor_order_summary.dart';

class OrdersFilterItem {
  const OrdersFilterItem({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;
}

class OrdersViewState {
  const OrdersViewState({
    this.orders = const [],
    this.selectedOrderDetail,
    this.screenErrorMessage,
    this.actionErrorMessage,
    this.isLoading = true,
    this.isLoadingDetail = false,
    this.isRefreshing = false,
    this.busyAction,
    this.selectedFilter = 'ALL',
    this.showOnlyActionable = false,
    this.search = '',
  });

  final List<VendorOrderSummary> orders;
  final VendorOrderDetail? selectedOrderDetail;
  final String? screenErrorMessage;
  final String? actionErrorMessage;
  final bool isLoading;
  final bool isLoadingDetail;
  final bool isRefreshing;
  final String? busyAction;
  final String selectedFilter;
  final bool showOnlyActionable;
  final String search;

  OrdersViewState copyWith({
    List<VendorOrderSummary>? orders,
    VendorOrderDetail? selectedOrderDetail,
    bool clearSelectedOrderDetail = false,
    String? screenErrorMessage,
    bool clearScreenError = false,
    String? actionErrorMessage,
    bool clearActionError = false,
    bool? isLoading,
    bool? isLoadingDetail,
    bool? isRefreshing,
    String? busyAction,
    bool clearBusyAction = false,
    String? selectedFilter,
    bool? showOnlyActionable,
    String? search,
  }) {
    return OrdersViewState(
      orders: orders ?? this.orders,
      selectedOrderDetail: clearSelectedOrderDetail
          ? null
          : selectedOrderDetail ?? this.selectedOrderDetail,
      screenErrorMessage: clearScreenError
          ? null
          : screenErrorMessage ?? this.screenErrorMessage,
      actionErrorMessage: clearActionError
          ? null
          : actionErrorMessage ?? this.actionErrorMessage,
      isLoading: isLoading ?? this.isLoading,
      isLoadingDetail: isLoadingDetail ?? this.isLoadingDetail,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      busyAction: clearBusyAction ? null : busyAction ?? this.busyAction,
      selectedFilter: selectedFilter ?? this.selectedFilter,
      showOnlyActionable: showOnlyActionable ?? this.showOnlyActionable,
      search: search ?? this.search,
    );
  }

  List<VendorOrderSummary> get filteredOrders {
    final searchValue = search.trim().toLowerCase();
    return orders.where((order) {
      final normalizedStatus =
          _translateOrderStatus(order.status).toLowerCase();
      final normalizedPayment =
          _translatePaymentStatus(order.paymentStatus).toLowerCase();
      final matchesSearch =
          searchValue.isEmpty ||
          order.customerName.toLowerCase().contains(searchValue) ||
          order.id.toString().contains(searchValue) ||
          order.phoneNumber.toLowerCase().contains(searchValue) ||
          normalizedStatus.contains(searchValue) ||
          normalizedPayment.contains(searchValue);

      final matchesFilter =
          selectedFilter == 'ALL' || order.status == selectedFilter;

      final matchesActionable = !showOnlyActionable ||
          order.status == 'PENDING' ||
          order.status == 'PAID' ||
          order.status == 'ACCEPTED' ||
          order.status == 'PROCESSING' ||
          order.status == 'SHIPPED';

      return matchesSearch && matchesFilter && matchesActionable;
    }).toList();
  }

  int get pendingOrdersCount => orders.where((order) {
        return order.status == 'PENDING' || order.status == 'PAID';
      }).length;

  int get deliveredOrdersCount =>
      orders.where((order) => order.status == 'DELIVERED').length;
}

class OrdersViewModel extends ChangeNotifier {
  OrdersViewModel({
    required String accessToken,
    OrdersRepository repository = const OrdersRepository(),
  })  : _accessToken = accessToken,
        _repository = repository;

  static const filterOptions = <OrdersFilterItem>[
    OrdersFilterItem(label: 'همه', value: 'ALL'),
    OrdersFilterItem(label: 'در انتظار', value: 'PENDING'),
    OrdersFilterItem(label: 'پرداخت‌شده', value: 'PAID'),
    OrdersFilterItem(label: 'پذیرفته‌شده', value: 'ACCEPTED'),
    OrdersFilterItem(label: 'در پردازش', value: 'PROCESSING'),
    OrdersFilterItem(label: 'ارسال‌شده', value: 'SHIPPED'),
    OrdersFilterItem(label: 'تحویل‌شده', value: 'DELIVERED'),
    OrdersFilterItem(label: 'لغوشده', value: 'CANCELLED'),
  ];

  final String _accessToken;
  final OrdersRepository _repository;
  bool _isDisposed = false;

  OrdersViewState _state = const OrdersViewState();
  OrdersViewState get state => _state;

  Future<void> loadOrders() => _loadOrders(isRefreshing: false);

  Future<void> refresh() => _loadOrders(isRefreshing: true);

  Future<void> loadOrderDetail(int orderId, {bool silent = false}) async {
    if (!silent) {
      _state = _state.copyWith(
        isLoadingDetail: true,
        clearActionError: true,
      );
      _notifyIfActive();
    }

    try {
      final detail = await _repository.getOrderDetail(
        accessToken: _accessToken,
        orderId: orderId,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(selectedOrderDetail: detail);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(actionErrorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isLoadingDetail: false);
      _notifyIfActive();
    }
  }

  Future<void> runAction(
    String key,
    int orderId,
    Future<VendorOrderDetail> Function() action,
  ) async {
    if (_state.orders.isEmpty) return;

    _state = _state.copyWith(
      busyAction: key,
      clearActionError: true,
    );
    _notifyIfActive();

    try {
      final detail = await action();
      if (_isDisposed) return;

      await _loadOrders(isRefreshing: true);
      await loadOrderDetail(detail.id, silent: true);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(actionErrorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(clearBusyAction: true);
      _notifyIfActive();
    }
  }

  void setSearch(String value) {
    _state = _state.copyWith(search: value);
    _notifyIfActive();
  }

  void clearSearch() {
    _state = _state.copyWith(search: '');
    _notifyIfActive();
  }

  void setSelectedFilter(String value) {
    _state = _state.copyWith(selectedFilter: value);
    _notifyIfActive();
  }

  void setShowOnlyActionable(bool value) {
    _state = _state.copyWith(showOnlyActionable: value);
    _notifyIfActive();
  }

  Future<void> acceptOrder(int orderId) {
    return runAction(
      'accept',
      orderId,
      () => _repository.acceptOrder(
        accessToken: _accessToken,
        orderId: orderId,
      ),
    );
  }

  Future<void> shipOrder(int orderId) {
    return runAction(
      'ship',
      orderId,
      () => _repository.shipOrder(
        accessToken: _accessToken,
        orderId: orderId,
      ),
    );
  }

  Future<void> deliverOrder(int orderId) {
    return runAction(
      'deliver',
      orderId,
      () => _repository.deliverOrder(
        accessToken: _accessToken,
        orderId: orderId,
      ),
    );
  }

  Future<void> cancelOrder(int orderId) {
    return runAction(
      'cancel',
      orderId,
      () => _repository.cancelOrder(
        accessToken: _accessToken,
        orderId: orderId,
      ),
    );
  }

  Future<void> _loadOrders({required bool isRefreshing}) async {
    _state = _state.copyWith(
      isLoading: !isRefreshing && _state.orders.isEmpty,
      isRefreshing: isRefreshing,
      clearScreenError: true,
    );
    _notifyIfActive();

    try {
      final orders = await _repository.getVendorOrders(_accessToken);
      if (_isDisposed) return;
      _state = _state.copyWith(orders: orders);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(screenErrorMessage: error.message);
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

String _translateOrderStatus(String status) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار';
    case 'PAID':
      return 'پرداخت‌شده';
    case 'ACCEPTED':
      return 'پذیرفته‌شده';
    case 'PROCESSING':
      return 'در حال آماده‌سازی';
    case 'SHIPPED':
      return 'ارسال‌شده';
    case 'DELIVERED':
      return 'تحویل‌شده';
    case 'CANCELLED':
      return 'لغوشده';
    case 'REFUNDED':
      return 'مرجوع‌شده';
    default:
      return status;
  }
}

String _translatePaymentStatus(String status) {
  switch (status) {
    case 'PAID':
      return 'پرداخت موفق';
    case 'PENDING':
      return 'در انتظار پرداخت';
    case 'FAILED':
      return 'پرداخت ناموفق';
    case 'REFUNDED':
      return 'بازگشت وجه';
    default:
      return status;
  }
}
