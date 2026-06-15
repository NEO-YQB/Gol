import 'package:flutter/material.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../data/wallet_api_service.dart';
import '../domain/vendor_wallet_summary.dart';

enum WalletPeriod {
  today('today', 'امروز'),
  week('week', 'هفته'),
  month('month', 'ماه'),
  year('year', 'سال');

  const WalletPeriod(this.apiValue, this.label);

  final String apiValue;
  final String label;
}

class WalletScreen extends StatefulWidget {
  const WalletScreen({
    super.key,
    required this.accessToken,
    this.embedded = false,
  });

  final String accessToken;
  final bool embedded;

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final WalletApiService _apiService = const WalletApiService();
  WalletPeriod _period = WalletPeriod.month;
  late Future<VendorWalletSummary> _future;

  @override
  void initState() {
    super.initState();
    _future = _loadSummary();
  }

  Future<VendorWalletSummary> _loadSummary() {
    return _apiService.getSummary(
      accessToken: widget.accessToken,
      period: _period.apiValue,
    );
  }

  Future<void> _refresh() async {
    final next = _loadSummary();
    setState(() {
      _future = next;
    });
    await next;
  }

  @override
  Widget build(BuildContext context) {
    final content = SafeArea(
      child: FutureBuilder<VendorWalletSummary>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const _WalletLoadingView();
          }

          if (snapshot.hasError) {
            final error = snapshot.error;
            final message = error is AuthApiException
                ? error.message
                : 'بارگذاری کیف پول و تسویه ناموفق بود.';

            return _WalletErrorView(
              message: message,
              onRetry: _refresh,
            );
          }

          final summary = snapshot.data!;

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
              children: [
                AppSectionHeading(
                  eyebrow: 'مالی و تسویه',
                  title: 'کیف پول فروشگاه',
                  description: 'موجودی، گردش مالی و وضعیت settlementها را یکجا ببین.',
                ),
                const SizedBox(height: AppSpacing.lg),
                _PeriodSelector(
                  selected: _period,
                  onChanged: (period) {
                    setState(() {
                      _period = period;
                      _future = _loadSummary();
                    });
                  },
                ),
                const SizedBox(height: AppSpacing.lg),
                _WalletHeroCard(summary: summary),
                const SizedBox(height: AppSpacing.lg),
                _ActivityOverview(summary: summary),
                const SizedBox(height: AppSpacing.lg),
                _SettlementOverview(summary: summary),
                const SizedBox(height: AppSpacing.lg),
                _TransactionList(items: summary.recentTransactions),
                const SizedBox(height: AppSpacing.lg),
                _SettlementList(items: summary.recentSettlements),
              ],
            ),
          );
        },
      ),
    );

    if (widget.embedded) {
      return AppShellBackground(child: content);
    }

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: content,
        ),
      ),
    );
  }
}

class _WalletHeroCard extends StatelessWidget {
  const _WalletHeroCard({
    required this.summary,
  });

  final VendorWalletSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'بازه گزارش',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${summary.fromDateJalali} تا ${summary.toDateJalali}',
                      style: theme.textTheme.titleMedium,
                    ),
                  ],
                ),
              ),
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                    colors: [
                      AppColors.primarySoft,
                      AppColors.primaryDark,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(
                  Icons.account_balance_wallet_rounded,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(26),
              gradient: const LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: [
                  AppColors.primarySoft,
                  AppColors.primaryDark,
                ],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'موجودی قابل برداشت',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: Colors.white70,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  '${_formatMoney(summary.availableBalance)} تومان',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  children: [
                    Expanded(
                      child: _HeroInfoPill(
                        label: 'موجودی کل',
                        value: '${_formatMoney(summary.currentBalance)} تومان',
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: _HeroInfoPill(
                        label: 'نگه‌داری‌شده',
                        value: '${_formatMoney(summary.heldBalance)} تومان',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroInfoPill extends StatelessWidget {
  const _HeroInfoPill({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.10),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _PeriodSelector extends StatelessWidget {
  const _PeriodSelector({
    required this.selected,
    required this.onChanged,
  });

  final WalletPeriod selected;
  final ValueChanged<WalletPeriod> onChanged;

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: SegmentedButton<WalletPeriod>(
        showSelectedIcon: false,
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.primary.withValues(alpha: 0.14);
            }
            return AppColors.surface.withValues(alpha: 0.82);
          }),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.primaryDark;
            }
            return AppColors.textSecondary;
          }),
          side: WidgetStateProperty.all(
            const BorderSide(color: AppColors.border),
          ),
          padding: WidgetStateProperty.all(
            const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          ),
        ),
        segments: WalletPeriod.values
            .map(
              (period) => ButtonSegment<WalletPeriod>(
                value: period,
                label: Text(period.label),
              ),
            )
            .toList(),
        selected: {selected},
        onSelectionChanged: (selection) {
          if (selection.isNotEmpty) {
            onChanged(selection.first);
          }
        },
      ),
    );
  }
}

class _ActivityOverview extends StatelessWidget {
  const _ActivityOverview({
    required this.summary,
  });

  final VendorWalletSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'گردش مالی',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                child: _StatBox(
                  label: 'تعداد تراکنش',
                  value: '${summary.transactionCount}',
                  accent: AppColors.accent,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _StatBox(
                  label: 'ورودی',
                  value: '${_formatMoney(summary.creditAmount)} تومان',
                  accent: AppColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _StatBox(
            label: 'خروجی',
            value: '${_formatMoney(summary.debitAmount)} تومان',
            accent: AppColors.secondary,
          ),
        ],
      ),
    );
  }
}

class _SettlementOverview extends StatelessWidget {
  const _SettlementOverview({
    required this.summary,
  });

