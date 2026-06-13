import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/config/app_config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';

class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({
    super.key,
    required this.phoneNumber,
    required this.onBack,
    required this.onVerify,
    this.isLoading = false,
    this.errorMessage,
  });

  final String phoneNumber;
  final VoidCallback onBack;
  final Future<void> Function(String code) onVerify;
  final bool isLoading;
  final String? errorMessage;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _codeController = TextEditingController();
  bool _didAutoSubmit = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submitIfComplete(String value) async {
    final code = value.trim();
    if (code.length != 5 || widget.isLoading || _didAutoSubmit) return;

    _didAutoSubmit = true;
    await widget.onVerify(code);
    if (mounted) {
      _didAutoSubmit = false;
    }
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
                  Align(
                    alignment: Alignment.centerRight,
                    child: IconButton(
                      onPressed: widget.onBack,
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.surface.withValues(alpha: 0.85),
                      ),
                      icon: const Icon(Icons.arrow_back),
                    ),
                  ),
                  const SizedBox(height: 12),
                  AppSectionHeading(
                    eyebrow: 'تایید هوشمند',
                    title: 'کد ۵ رقمی را وارد کن',
                    description:
                        'کد ارسال‌شده به ${widget.phoneNumber} را وارد کن. اگر auto fill فعال باشد، ورود خودکار انجام می‌شود.',
                  ),
                  const SizedBox(height: 28),
                  AppGlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'کد تایید',
                          style: theme.textTheme.titleMedium,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        TextField(
                          controller: _codeController,
                          keyboardType: TextInputType.number,
                          autofillHints: const [AutofillHints.oneTimeCode],
                          maxLength: 5,
                          enabled: !widget.isLoading,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            letterSpacing: 6,
                          ),
                          textAlign: TextAlign.center,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(5),
                          ],
                          onChanged: (value) async {
                            await _submitIfComplete(value);
                          },
                          decoration: const InputDecoration(
                            labelText: 'کد ۵ رقمی',
                            hintText: '12345',
                            counterText: '',
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
                        const SizedBox(height: AppSpacing.md),
                        Row(
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: widget.isLoading
                                    ? AppColors.accent
                                    : AppColors.success,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                widget.isLoading
                                    ? 'در حال بررسی کد و ورود...'
                                    : 'به‌محض کامل شدن کد، ورود خودکار انجام می‌شود.',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
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
