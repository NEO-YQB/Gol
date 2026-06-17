import '../../domain/vendor_order_detail.dart';
import '../../domain/vendor_order_summary.dart';
import '../orders_api_service.dart';

class OrdersRepository {
  const OrdersRepository({
    OrdersApiService apiService = const OrdersApiService(),
  }) : _apiService = apiService;

  final OrdersApiService _apiService;

  Future<List<VendorOrderSummary>> getVendorOrders(String accessToken) {
    return _apiService.getVendorOrders(accessToken);
  }

  Future<VendorOrderDetail> getOrderDetail({
    required String accessToken,
    required int orderId,
  }) {
    return _apiService.getOrderDetail(
      accessToken: accessToken,
      orderId: orderId,
    );
  }

  Future<VendorOrderDetail> acceptOrder({
    required String accessToken,
    required int orderId,
  }) {
    return _apiService.acceptOrder(
      accessToken: accessToken,
      orderId: orderId,
    );
  }

  Future<VendorOrderDetail> shipOrder({
    required String accessToken,
    required int orderId,
  }) {
    return _apiService.shipOrder(
      accessToken: accessToken,
      orderId: orderId,
    );
  }

  Future<VendorOrderDetail> deliverOrder({
    required String accessToken,
    required int orderId,
  }) {
    return _apiService.deliverOrder(
      accessToken: accessToken,
      orderId: orderId,
    );
  }

  Future<VendorOrderDetail> cancelOrder({
    required String accessToken,
    required int orderId,
  }) {
    return _apiService.cancelOrder(
      accessToken: accessToken,
      orderId: orderId,
    );
  }
}