  final VendorWalletSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'وضعیت تسویه‌ها',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.md,
            children: [
              _MiniChip(label: 'در انتظار', value: summary.pendingSettlementsCount),
              _MiniChip(label: 'قابل آزادسازی', value: summary.eligibleSettlementsCount),
              _MiniChip(label: 'در حال پردازش', value: summary.processingSettlementsCount),
              _MiniChip(label: 'تسویه شده', value: summary.settledSettlementsCount),
              _MiniChip(label: 'نگه‌داری‌شده', value: summary.onHoldSettlementsCount),
              _MiniChip(label: 'برگشت خورده', value: summary.reversedSettlementsCount),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                child: _StatBox(
                  label: 'سهم فروشنده',
                  value: '${_formatMoney(summary.vendorShareTotal)} تومان',
                  accent: AppColors.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _StatBox(
                  label: 'قابل آزادسازی',
                  value: '${_formatMoney(summary.releasableEstimate)} تومان',
                  accent: AppColors.accent,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({
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
        color: AppColors.surfaceMuted.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: accent.withValues(alpha: 0.12),
        ),
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
            style: theme.textTheme.titleMedium?.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  const _MiniChip({
    required this.label,
    required this.value,
  });

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.86),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _toPersianDigits(value),
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: theme.textTheme.labelLarge?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _TransactionList extends StatelessWidget {
  const _TransactionList({
    required this.items,
  });

  final List<VendorWalletTransaction> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'تراکنش‌های اخیر',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.lg),
          if (items.isEmpty)
            Text(
              'هنوز تراکنشی برای این بازه ثبت نشده است.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            )
          else
            ...items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _TransactionTile(item: item),
              ),
            ),
        ],
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({
    required this.item,
  });

  final VendorWalletTransaction item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final positive = item.direction.toUpperCase() == 'CREDIT';
    final accent = positive ? AppColors.success : AppColors.secondary;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
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
              positive
                  ? Icons.south_west_rounded
                  : Icons.north_east_rounded,
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
                if (item.description != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    item.description!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  _formatDateTime(item.createdAt),
                  style: theme.textTheme.labelSmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Text(
            '${positive ? '+' : '-'}${_formatMoney(item.amount)}',
            style: theme.textTheme.titleMedium?.copyWith(
              color: accent,
            ),
          ),
        ],
      ),
    );
  }
}

class _SettlementList extends StatelessWidget {
  const _SettlementList({
    required this.items,
  });

  final List<VendorSettlementOrder> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'آخرین تسویه‌ها',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.lg),
          if (items.isEmpty)
            Text(
              'برای این بازه settlementی ثبت نشده است.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            )
          else
            ...items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _SettlementTile(item: item),
              ),
            ),
        ],
      ),
    );
  }
}

class _SettlementTile extends StatelessWidget {
  const _SettlementTile({
    required this.item,
  });

  final VendorSettlementOrder item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'سفارش #${_toPersianDigits(item.id)}',
                  style: theme.textTheme.titleMedium,
                ),
              ),
              _StatusBadge(status: item.settlementStatus),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'سهم فروشنده: ${_formatMoney(item.vendorShareAmount)} تومان',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'آزاد شده: ${_formatMoney(item.settlementReleasedAmount)} تومان',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          if (item.settlementEligibleAt != null) ...[
            const SizedBox(height: 6),
            Text(
              'قابل آزادسازی: ${_formatDateTime(item.settlementEligibleAt)}',
              style: theme.textTheme.labelSmall,
            ),
          ],
        ],
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
    final accent = _settlementAccent(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        _settlementLabel(status),
        style: theme.textTheme.labelMedium?.copyWith(
          color: accent,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _WalletLoadingView extends StatelessWidget {
  const _WalletLoadingView();

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

class _WalletErrorView extends StatelessWidget {
  const _WalletErrorView({
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
                'خطا در بارگذاری کیف پول',
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

String _formatMoney(num value) {
  final raw = value.toStringAsFixed(value % 1 == 0 ? 0 : 1);
  final parts = raw.split('.');
  final digits = parts.first;
  final buffer = StringBuffer();

  for (var index = 0; index < digits.length; index++) {
    final reversedIndex = digits.length - index;
    buffer.write(digits[index]);
    if (reversedIndex > 1 && reversedIndex % 3 == 1) {
      buffer.write(',');
    }
  }

  if (parts.length > 1 && parts[1] != '0') {
    buffer.write('.${parts[1]}');
  }

  return _toPersianDigits(buffer.toString());
}

String _formatDateTime(DateTime? dateTime) {
  if (dateTime == null) {
    return 'بدون تاریخ';
  }

  final local = dateTime.toLocal();
  final jalali = Jalali.fromDateTime(local);
  final hh = local.hour.toString().padLeft(2, '0');
  final mm = local.minute.toString().padLeft(2, '0');

  return '${_toPersianDigits(jalali.formatCompactDate())} - ${_toPersianDigits('$hh:$mm')}';
}

String _settlementLabel(String status) {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'در انتظار';
    case 'ELIGIBLE':
      return 'قابل آزادسازی';
    case 'PROCESSING':
      return 'در حال پردازش';
    case 'SETTLED':
      return 'تسویه شده';
    case 'ON_HOLD':
      return 'نگه‌داری‌شده';
    case 'REVERSED':
      return 'برگشت خورده';
    default:
      return status;
  }
}

Color _settlementAccent(String status) {
  switch (status.toUpperCase()) {
    case 'SETTLED':
      return AppColors.success;
    case 'ON_HOLD':
      return AppColors.warning;
    case 'REVERSED':
      return AppColors.secondary;
    case 'ELIGIBLE':
      return AppColors.primary;
    case 'PROCESSING':
      return AppColors.accent;
    default:
      return AppColors.textSecondary;
  }
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
