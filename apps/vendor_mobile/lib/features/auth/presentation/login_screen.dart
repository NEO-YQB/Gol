import 'package:flutter/material.dart';

import '../../../core/config/app_config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.onSubmitPhone,
    this.isLoading = false,
    this.errorMessage,
  });

  final Future<void> Function(String phoneNumber) onSubmitPhone;
  final bool isLoading;
  final String? errorMessage;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          gradient: const LinearGradient(
                            colors: [
                              AppColors.primary,
                              AppColors.secondary,
                            ],
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x221F6A52),
                              blurRadius: 24,
                              offset: Offset(0, 12),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.local_florist_rounded,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Text(
                          'Golino Seller',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 36),
                  const AppSectionHeading(
                    eyebrow: 'ورود سریع و امن',
                    title: 'فروشگاهت را\nبا یک تجربه لوکس مدیریت کن',
                    description:
                        'برای ورود، فقط شماره موبایل فروشنده را وارد کن. کد تایید خیلی سریع ارسال می‌شود.',
                  ),
                  const SizedBox(height: 28),
                  const AppGlassCard(
                    child: _LoginFeatureStrip(),
                  ),
                  const SizedBox(height: 22),
                  AppGlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'شماره موبایل',
                          style: theme.textTheme.titleMedium,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        TextField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          enabled: !widget.isLoading,
                          decoration: const InputDecoration(
                            labelText: 'شماره موبایل فروشنده',
                            hintText: 'مثلاً 09121234567',
                          ),
                        ),
                        if (widget.errorMessage != null) ...[
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            widget.errorMessage!,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        const SizedBox(height: AppSpacing.lg),
                        FilledButton(
                          onPressed: widget.isLoading
                              ? null
                              : () async {
                                  final phoneNumber = _phoneController.text.trim();
                                  if (phoneNumber.isEmpty) return;
                                  await widget.onSubmitPhone(phoneNumber);
                                },
                          child: Text(
                            widget.isLoading
                                ? 'در حال ارسال کد...'
                                : 'ادامه و دریافت کد',
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'تجربه نسخه اول بر پایه سرعت، سادگی و حس premium طراحی می‌شود.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      if (AppConfig.enableDevOtpBypass) ...[
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'حالت تست فعال است: برای ورود می‌توانی در مرحله بعد کد 12345 را وارد کنی و پیامک واقعی ارسال نمی‌شود.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: AppColors.secondary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoginFeatureStrip extends StatelessWidget {
  const _LoginFeatureStrip();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Widget item(IconData icon, String label) {
      return Expanded(
        child: Column(
          children: [
            Icon(
              icon,
              color: AppColors.primary,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              label,
              textAlign: TextAlign.center,
              style: theme.textTheme.labelMedium,
            ),
          ],
        ),
      );
    }

    return Row(
      children: [
        item(Icons.bolt_rounded, 'ورود سریع'),
        item(Icons.shield_rounded, 'نشست امن'),
        item(Icons.auto_graph_rounded, 'کنترل فروشگاه'),
      ],
    );
  }
}
