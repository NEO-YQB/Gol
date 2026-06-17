import '../../domain/dashboard_summary.dart';
import '../dashboard_api_service.dart';

class DashboardRepository {
  const DashboardRepository({
    DashboardApiService apiService = const DashboardApiService(),
  }) : _apiService = apiService;

  final DashboardApiService _apiService;

  Future<DashboardSummary> getSummary({
    required String accessToken,
    required String fallbackStoreName,
  }) {
    return _apiService.getSummary(
      accessToken: accessToken,
      fallbackStoreName: fallbackStoreName,
    );
  }
}
