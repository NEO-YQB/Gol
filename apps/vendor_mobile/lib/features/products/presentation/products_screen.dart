import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../../discounts/data/vendor_discounts_api_service.dart';
import '../../discounts/domain/vendor_discount.dart';
import '../data/products_api_service.dart';
import '../domain/vendor_product_summary.dart';
import 'create_product_screen.dart';
import 'product_workspace_screen.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({
    super.key,
    required this.accessToken,
    required this.storeId,
  });

  final String accessToken;
  final int storeId;

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _apiService = const ProductsApiService();
  final _discountsApiService = const VendorDiscountsApiService();
  final _searchController = TextEditingController();

  VendorProductListResponse? _response;
  List<VendorDiscount> _discounts = const [];
  bool _isLoading = true;
  String? _errorMessage;
  String _statusFilter = 'ALL';

  static const _filters = <_ProductFilterItem>[
    _ProductFilterItem(label: 'همه', value: 'ALL'),
    _ProductFilterItem(label: 'منتشرشده', value: 'PUBLISHED'),
    _ProductFilterItem(label: 'بازبینی', value: 'SUBMITTED'),
    _ProductFilterItem(label: 'پیش‌نویس', value: 'DRAFT'),
    _ProductFilterItem(label: 'برگشت‌خورده', value: 'CHANGES_REQUESTED'),
  ];

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final productsFuture = _apiService.getProducts(
        accessToken: widget.accessToken,
        storeId: widget.storeId,
        search: _searchController.text,
        publicationStatus: _statusFilter == 'ALL' ? null : _statusFilter,
      );
      final discountsFuture = _discountsApiService.getDiscounts(
        accessToken: widget.accessToken,
        storeId: widget.storeId,
      );
      final response = await productsFuture;
      final discounts = await discountsFuture;

      if (!mounted) return;
      setState(() {
        _response = response;
        _discounts = discounts.items;
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
    final products = _response?.items ?? const <VendorProductSummary>[];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 18, 24, 120),
              children: [
                Text(
                  'محصولات',
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: AppSpacing.lg),
                const AppSectionHeading(
                  eyebrow: 'کاتالوگ فروشنده',
                  title: 'لیست محصول‌ها را خلوت، سریع و حرفه‌ای ببین',
                  description:
                      'در این مرحله فقط مهم‌ترین اطلاعات را می‌بینی؛ جزئیات کامل هر محصول داخل workspace جدا باز می‌شود.',
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
                            await Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => CreateProductScreen(
                                  accessToken: widget.accessToken,
                                  storeId: widget.storeId,
                                ),
                              ),
                            );
                            if (!mounted) return;
                            _loadProducts();
                          },
                          icon: const Icon(Icons.add_rounded),
                          label: const Text('افزودن محصول'),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        controller: _searchController,
                        textInputAction: TextInputAction.search,
                        onSubmitted: (_) => _loadProducts(),
                        decoration: InputDecoration(
                          labelText: 'جستجو در نام محصول',
                          prefixIcon: const Icon(Icons.search_rounded),
                          suffixIcon: IconButton(
                            onPressed: _loadProducts,
                            icon: const Icon(Icons.tune_rounded),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      SizedBox(
                        height: 38,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemBuilder: (context, index) {
                            final item = _filters[index];
                            final active = item.value == _statusFilter;
                            return _ProductFilterChip(
                              label: item.label,
                              active: active,
                              onTap: () {
                                setState(() {
                                  _statusFilter = item.value;
                                });
                                _loadProducts();
                              },
                            );
                          },
                          separatorBuilder: (_, _) =>
                              const SizedBox(width: AppSpacing.sm),
                          itemCount: _filters.length,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (_isLoading)
                  const _ProductsLoadingState()
                else if (_errorMessage != null)
                  _ProductsErrorState(
                    message: _errorMessage!,
                    onRetry: _loadProducts,
                  )
                else if (products.isEmpty)
                  const _ProductsEmptyState()
                else
                  ...products.map(
                    (product) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: _ProductCard(
                        product: product,
                        activeDiscount: _findActiveDiscount(product.id),
                        onOpen: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ProductWorkspaceScreen(
                                accessToken: widget.accessToken,
                                productSlug: product.slug,
                              ),
                            ),
                          );
                          if (!mounted) return;
                          _loadProducts();
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

  VendorDiscount? _findActiveDiscount(int productId) {
    final now = DateTime.now();
    for (final item in _discounts) {
      if (item.productId != productId || !item.isActive) continue;
      final startAt = DateTime.tryParse(item.startAt)?.toLocal();
      final endAt = DateTime.tryParse(item.endAt)?.toLocal();
      if (startAt != null && now.isBefore(startAt)) continue;
      if (endAt != null && now.isAfter(endAt)) continue;
      return item;
    }
    return null;
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.product,
    required this.activeDiscount,
    required this.onOpen,
  });

  final VendorProductSummary product;
  final VendorDiscount? activeDiscount;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = _mapStatus(product.publicationStatus);
    final legacyPrice = product.discountPrice;
    final discountedPrice = activeDiscount != null
        ? resolveDiscountedPrice(
            basePrice: product.price,
            discount: activeDiscount!,
            now: DateTime.now(),
          )
        : legacyPrice;
    final hasDiscount =
        discountedPrice != null && discountedPrice < product.price;

    return AppGlassCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          _ProductThumb(imageUrl: product.mainImage),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                if (hasDiscount) ...[
                  Text(
                    _formatPrice(discountedPrice!),
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatPrice(product.price),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ] else
                  Text(
                    _formatPrice(product.price),
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _StatusBadge(
                      label: status.label,
                      color: status.color,
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
      width: 78,
      height: 78,
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(22),
      ),
      child: const Icon(
        Icons.inventory_2_rounded,
        color: AppColors.primary,
      ),
    );

    if (imageUrl.isEmpty) return placeholder;

    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: Image.network(
        imageUrl,
        width: 78,
        height: 78,
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

class _ProductFilterChip extends StatelessWidget {
  const _ProductFilterChip({
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

class _ProductsLoadingState extends StatelessWidget {
  const _ProductsLoadingState();

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

class _ProductsErrorState extends StatelessWidget {
  const _ProductsErrorState({
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
            'خطا در بارگذاری محصولات',
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

class _ProductsEmptyState extends StatelessWidget {
  const _ProductsEmptyState();

  @override
  Widget build(BuildContext context) {
    return AppGlassCard(
      child: Column(
        children: [
          const Icon(
            Icons.inventory_2_outlined,
            size: 42,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'هنوز محصولی برای این فروشگاه پیدا نشد.',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _ProductFilterItem {
  const _ProductFilterItem({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;
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
  final number = value.toInt().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < number.length; i++) {
    final reverseIndex = number.length - i;
    buffer.write(number[i]);
    if (reverseIndex > 1 && reverseIndex % 3 == 1) {
      buffer.write(',');
    }
  }
  return '${buffer.toString()} تومان';
}
