import '../../domain/vendor_wallet_summary.dart';
import '../wallet_api_service.dart';

class WalletRepository {
  const WalletRepository({
    WalletApiService apiService = const WalletApiService(),
  }) : _apiService = apiService;

  final WalletApiService _apiService;

  Future<VendorWalletSummary> getSummary({
    required String accessToken,
    required String period,
  }) {
    return _apiService.getSummary(
      accessToken: accessToken,
      period: period,
    );
  }
}
