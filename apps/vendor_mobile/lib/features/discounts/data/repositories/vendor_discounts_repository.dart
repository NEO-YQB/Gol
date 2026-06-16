import '../vendor_discounts_api_service.dart';
import '../../domain/vendor_discount.dart';

class VendorDiscountsRepository {
  const VendorDiscountsRepository({
    VendorDiscountsApiService apiService = const VendorDiscountsApiService(),
  }) : _apiService = apiService;

  final VendorDiscountsApiService _apiService;

  Future<VendorDiscountListResponse> getDiscounts({
    required String accessToken,
    required int storeId,
    required String filter,
  }) {
    return _apiService.getDiscounts(
      accessToken: accessToken,
      storeId: storeId,
      isActive: filter == 'ALL' ? null : filter == 'ACTIVE',
    );
  }
}
