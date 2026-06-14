import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../data/vendor_discounts_api_service.dart';
import '../domain/vendor_discount.dart';
import 'discount_workspace_screen.dart';

class DiscountsScreen extends StatefulWidget {
  const DiscountsScreen({
    super.key,
    required this.accessToken,
    required this.storeId,
  });

  final String accessToken;
  final int storeId;

  @override
  State<DiscountsScreen> createState() => _DiscountsScreenState();
}

class _DiscountsScreenState extends State<DiscountsScreen> {
  final _apiService = const VendorDiscountsApiService();

  VendorDiscountListResponse? _response;
  bool _isLoading = true;
  String? _errorMessage;
  String _filter = 'ALL';

  Future<void> _loadDiscounts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _apiService.getDiscounts(
        accessToken: widget.accessToken,
        storeId: widget.storeId,
        isActive: _filter == 'ALL' ? null : _filter == 'ACTIVE',
      );

      if (!mounted) return;
      setState(() {
        _response = response;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _loadDiscounts();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final items = _response?.items ?? const <VendorDiscount>[];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 18, 24, 120),
              children: [
                Text(
                  'تخفیف‌ها',
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: AppSpacing.lg),
                const AppSectionHeading(
                  eyebrow: 'فروش هوشمند',
                  title: 'تخفیف‌ها را سبک، شفاف و حرفه‌ای مدیریت کن',
                  description:
                      'تمرکز این بخش روی تخفیف‌های محصولی فروشنده است؛ سریع ببین، ویرایش کن و کمپین بعدی را آماده کن.',
                ),
                const SizedBox(height: AppSpacing.lg),
                AppGlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: () async {
                            final changed = await Navigator.of(context).push<bool>(
                              MaterialPageRoute(
                                builder: (_) => DiscountWorkspaceScreen(
                                  accessToken: widget.accessToken,
                                  storeId: widget.storeId,
                                ),
                              ),
                            );
                            if (changed == true) {
                              _loadDiscounts();
                            }
                          },
                          icon: const Icon(Icons.add_rounded),
                          label: const Text('افزودن تخفیف'),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Row(
                        children: [
                          _FilterChip(
                            label: 'همه',
                            active: _filter == 'ALL',
                            onTap: () {
                              setState(() => _filter = 'ALL');
                              _loadDiscounts();
                            },
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          _FilterChip(
                            label: 'فعال',
                            active: _filter == 'ACTIVE',
                            onTap: () {
                              setState(() => _filter = 'ACTIVE');
                              _loadDiscounts();
                            },
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          _FilterChip(
                            label: 'غیرفعال',
                            active: _filter == 'INACTIVE',
                            onTap: () {
                              setState(() => _filter = 'INACTIVE');
                              _loadDiscounts();
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (_isLoading)
                  const _LoadingState()
                else if (_errorMessage != null)
                  _ErrorState(
                    message: _errorMessage!,
                    onRetry: _loadDiscounts,
                  )
                else if (items.isEmpty)
                  const _EmptyState()
                else
                  ...items.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: _DiscountCard(
                        discount: item,
                        onOpen: () async {
                          final changed = await Navigator.of(context).push<bool>(
                            MaterialPageRoute(
                              builder: (_) => DiscountWorkspaceScreen(
                                accessToken: widget.accessToken,
                                storeId: widget.storeId,
                                discountId: item.id,
                              ),
                            ),
                          );
                          if (changed == true) {
                            _loadDiscounts();
                          }
                        },
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DiscountCard extends StatelessWidget {
  const _DiscountCard({
    required this.discount,
    required this.onOpen,
  });

  final VendorDiscount discount;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  discount.title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              _StateBadge(
                label: discount.isActive ? 'فعال' : 'غیرفعال',
                color: discount.isActive ? AppColors.success : AppColors.textSecondary,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            discount.productName,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Text(
                _formatDiscountValue(discount),
                style: theme.textTheme.titleSmall?.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: onOpen,
                child: const Text('جزئیات'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: active
              ? AppColors.primary
              : AppColors.surfaceSoft.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: active ? Colors.white : AppColors.textSecondary,
                fontWeight: FontWeight.w700,
              ),
        ),
      ),
    );
  }
}

class _StateBadge extends StatelessWidget {
  const _StateBadge({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const AppGlassCard(
      child: SizedBox(
        height: 220,
        child: Center(
          child: CircularProgressIndicator(),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'خطا در بارگذاری تخفیف‌ها',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.lg),
          FilledButton(
            onPressed: onRetry,
            child: const Text('تلاش دوباره'),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return AppGlassCard(
      child: Column(
        children: [
          const Icon(
            Icons.local_offer_outlined,
            size: 42,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'هنوز تخفیفی برای این فروشگاه ثبت نشده است.',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

String _formatDiscountValue(VendorDiscount discount) {
  if (discount.valueType == 'PERCENTAGE') {
    return '${discount.value}%';
  }
  return '${discount.value.toInt()} تومان';
}
