import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../data/products_api_service.dart';
import '../domain/vendor_product_detail.dart';

class ProductWorkspaceScreen extends StatefulWidget {
  const ProductWorkspaceScreen({
    super.key,
    required this.accessToken,
    required this.productSlug,
  });

  final String accessToken;
  final String productSlug;

  @override
  State<ProductWorkspaceScreen> createState() => _ProductWorkspaceScreenState();
}

class _ProductWorkspaceScreenState extends State<ProductWorkspaceScreen> {
  final _apiService = const ProductsApiService();

  VendorProductDetail? _product;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final product = await _apiService.getProductDetail(
        accessToken: widget.accessToken,
        slug: widget.productSlug,
      );

      if (!mounted) return;
      setState(() {
        _product = product;
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
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final product = _product;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null || product == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: AppGlassCard(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _errorMessage ?? 'جزئیات محصول در دسترس نیست.',
                                  style: theme.textTheme.bodyLarge,
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: AppSpacing.lg),
                                FilledButton(
                                  onPressed: _loadDetail,
                                  child: const Text('تلاش دوباره'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                        children: [
                          Row(
                            children: [
                              IconButton(
                                onPressed: () => Navigator.of(context).pop(),
                                icon: const Icon(Icons.arrow_back_rounded),
                              ),
                              Expanded(
                                child: Text(
                                  'جزئیات محصول',
                                  style: theme.textTheme.titleMedium,
                                  textAlign: TextAlign.center,
                                ),
                              ),
                              const SizedBox(width: 48),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          if (product.reviewNote.trim().isNotEmpty) ...[
                            AppGlassCard(
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppColors.secondary.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(22),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'یادداشت بازبینی',
                                      style: theme.textTheme.titleSmall?.copyWith(
                                        color: AppColors.secondary,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.sm),
                                    Text(
                                      product.reviewNote,
                                      style: theme.textTheme.bodyLarge,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),
                          ],
                          AppGlassCard(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _ProductThumb(imageUrl: product.mainImage),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        product.name,
                                        style: theme.textTheme.headlineMedium,
                                      ),
                                      const SizedBox(height: AppSpacing.sm),
                                      Text(
                                        _formatPrice(
                                          product.discountPrice ?? product.price,
                                        ),
                                        style: theme.textTheme.titleMedium?.copyWith(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      const SizedBox(height: AppSpacing.md),
                                      _StatusBadge(
                                        label:
                                            _mapStatus(product.publicationStatus).label,
                                        color:
                                            _mapStatus(product.publicationStatus).color,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          AppGlassCard(
                            child: Column(
                              children: [
                                _DetailRow(label: 'دسته‌بندی', value: product.categoryName),
                                _DetailRow(label: 'نوع محصول', value: product.productTypeName),
                                _DetailRow(label: 'فروشگاه', value: product.storeName),
                                _DetailRow(
                                  label: 'موجودی',
                                  value: '${product.quantity}',
                                ),
                                _DetailRow(
                                  label: 'قابل خرید',
                                  value: product.isPurchasable ? 'فعال' : 'غیرفعال',
                                ),
                                _DetailRow(
                                  label: 'آرشیو',
                                  value: product.isArchived ? 'بله' : 'خیر',
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          if (product.shortDescription.trim().isNotEmpty)
                            AppGlassCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'خلاصه محصول',
                                    style: theme.textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(
                                    product.shortDescription,
                                    style: theme.textTheme.bodyLarge,
                                  ),
                                ],
                              ),
                            ),
                          if (product.description.trim().isNotEmpty) ...[
                            const SizedBox(height: AppSpacing.lg),
                            AppGlassCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'توضیحات کامل',
                                    style: theme.textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(
                                    product.description,
                                    style: theme.textTheme.bodyLarge,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '—' : value,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductThumb extends StatelessWidget {
  const _ProductThumb({
    required this.imageUrl,
  });

  final String imageUrl;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: 96,
      height: 96,
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(24),
      ),
      child: const Icon(
        Icons.inventory_2_rounded,
        color: AppColors.primary,
      ),
    );

    if (imageUrl.isEmpty) return placeholder;

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: Image.network(
        imageUrl,
        width: 96,
        height: 96,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => placeholder,
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
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

class _ProductStatusView {
  const _ProductStatusView({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;
}

_ProductStatusView _mapStatus(String value) {
  switch (value) {
    case 'PUBLISHED':
      return const _ProductStatusView(
        label: 'منتشرشده',
        color: AppColors.success,
      );
    case 'SUBMITTED':
      return const _ProductStatusView(
        label: 'در بازبینی',
        color: AppColors.accent,
      );
    case 'CHANGES_REQUESTED':
      return const _ProductStatusView(
        label: 'برگشت برای ویرایش',
        color: AppColors.secondary,
      );
    case 'ARCHIVED':
      return const _ProductStatusView(
        label: 'منتشر نشده',
        color: AppColors.textSecondary,
      );
    default:
      return const _ProductStatusView(
        label: 'پیش‌نویس',
        color: AppColors.warning,
      );
  }
}

String _formatPrice(num value) {
  final digits = value.toInt().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    buffer.write(digits[i]);
    final remaining = digits.length - i - 1;
    if (remaining > 0 && remaining % 3 == 0) {
      buffer.write(',');
    }
  }
  return '${buffer.toString()} تومان';
}
