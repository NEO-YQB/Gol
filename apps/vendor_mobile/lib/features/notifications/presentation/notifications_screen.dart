import 'package:flutter/material.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../domain/vendor_notification.dart';
import 'view_models/notifications_view_model.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    required this.accessToken,
    this.embedded = false,
  });

  final String accessToken;
  final bool embedded;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final NotificationsViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = NotificationsViewModel(accessToken: widget.accessToken);
    _viewModel.loadNotifications();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final body = SafeArea(
      child: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          final state = _viewModel.state;

          if (state.isLoading) {
            return const _NotificationsLoadingView();
          }

          if (state.errorMessage != null) {
            return _NotificationsErrorView(
              message: state.errorMessage!,
              onRetry: _viewModel.refresh,
            );
          }

          final items = state.items;
          final groupedItems = state.groupedItems;

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _viewModel.refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
              children: [
                const AppSectionHeading(
                  eyebrow: 'اعلان‌ها',
                  title: 'مرکز اعلان فروشنده',
                ),
                if (state.isRefreshing) ...[
                  const SizedBox(height: AppSpacing.md),
                  const LinearProgressIndicator(
                    minHeight: 3,
                    color: AppColors.primary,
                    backgroundColor: AppColors.surfaceSoft,
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                _NotificationSummary(items: items),
                const SizedBox(height: AppSpacing.lg),
                if (items.isEmpty)
                  AppGlassCard(
                    child: Text(
                      'هنوز اعلانی برای این حساب ثبت نشده است.',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                    ),
                  )
                else
                  ...groupedItems.entries.map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _NotificationGroup(
                        title: entry.key,
                        items: entry.value,
                      ),
                    ),
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

class _NotificationSummary extends StatelessWidget {
  const _NotificationSummary({
    required this.items,
  });

  final List<VendorNotification> items;

  @override
  Widget build(BuildContext context) {
    final pending =
        items.where((item) => item.status.toUpperCase() == 'PENDING').length;
    final support = items.where((item) => item.topic.contains('support')).length;
    final finance =
        items.where((item) => item.topic.contains('settlement')).length;

    return AppGlassCard(
      child: Row(
        children: [
          Expanded(
            child: _MiniStat(
              label: 'اعلان جدید',
              value: _toPersianDigits(pending),
              accent: AppColors.primary,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: _MiniStat(
              label: 'اعلان پشتیبانی',
              value: _toPersianDigits(support),
              accent: AppColors.secondary,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: _MiniStat(
              label: 'اعلان مالی',
              value: _toPersianDigits(finance),
              accent: AppColors.success,
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({
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

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.item,
  });

  final VendorNotification item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = _topicAccent(item.topic);

    return AppGlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  _topicIcon(item.topic),
                  color: accent,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _topicLabel(item.topic),
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: accent,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _StatusBadge(status: item.status),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            item.body,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (item.orderId != null)
                _InfoChip(label: 'سفارش #${_toPersianDigits(item.orderId!)}'),
              if (item.supportTicketId != null)
                _InfoChip(label: 'تیکت #${_toPersianDigits(item.supportTicketId!)}'),
              _InfoChip(label: _channelLabel(item.channel)),
              _InfoChip(label: _formatDate(item.createdAt)),
            ],
          ),
        ],
      ),
    );
  }
}

class _NotificationGroup extends StatelessWidget {
  const _NotificationGroup({
    required this.title,
    required this.items,
  });

  final String title;
  final List<VendorNotification> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(right: 4, bottom: 10),
          child: Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
        ...items.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _NotificationCard(item: item),
          ),
        ),
      ],
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelMedium?.copyWith(
          color: AppColors.textSecondary,
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.status,
  });

  final String status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = status.toUpperCase() == 'SENT'
        ? AppColors.success
        : status.toUpperCase() == 'FAILED'
            ? AppColors.secondary
            : AppColors.primary;

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

class _NotificationsLoadingView extends StatelessWidget {
  const _NotificationsLoadingView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
      children: const [
        AppGlassCard(
          child: SizedBox(
            height: 240,
            child: Center(
              child: CircularProgressIndicator(),
            ),
          ),
        ),
      ],
    );
  }
}

class _NotificationsErrorView extends StatelessWidget {
  const _NotificationsErrorView({
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
                'خطا در بارگذاری اعلان‌ها',
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

String _topicLabel(String topic) {
  final normalized = topic.toLowerCase();

  if (normalized.contains('support')) return 'پشتیبانی';
  if (normalized.contains('settlement')) return 'تسویه';
  if (normalized.contains('order')) return 'سفارش';
  if (normalized.contains('product')) return 'محصول';
  if (normalized.contains('discount') || normalized.contains('promotion')) {
    return 'تخفیف';
  }

  return 'اعلان سیستم';
}

Color _topicAccent(String topic) {
  final normalized = topic.toLowerCase();

  if (normalized.contains('support')) return AppColors.secondary;
  if (normalized.contains('settlement')) return AppColors.success;
  if (normalized.contains('order')) return AppColors.primary;
  if (normalized.contains('product')) return const Color(0xFF7C5CFC);
  if (normalized.contains('discount') || normalized.contains('promotion')) {
    return const Color(0xFFF59E0B);
  }

  return AppColors.primary;
}

IconData _topicIcon(String topic) {
  final normalized = topic.toLowerCase();

  if (normalized.contains('support')) return Icons.support_agent_rounded;
  if (normalized.contains('settlement')) {
    return Icons.account_balance_wallet_rounded;
  }
  if (normalized.contains('order')) return Icons.receipt_long_rounded;
  if (normalized.contains('product')) return Icons.inventory_2_rounded;
  if (normalized.contains('discount') || normalized.contains('promotion')) {
    return Icons.local_offer_rounded;
  }

  return Icons.notifications_active_rounded;
}

String _channelLabel(String channel) {
  switch (channel.toUpperCase()) {
    case 'IN_APP':
      return 'داخل اپ';
    case 'SMS':
      return 'پیامک';
    case 'EMAIL':
      return 'ایمیل';
    default:
      return channel;
  }
}

String _statusLabel(String status) {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'در انتظار';
    case 'SENT':
      return 'ارسال شده';
    case 'FAILED':
      return 'ناموفق';
    case 'CANCELLED':
      return 'لغو شده';
    default:
      return status;
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
