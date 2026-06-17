import '../vendor_discounts_api_service.dart';
import '../../domain/vendor_discount.dart';
import '../../../products/domain/vendor_product_summary.dart';

class VendorDiscountsRepository {
  const VendorDiscountsRepository({
    VendorDiscountsApiService apiService = const VendorDiscountsApiService(),
  }) : _apiService = apiService;

  final VendorDiscountsApiService _apiService;

  Future<VendorDiscountListResponse> getDiscounts({
    required String accessToken,
    required int storeId,
  }) {
    return _apiService.getDiscounts(
      accessToken: accessToken,
      storeId: storeId,
    );
  }

  Future<List<VendorProductSummary>> getStoreProducts({
    required String accessToken,
    required int storeId,
  }) {
    return _apiService.getStoreProducts(
      accessToken: accessToken,
      storeId: storeId,
    );
  }

  Future<VendorDiscount> getDiscountDetail({
    required String accessToken,
    required int discountId,
  }) {
    return _apiService.getDiscountDetail(
      accessToken: accessToken,
      discountId: discountId,
    );
  }

  Future<VendorDiscount> createDiscount({
    required String accessToken,
    required Map<String, dynamic> input,
  }) {
    return _apiService.createDiscount(
      accessToken: accessToken,
      input: input,
    );
  }

  Future<VendorDiscount> updateDiscount({
    required String accessToken,
    required int discountId,
    required Map<String, dynamic> input,
  }) {
    return _apiService.updateDiscount(
      accessToken: accessToken,
      discountId: discountId,
      input: input,
    );
  }

  Future<void> deleteDiscount({
    required String accessToken,
    required int discountId,
  }) {
    return _apiService.deleteDiscount(
      accessToken: accessToken,
      discountId: discountId,
    );
  }
}
