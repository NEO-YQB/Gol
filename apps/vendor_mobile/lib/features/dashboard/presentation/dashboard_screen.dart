import 'package:flutter/material.dart';

import '../../auth/data/auth_api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_metric_tile.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../orders/presentation/orders_screen.dart';
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

                return ListView(
                  padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                  children: [
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
                          AppSectionHeading(
                            eyebrow: 'نمای کلی امروز',
                            title: 'فروشگاه ${summary.storeName}',
                            description:
                                'یک خلاصه شفاف و premium از وضعیت مالی، عملیاتی و سلامت فروشگاه.',
                          ),
                          if (isPreview) ...[
                            const SizedBox(height: AppSpacing.lg),
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.secondary.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(18),
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
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(22),
                              gradient: const LinearGradient(
                                colors: [
                                  AppColors.primary,
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
                                  style: theme.textTheme.labelMedium?.copyWith(
                                    color: Colors.white70,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  phoneNumber,
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppMetricTile(
                      title: 'موجودی قابل برداشت',
                      value: '${summary.availableBalance} تومان',
                      subtitle: '${summary.heldBalance} تومان نگه‌داری‌شده',
                      accentColor: AppColors.primary,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppMetricTile(
                      title: 'تسویه‌های در جریان',
                      value: '${summary.processingSettlementsCount} مورد',
                      subtitle: '${summary.onHoldSettlementsCount} مورد hold',
                      accentColor: AppColors.accent,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppMetricTile(
                      title: 'تیکت‌های باز',
                      value: '${summary.openTicketsCount} مورد',
                      subtitle: '${summary.escalatedTicketsCount} ارجاع مالی',
                      accentColor: AppColors.secondary,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppMetricTile(
                      title: 'امتیاز سلامت',
                      value: '${summary.healthScore}',
                      subtitle: summary.healthStatus,
                      accentColor: AppColors.success,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppGlassCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'وضعیت policy',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            summary.policyNote,
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: AppColors.textSecondary,
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
