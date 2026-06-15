import 'package:flutter/material.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../data/support_api_service.dart';
import '../domain/vendor_support_ticket.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({
    super.key,
    required this.accessToken,
    this.embedded = false,
  });

  final String accessToken;
  final bool embedded;

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final SupportApiService _apiService = const SupportApiService();
  late Future<List<VendorSupportTicket>> _future;
  int? _selectedTicketId;
  VendorSupportTicketDetail? _selectedDetail;
  bool _loadingDetail = false;
  bool _sendingNote = false;
  String? _detailError;
  final TextEditingController _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _future = _loadTickets();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<List<VendorSupportTicket>> _loadTickets() {
    return _apiService.getTickets(accessToken: widget.accessToken);
  }

  Future<void> _refresh() async {
    final next = _loadTickets();
    setState(() {
      _future = next;
    });
    await next;
  }

  Future<void> _openTicket(int ticketId) async {
    setState(() {
      _selectedTicketId = ticketId;
      _loadingDetail = true;
      _detailError = null;
    });

    try {
      final detail = await _apiService.getTicketDetail(
        accessToken: widget.accessToken,
        ticketId: ticketId,
      );

      if (!mounted) return;
      setState(() {
        _selectedDetail = detail;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _detailError = error is AuthApiException
            ? error.message
            : 'بارگذاری جزئیات تیکت ناموفق بود.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingDetail = false;
        });
      }
    }
  }

  Future<void> _sendNote() async {
    final message = _noteController.text.trim();
    if (message.isEmpty || _selectedTicketId == null) return;

    setState(() {
      _sendingNote = true;
    });

    try {
      await _apiService.addTicketNote(
        accessToken: widget.accessToken,
        ticketId: _selectedTicketId!,
        message: message,
      );
      _noteController.clear();
      await _openTicket(_selectedTicketId!);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('پیام با موفقیت ثبت شد.'),
          ),
        );
      }
    } catch (error) {
      if (!mounted) return;
      final message = error is AuthApiException
          ? error.message
          : 'ارسال پیام ناموفق بود.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    } finally {
      if (mounted) {
        setState(() {
          _sendingNote = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = SafeArea(
      child: FutureBuilder<List<VendorSupportTicket>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const _SupportLoadingView();
          }

          if (snapshot.hasError) {
            final error = snapshot.error;
            final message = error is AuthApiException
                ? error.message
                : 'بارگذاری تیکت‌های پشتیبانی ناموفق بود.';
            return _SupportErrorView(
              message: message,
              onRetry: _refresh,
            );
          }

          final tickets = snapshot.data ?? const <VendorSupportTicket>[];

          if (tickets.isNotEmpty &&
              _selectedTicketId == null &&
              _selectedDetail == null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _openTicket(tickets.first.id);
            });
          }

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
              children: [
                const AppSectionHeading(
                  eyebrow: 'پشتیبانی',
                  title: 'تیکت‌های فروشگاه',
                  description: 'پیگیری پرونده‌ها و پاسخ به درخواست‌های مشتری از یک فضای متمرکز.',
                ),
                const SizedBox(height: AppSpacing.lg),
                _SupportSummary(tickets: tickets),
                const SizedBox(height: AppSpacing.lg),
                ...tickets.map(
                  (ticket) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _SupportTicketCard(
                      ticket: ticket,
                      selected: ticket.id == _selectedTicketId,
                      onTap: () => _openTicket(ticket.id),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                _SupportDetailCard(
                  detail: _selectedDetail,
                  loading: _loadingDetail,
                  error: _detailError,
                  noteController: _noteController,
                  sendingNote: _sendingNote,
                  onSendNote: _sendNote,
                ),
              ],
            ),
          );
        },
      ),
    );

    if (widget.embedded) {
      return AppShellBackground(child: body);
    }

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(child: body),
      ),
    );
  }
}

class _SupportSummary extends StatelessWidget {
  const _SupportSummary({
    required this.tickets,
  });

  final List<VendorSupportTicket> tickets;

