import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../data/repositories/support_repository.dart';
import '../../domain/vendor_support_ticket.dart';

class SupportViewState {
  const SupportViewState({
    this.tickets = const [],
    this.selectedTicketId,
    this.selectedDetail,
    this.isLoading = true,
    this.isRefreshing = false,
    this.isLoadingDetail = false,
    this.isSendingNote = false,
    this.errorMessage,
    this.detailError,
  });

  final List<VendorSupportTicket> tickets;
  final int? selectedTicketId;
  final VendorSupportTicketDetail? selectedDetail;
  final bool isLoading;
  final bool isRefreshing;
  final bool isLoadingDetail;
  final bool isSendingNote;
  final String? errorMessage;
  final String? detailError;

  SupportViewState copyWith({
    List<VendorSupportTicket>? tickets,
    int? selectedTicketId,
    VendorSupportTicketDetail? selectedDetail,
    bool? isLoading,
    bool? isRefreshing,
    bool? isLoadingDetail,
    bool? isSendingNote,
    String? errorMessage,
    String? detailError,
    bool clearError = false,
    bool clearDetailError = false,
    bool clearSelectedDetail = false,
  }) {
    return SupportViewState(
      tickets: tickets ?? this.tickets,
      selectedTicketId: selectedTicketId ?? this.selectedTicketId,
      selectedDetail:
          clearSelectedDetail ? null : selectedDetail ?? this.selectedDetail,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isLoadingDetail: isLoadingDetail ?? this.isLoadingDetail,
      isSendingNote: isSendingNote ?? this.isSendingNote,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      detailError:
          clearDetailError ? null : detailError ?? this.detailError,
    );
  }
}

class SupportViewModel extends ChangeNotifier {
  SupportViewModel({
    required String accessToken,
    SupportRepository repository = const SupportRepository(),
  })  : _accessToken = accessToken,
        _repository = repository;

  final String _accessToken;
  final SupportRepository _repository;
  bool _isDisposed = false;

  SupportViewState _state = const SupportViewState();
  SupportViewState get state => _state;

  Future<void> loadTickets() => _loadTickets(isRefreshing: false);

  Future<void> refresh() => _loadTickets(isRefreshing: true);

  Future<void> openTicket(int ticketId) async {
    _state = _state.copyWith(
      selectedTicketId: ticketId,
      isLoadingDetail: true,
      clearDetailError: true,
      clearSelectedDetail: true,
    );
    _notifyIfActive();

    try {
      final detail = await _repository.getTicketDetail(
        accessToken: _accessToken,
        ticketId: ticketId,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(selectedDetail: detail);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(detailError: error.message);
    } catch (_) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        detailError: 'بارگذاری جزئیات تیکت ناموفق بود.',
      );
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isLoadingDetail: false);
      _notifyIfActive();
    }
  }

  Future<bool> sendNote(String message) async {
    final text = message.trim();
    final ticketId = _state.selectedTicketId;
    if (text.isEmpty || ticketId == null) return false;

    _state = _state.copyWith(isSendingNote: true, clearDetailError: true);
    _notifyIfActive();

    try {
      await _repository.addTicketNote(
        accessToken: _accessToken,
        ticketId: ticketId,
        message: text,
      );
      if (_isDisposed) return false;
      await openTicket(ticketId);
      return true;
    } on AuthApiException catch (error) {
      if (_isDisposed) return false;
      _state = _state.copyWith(detailError: error.message);
      return false;
    } catch (_) {
      if (_isDisposed) return false;
      _state = _state.copyWith(detailError: 'ارسال پیام ناموفق بود.');
      return false;
    } finally {
      if (_isDisposed) return false;
      _state = _state.copyWith(isSendingNote: false);
      _notifyIfActive();
    }
  }

  Future<void> _loadTickets({required bool isRefreshing}) async {
    _state = _state.copyWith(
      isLoading: !isRefreshing && _state.tickets.isEmpty,
      isRefreshing: isRefreshing,
      clearError: true,
    );
    _notifyIfActive();

    try {
      final tickets = await _repository.getTickets(accessToken: _accessToken);
      if (_isDisposed) return;
      _state = _state.copyWith(tickets: tickets);

      if (tickets.isNotEmpty && _state.selectedTicketId == null) {
        await openTicket(tickets.first.id);
      }
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } catch (_) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        errorMessage: 'بارگذاری تیکت‌های پشتیبانی ناموفق بود.',
      );
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
