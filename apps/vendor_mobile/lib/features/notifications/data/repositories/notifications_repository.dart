import '../../domain/vendor_notification.dart';
import '../notifications_api_service.dart';

class NotificationsRepository {
  const NotificationsRepository({
    NotificationsApiService apiService = const NotificationsApiService(),
  }) : _apiService = apiService;

  final NotificationsApiService _apiService;

  Future<List<VendorNotification>> getNotifications({
    required String accessToken,
  }) {
    return _apiService.getNotifications(accessToken: accessToken);
  }
}