  @override
  Widget build(BuildContext context) {
    final openCount = tickets
        .where(
          (item) => !['RESOLVED', 'REJECTED', 'CANCELLED']
              .contains(item.status.toUpperCase()),
        )
        .length;
    final financeCount = tickets
        .where(
          (item) => item.status.toUpperCase() == 'ESCALATED_TO_FINANCE',
        )
        .length;

    return AppGlassCard(
      child: Row(
        children: [
          Expanded(
            child: _SupportStat(
              label: 'تیکت فعال',
              value: _toPersianDigits(openCount),
              accent: AppColors.primary,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: _SupportStat(
              label: 'ارجاع مالی',
              value: _toPersianDigits(financeCount),
              accent: AppColors.secondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _SupportStat extends StatelessWidget {
  const _SupportStat({
    required this.label,
    required this.value,
    required this.accent,
  });

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accent.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.labelLarge?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: theme.textTheme.headlineMedium,
          ),
        ],
      ),
    );
  }
}

class _SupportTicketCard extends StatelessWidget {
  const _SupportTicketCard({
    required this.ticket,
    required this.selected,
    required this.onTap,
  });

  final VendorSupportTicket ticket;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.20)
              : Colors.transparent,
        ),
      ),
      child: AppGlassCard(
        padding: const EdgeInsets.all(16),
        backgroundColor: selected ? AppColors.surface : AppColors.surfaceSoft,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      ticket.title,
                      style: theme.textTheme.titleMedium,
                    ),
                  ),
                  _SupportStatusBadge(status: ticket.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _reasonLabel(ticket.reason),
                style: theme.textTheme.labelLarge?.copyWith(
                  color: AppColors.secondary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'سفارش #${ticket.orderId == null ? '—' : _toPersianDigits(ticket.orderId!)}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${ticket.customerName} • ${ticket.customerPhone}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              if (ticket.latestOperationalFlags.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: ticket.latestOperationalFlags
                      .map(
                        (flag) => _FlagBadge(flag: flag),
                      )
                      .toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _SupportDetailCard extends StatelessWidget {
  const _SupportDetailCard({
    required this.detail,
    required this.loading,
    required this.error,
    required this.noteController,
    required this.sendingNote,
    required this.onSendNote,
  });

  final VendorSupportTicketDetail? detail;
  final bool loading;
  final String? error;
  final TextEditingController noteController;
  final bool sendingNote;
  final Future<void> Function() onSendNote;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'جزئیات تیکت',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.lg),
          if (loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: CircularProgressIndicator(),
              ),
            )
          else if (error != null)
            Text(
              error!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.secondary,
              ),
            )
          else if (detail == null)
            Text(
              'یک تیکت را برای مشاهده جزئیات انتخاب کن.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            )
          else ...[
            Text(
              detail!.title,
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(
              _reasonLabel(detail!.reason),
              style: theme.textTheme.labelLarge?.copyWith(
                color: AppColors.secondary,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              detail!.description,
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: AppSpacing.lg),
            ...detail!.timeline.map(
              (message) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _TimelineMessage(message: message),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            TextField(
              controller: noteController,
              minLines: 3,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'پاسخ فروشگاه',
                hintText: 'پیام خودت را برای پیگیری این تیکت بنویس',
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            FilledButton(
              onPressed: sendingNote
                  ? null
                  : () async {
                      await onSendNote();
                    },
              child: Text(
                sendingNote ? 'در حال ارسال...' : 'ارسال پیام',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TimelineMessage extends StatelessWidget {
  const _TimelineMessage({
    required this.message,
  });

  final VendorSupportTicketMessage message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = _actorAccent(message.actorType);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted.withValues(alpha: 0.84),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _actorIcon(message.actorType),
                  color: accent,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _actorLabel(message.actorType),
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Text(
                _formatDate(message.createdAt),
                style: theme.textTheme.labelSmall,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            message.message,
            style: theme.textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _SupportStatusBadge extends StatelessWidget {
  const _SupportStatusBadge({
    required this.status,
  });

  final String status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = _statusAccent(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        _statusLabel(status),
        style: theme.textTheme.labelMedium?.copyWith(
          color: accent,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _FlagBadge extends StatelessWidget {
  const _FlagBadge({
    required this.flag,
  });

  final String flag;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.accent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        _flagLabel(flag),
        style: theme.textTheme.labelMedium?.copyWith(
          color: AppColors.warning,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _SupportLoadingView extends StatelessWidget {
  const _SupportLoadingView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
      children: const [
        AppGlassCard(
          child: SizedBox(
            height: 280,
            child: Center(
              child: CircularProgressIndicator(),
            ),
          ),
        ),
      ],
    );
  }
}

class _SupportErrorView extends StatelessWidget {
  const _SupportErrorView({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
      children: [
        AppGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'خطا در بارگذاری پشتیبانی',
                style: theme.textTheme.titleLarge,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                message,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: () async {
                  await onRetry();
                },
                child: const Text('تلاش دوباره'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

String _statusLabel(String status) {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return 'باز';
    case 'IN_REVIEW':
      return 'در حال بررسی';
    case 'WAITING_CUSTOMER':
      return 'منتظر مشتری';
    case 'WAITING_VENDOR':
      return 'منتظر فروشگاه';
    case 'ESCALATED_TO_FINANCE':
      return 'ارجاع مالی';
    case 'RESOLVED':
      return 'حل شده';
    case 'REJECTED':
      return 'رد شده';
    case 'CANCELLED':
      return 'لغو شده';
    default:
      return status;
  }
}

Color _statusAccent(String status) {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return AppColors.primary;
    case 'IN_REVIEW':
      return AppColors.accent;
    case 'WAITING_CUSTOMER':
      return AppColors.warning;
    case 'WAITING_VENDOR':
      return AppColors.secondary;
    case 'ESCALATED_TO_FINANCE':
      return AppColors.danger;
    case 'RESOLVED':
      return AppColors.success;
    default:
      return AppColors.textSecondary;
  }
}

String _reasonLabel(String reason) {
  switch (reason.toUpperCase()) {
    case 'DAMAGED_FLOWERS':
      return 'آسیب‌دیدگی گل‌ها';
    case 'REFUND_REQUEST':
      return 'درخواست بازگشت وجه';
    case 'QUALITY_ISSUE':
      return 'ایراد کیفی';
    default:
      return 'موضوع پشتیبانی';
  }
}

String _flagLabel(String flag) {
  switch (flag.toUpperCase()) {
    case 'FOLLOW_UP_REQUIRED':
      return 'نیازمند پیگیری';
    case 'FINANCE_REVIEW_PENDING':
      return 'در انتظار بررسی مالی';
    default:
      return flag;
  }
}

String _actorLabel(String actorType) {
  switch (actorType.toUpperCase()) {
    case 'ADMIN':
      return 'پشتیبانی';
    case 'VENDOR':
      return 'فروشگاه';
    case 'CUSTOMER':
      return 'مشتری';
    case 'FINANCE':
      return 'مالی';
    default:
      return actorType;
  }
}

IconData _actorIcon(String actorType) {
  switch (actorType.toUpperCase()) {
    case 'ADMIN':
      return Icons.support_agent_rounded;
    case 'VENDOR':
      return Icons.storefront_rounded;
    case 'CUSTOMER':
      return Icons.person_rounded;
    case 'FINANCE':
      return Icons.account_balance_wallet_rounded;
    default:
      return Icons.chat_bubble_outline_rounded;
  }
}

Color _actorAccent(String actorType) {
  switch (actorType.toUpperCase()) {
    case 'ADMIN':
      return AppColors.primary;
    case 'VENDOR':
      return AppColors.secondary;
    case 'FINANCE':
      return AppColors.warning;
    default:
      return AppColors.accent;
  }
}

String _formatDate(DateTime? dateTime) {
  if (dateTime == null) {
    return 'بدون تاریخ';
  }

  final local = dateTime.toLocal();
  final jalali = Jalali.fromDateTime(local);
  final hh = local.hour.toString().padLeft(2, '0');
  final mm = local.minute.toString().padLeft(2, '0');

  return '${_toPersianDigits(jalali.formatCompactDate())} - ${_toPersianDigits('$hh:$mm')}';
}

String _toPersianDigits(Object value) {
  const english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  var output = value.toString();
  for (var i = 0; i < english.length; i++) {
    output = output.replaceAll(english[i], persian[i]);
  }
  return output;
}
