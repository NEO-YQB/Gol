import 'package:flutter/material.dart';

import '../../auth/data/auth_api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_metric_tile.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../data/dashboard_api_service.dart';
import '../domain/dashboard_summary.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({
    super.key,
    required this.accessToken,
    required this.phoneNumber,
    required this.storeName,
    required this.isPreview,
    required this.onLogout,
  });

  final String accessToken;
  final String phoneNumber;
  final String storeName;
  final bool isPreview;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: FutureBuilder<DashboardSummary>(
              future: DashboardApiService().getSummary(
                accessToken: accessToken,
                fallbackStoreName: storeName,
              ),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const _DashboardLoadingView();
                }

                if (snapshot.hasError) {
                  final error = snapshot.error;
                  final message = error is AuthApiException
                      ? error.message
                      : 'بارگذاری داشبورد ناموفق بود.';

                  return Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'داشبورد فروشنده',
                                style: theme.textTheme.titleMedium,
                              ),
                            ),
                            TextButton(
                              onPressed: () async {
                                await onLogout();
                              },
                              child: const Text('خروج'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        AppGlassCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'خطا در بارگذاری داشبورد',
                                style: theme.textTheme.headlineMedium,
                              ),
                              const SizedBox(height: AppSpacing.md),
                              Text(
                                message,
                                style: theme.textTheme.bodyLarge,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }

                final summary = snapshot.data!;

                final prefersReducedMotion =
                    MediaQuery.maybeOf(context)?.disableAnimations ?? false;

                return ListView(
                  padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                  children: [
                    _DashboardHeader(
                      onLogout: onLogout,
                    ),
                    const SizedBox(height: 18),
                    TweenAnimationBuilder<double>(
                      tween: Tween<double>(begin: 0, end: 1),
                      duration: Duration(
                        milliseconds: prefersReducedMotion ? 0 : 520,
                      ),
                      curve: Curves.easeOutCubic,
                      builder: (context, value, child) {
                        return Opacity(
                          opacity: value,
                          child: Transform.translate(
                            offset: Offset(0, 24 * (1 - value)),
                            child: child,
                          ),
                        );
                      },
                      child: Column(
                        children: [
                          _HeroSummaryCard(
                            summary: summary,
                            phoneNumber: phoneNumber,
                            isPreview: isPreview,
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          _MetricGrid(summary: summary),
                          const SizedBox(height: AppSpacing.lg),
                          _DashboardFocusStrip(summary: summary),
                          const SizedBox(height: AppSpacing.lg),
                          AppGlassCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'وضعیت policy',
                                  style: theme.textTheme.titleLarge,
                                ),
                                const SizedBox(height: AppSpacing.md),
                                Text(
                                  summary.policyNote,
                                  style: theme.textTheme.bodyLarge?.copyWith(
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                if (summary.policyTimeline.isNotEmpty) ...[
                                  const SizedBox(height: AppSpacing.xl),
                                  Text(
                                    'آخرین رویدادهای مهم',
                                    style: theme.textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: AppSpacing.md),
                                  ...summary.policyTimeline.map(
                                    (event) => Padding(
                                      padding: const EdgeInsets.only(bottom: 12),
                                      child: _PolicyTimelineItem(event: event),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _DashboardHeader extends StatelessWidget {
  const _DashboardHeader({
    required this.onLogout,
  });

  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'داشبورد فروشنده',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                'نمای زنده و متمرکز از وضعیت امروز فروشگاه',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        TextButton(
          onPressed: () async {
            await onLogout();
          },
          child: const Text('خروج'),
        ),
      ],
    );
  }
}

class _HeroSummaryCard extends StatelessWidget {
  const _HeroSummaryCard({
    required this.summary,
    required this.phoneNumber,
    required this.isPreview,
  });

  final DashboardSummary summary;
  final String phoneNumber;
  final bool isPreview;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppSectionHeading(
            eyebrow: 'نمای کلی امروز',
            title: 'فروشگاه ${summary.storeName}',
            description:
                'یک خلاصه شفاف، سریع و premium از وضعیت مالی، عملیاتی و سلامت فروشگاه.',
          ),
          if (isPreview) ...[
            const SizedBox(height: AppSpacing.lg),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: AppColors.secondary.withValues(alpha: 0.14),
                ),
              ),
              child: Text(
                'حالت پیش‌نمایش فعال است و داده‌های این صفحه واقعی نیستند.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.secondary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
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
              boxShadow: const [
                BoxShadow(
                  color: Color(0x221F6A52),
                  blurRadius: 26,
                  offset: Offset(0, 16),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'فروشنده فعال',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: Colors.white70,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  phoneNumber,
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  children: [
                    Expanded(
                      child: _HeroDataChip(
                        label: 'قابل برداشت',
                        value: '${_formatMoney(summary.availableBalance)} تومان',
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: _HeroDataChip(
                        label: 'امتیاز سلامت',
                        value: '${summary.healthScore}',
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

class _HeroDataChip extends StatelessWidget {
  const _HeroDataChip({
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

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({
    required this.summary,
  });

  final DashboardSummary summary;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: AppSpacing.lg,
      crossAxisSpacing: AppSpacing.lg,
      childAspectRatio: 1.12,
      children: [
        AppMetricTile(
          title: 'موجودی قابل برداشت',
          value: '${_formatMoney(summary.availableBalance)} تومان',
          subtitle: '${_formatMoney(summary.heldBalance)} تومان نگه‌داری‌شده',
          accentColor: AppColors.primary,
          icon: Icons.account_balance_wallet_rounded,
        ),
        AppMetricTile(
          title: 'تسویه‌های در جریان',
          value: '${summary.processingSettlementsCount} مورد',
          subtitle: '${summary.onHoldSettlementsCount} مورد hold',
          accentColor: AppColors.accent,
          icon: Icons.currency_exchange_rounded,
        ),
        AppMetricTile(
          title: 'تیکت‌های باز',
          value: '${summary.openTicketsCount} مورد',
          subtitle: '${summary.escalatedTicketsCount} ارجاع مالی',
          accentColor: AppColors.secondary,
          icon: Icons.support_agent_rounded,
        ),
        AppMetricTile(
          title: 'امتیاز سلامت',
          value: '${summary.healthScore}',
          subtitle: summary.healthStatus,
          accentColor: AppColors.success,
          icon: Icons.favorite_rounded,
        ),
      ],
    );
  }
}

class _DashboardFocusStrip extends StatelessWidget {
  const _DashboardFocusStrip({
    required this.summary,
  });

  final DashboardSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'فوکوس امروز',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          _FocusRow(
            icon: Icons.bolt_rounded,
            title: 'اولویت عملیاتی',
            value: summary.processingSettlementsCount > 0
                ? 'تسویه‌های در جریان را بررسی کن'
                : 'سفارش‌های جدید را بدون تاخیر مدیریت کن',
          ),
          const SizedBox(height: AppSpacing.md),
          _FocusRow(
            icon: Icons.shield_rounded,
            title: 'وضعیت سلامت',
            value: _healthMessage(summary.healthStatus, summary.healthScore),
          ),
        ],
      ),
    );
  }
}

class _FocusRow extends StatelessWidget {
  const _FocusRow({
    required this.icon,
    required this.title,
    required this.value,
  });

  final IconData icon;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: AppColors.surfaceSoft,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(
            icon,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: theme.textTheme.bodyLarge,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PolicyTimelineItem extends StatelessWidget {
  const _PolicyTimelineItem({
    required this.event,
  });

  final DashboardPolicyEvent event;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 12,
            height: 12,
            margin: const EdgeInsets.only(top: 6),
            decoration: BoxDecoration(
              color: _timelineAccent(event.aggregateType),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _timelineLabel(event.aggregateType),
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  event.summary,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                if (event.createdAt != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    _formatDateTime(event.createdAt!),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
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

  return buffer.toString();
}

String _healthMessage(String status, num score) {
  switch (status.toUpperCase()) {
    case 'GOOD':
      return 'وضعیت فروشگاه خوب است و امتیاز سلامت روی $score قرار دارد.';
    case 'WARNING':
      return 'وضعیت سلامت نیاز به توجه دارد و بهتر است عملکرد اخیر بررسی شود.';
    case 'CRITICAL':
      return 'وضعیت سلامت بحرانی است و باید سریع‌تر مشکلات عملیاتی بررسی شوند.';
    default:
      return 'آخرین وضعیت سلامت فروشگاه ثبت شده و آماده بررسی است.';
  }
}

String _timelineLabel(String aggregateType) {
  switch (aggregateType) {
    case 'admin-alert':
      return 'هشدار مدیریتی';
    case 'review':
      return 'بازبینی';
    default:
      return 'رویداد جدید';
  }
}

Color _timelineAccent(String aggregateType) {
  switch (aggregateType) {
    case 'admin-alert':
      return AppColors.secondary;
    case 'review':
      return AppColors.accent;
    default:
      return AppColors.primary;
  }
}

String _formatDateTime(DateTime dateTime) {
  final local = dateTime.toLocal();
  final hh = local.hour.toString().padLeft(2, '0');
  final mm = local.minute.toString().padLeft(2, '0');
  final yyyy = local.year.toString().padLeft(4, '0');
  final month = local.month.toString().padLeft(2, '0');
  final day = local.day.toString().padLeft(2, '0');

  return '$yyyy/$month/$day - $hh:$mm';
}

class _DashboardLoadingView extends StatelessWidget {
  const _DashboardLoadingView();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'داشبورد فروشنده',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 18),
          const AppGlassCard(
            child: SizedBox(
              height: 200,
              child: Center(
                child: CircularProgressIndicator(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
