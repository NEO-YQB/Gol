import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

class StoreSuspensionDialog extends StatelessWidget {
  const StoreSuspensionDialog({super.key, this.reason});

  final String? reason;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final suspensionReason = reason?.trim() ?? '';

    return Directionality(
      textDirection: TextDirection.rtl,
      child: AlertDialog(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        scrollable: true,
        titlePadding: const EdgeInsets.fromLTRB(24, 16, 16, 0),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(
                    Icons.storefront_outlined,
                    color: AppColors.danger,
                    size: 28,
                  ),
                ),
                const Spacer(),
                IconButton(
                  tooltip: 'بستن پیام',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  color: AppColors.textSecondary,
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              'فروشگاه شما غیرفعال شده است',
              style: theme.textTheme.titleLarge,
            ),
          ],
        ),
        contentPadding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'مدیریت، دسترسی فروش فروشگاه شما را متوقف کرده است. '
              'تا زمان فعال‌سازی مجدد، محصولات و صفحه فروشگاه برای مشتریان '
              'نمایش داده نمی‌شوند و ویرایش محصولات، تخفیف‌ها و پروفایل '
              'فروشگاه در دسترس نیست.',
              style: TextStyle(color: AppColors.textSecondary, height: 1.8),
            ),
            if (suspensionReason.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors.danger.withValues(alpha: 0.18),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'دلیل اعلام‌شده توسط مدیریت',
                      style: TextStyle(
                        color: AppColors.danger,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      suspensionReason,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        height: 1.7,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            const Text(
              'رسیدگی به سفارش‌های جاری، امور مالی و ارتباط با پشتیبانی '
              'همچنان در دسترس شماست.',
              style: TextStyle(
                color: AppColors.primaryDark,
                height: 1.8,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.all(24),
        actions: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('متوجه شدم'),
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: () => Navigator.of(context).pop(true),
                icon: const Icon(Icons.support_agent_rounded),
                label: const Text('پیگیری از پشتیبانی'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
