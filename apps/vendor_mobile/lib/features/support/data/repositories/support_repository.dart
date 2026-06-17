import '../../domain/vendor_support_ticket.dart';
import '../support_api_service.dart';

class SupportRepository {
  const SupportRepository({
    SupportApiService apiService = const SupportApiService(),
  }) : _apiService = apiService;

  final SupportApiService _apiService;

  Future<List<VendorSupportTicket>> getTickets({
    required String accessToken,
  }) {
    return _apiService.getTickets(accessToken: accessToken);
  }

  Future<VendorSupportTicketDetail> getTicketDetail({
    required String accessToken,
    required int ticketId,
  }) {
    return _apiService.getTicketDetail(
      accessToken: accessToken,
      ticketId: ticketId,
    );
  }

  Future<void> addTicketNote({
    required String accessToken,
    required int ticketId,
    required String message,
  }) {
    return _apiService.addTicketNote(
      accessToken: accessToken,
      ticketId: ticketId,
      message: message,
    );
  }
}
