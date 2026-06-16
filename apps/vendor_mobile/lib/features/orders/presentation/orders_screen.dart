import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_metric_tile.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../data/orders_api_service.dart';
import '../domain/vendor_order_detail.dart';
import '../domain/vendor_order_summary.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({
    super.key,
    required this.accessToken,
    this.onBack,
    this.embedded = false,
  });

  final String accessToken;
  final VoidCallback? onBack;
  final bool embedded;

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final _ordersApiService = const OrdersApiService();
  final _searchController = TextEditingController();

  List<VendorOrderSummary> _orders = const [];
  String? _screenErrorMessage;
  String? _actionErrorMessage;
  bool _isLoading = true;
  bool _isLoadingDetail = false;
  String? _busyAction;
  String _selectedFilter = 'ALL';
  bool _showOnlyActionable = false;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _isLoading = true;
      _screenErrorMessage = null;
    });

    try {
      final orders = await _ordersApiService.getVendorOrders(
        widget.accessToken,
      );
      if (!mounted) return;

      setState(() {
        _orders = orders;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _screenErrorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadOrderDetail(int orderId, {bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoadingDetail = true;
        _actionErrorMessage = null;
      });
    }

    try {
      final detail = await _ordersApiService.getOrderDetail(
        accessToken: widget.accessToken,
        orderId: orderId,
      );

      if (!mounted) return;
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _actionErrorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoadingDetail = false;
      });
    }
  }

  Future<void> _runAction(
    String key,
    Future<VendorOrderDetail> Function() action,
  ) async {
    if (_orders.isEmpty) return;

    setState(() {
      _busyAction = key;
      _actionErrorMessage = null;
    });

    try {
      final detail = await action();
      if (!mounted) return;

      await _loadOrders();
      await _loadOrderDetail(detail.id, silent: true);
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _actionErrorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _busyAction = null;
      });
    }
  }

  Future<void> _openOrderDetails(VendorOrderSummary order) async {
    final detail = await _ordersApiService.getOrderDetail(
      accessToken: widget.accessToken,
      orderId: order.id,
    );
    if (!mounted) return;

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Directionality(
          textDirection: TextDirection.rtl,
          child: _OrderDetailsPage(
            order: detail,
            isLoading: _isLoadingDetail,
            busyAction: _busyAction,
            errorMessage: _actionErrorMessage,
            onRefresh: () => _loadOrderDetail(order.id),
            onAccept: () => _runAction(
              'accept',
              () => _ordersApiService.acceptOrder(
                accessToken: widget.accessToken,
                orderId: order.id,
              ),
            ),
            onShip: () => _runAction(
              'ship',
              () => _ordersApiService.shipOrder(
                accessToken: widget.accessToken,
                orderId: order.id,
              ),
            ),
            onDeliver: () => _runAction(
              'deliver',
              () => _ordersApiService.deliverOrder(
                accessToken: widget.accessToken,
                orderId: order.id,
              ),
            ),
            onCancel: () => _runAction(
              'cancel',
              () => _ordersApiService.cancelOrder(
                accessToken: widget.accessToken,
                orderId: order.id,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final search = _searchController.text.trim().toLowerCase();
    final filteredOrders = _orders.where((order) {
      final normalizedStatus = _translateOrderStatus(order.status).toLowerCase();
      final normalizedPayment = _translatePaymentStatus(order.paymentStatus)
          .toLowerCase();
      final matchesSearch =
          search.isEmpty ||
          order.customerName.toLowerCase().contains(search) ||
          order.id.toString().contains(search) ||
          order.phoneNumber.toLowerCase().contains(search) ||
          normalizedStatus.contains(search) ||
          normalizedPayment.contains(search);

      final matchesFilter =
          _selectedFilter == 'ALL' || order.status == _selectedFilter;

      final matchesActionable = !_showOnlyActionable ||
          order.status == 'PENDING' ||
          order.status == 'PAID' ||
          order.status == 'ACCEPTED' ||
          order.status == 'PROCESSING' ||
          order.status == 'SHIPPED';

      return matchesSearch && matchesFilter && matchesActionable;
    }).toList();

    final pendingOrdersCount = _orders.where((order) {
      return order.status == 'PENDING' || order.status == 'PAID';
    }).length;
    final deliveredOrdersCount = _orders
        .where((order) => order.status == 'DELIVERED')
        .length;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: _isLoading
                ? const _OrdersLoadingView()
                : _screenErrorMessage != null
                ? _OrdersErrorView(
                    message: _screenErrorMessage!,
                    embedded: widget.embedded,
                    onBack: widget.onBack,
                    onRetry: _loadOrders,
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                    children: [
                      if (widget.embedded)
                        Text('سفارش‌ها', style: theme.textTheme.titleMedium)
                      else
                        Row(
                          children: [
                            IconButton(
                              onPressed: widget.onBack,
                              style: IconButton.styleFrom(
                                backgroundColor: AppColors.surface.withValues(
                                  alpha: 0.88,
                                ),
                              ),
                              icon: const Icon(Icons.arrow_back),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Text(
                                'سفارش‌ها',
                                style: theme.textTheme.titleMedium,
                              ),
                            ),
                          ],
                        ),
                      const SizedBox(height: AppSpacing.lg),
                      const AppSectionHeading(
                        eyebrow: 'کارتابل عملیاتی',
                        title: 'سفارش‌ها را سریع، شفاف و بدون شلوغی مدیریت کن',
                        description:
                            'ابتدا سفارش مناسب را انتخاب کن، بعد خلاصه، timeline و actionهای همان سفارش را در یک workspace متمرکز ببین.',
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      _OrdersHeroCard(
                        totalOrdersCount: _orders.length,
                        pendingOrdersCount: pendingOrdersCount,
                        deliveredOrdersCount: deliveredOrdersCount,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              onChanged: (_) => setState(() {}),
                              decoration: InputDecoration(
                                labelText: 'جستجو در سفارش‌ها',
                                hintText: 'شناسه، مشتری، تماس یا وضعیت',
                                prefixIcon: const Icon(Icons.search_rounded),
                                suffixIcon: _searchController.text.trim().isEmpty
                                    ? null
                                    : IconButton(
                                        onPressed: () {
                                          _searchController.clear();
                                          setState(() {});
                                        },
                                        icon: const Icon(Icons.close_rounded),
                                      ),
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          IconButton(
                            onPressed: _loadOrders,
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.surface.withValues(
                                alpha: 0.88,
                              ),
                            ),
                            icon: const Icon(Icons.refresh_rounded),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      SwitchListTile.adaptive(
                        value: _showOnlyActionable,
                        contentPadding: EdgeInsets.zero,
                        activeColor: AppColors.primary,
                        title: const Text('فقط سفارش‌های قابل اقدام'),
                        subtitle: const Text('سفارش‌های معطل یا قابل رسیدگی را نگه دار'),
                        onChanged: (value) {
                          setState(() {
                            _showOnlyActionable = value;
                          });
                        },
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      SizedBox(
                        height: 42,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            _OrdersFilterChip(
                              label: 'همه',
                              active: _selectedFilter == 'ALL',
                              onTap: () => setState(() {
                                _selectedFilter = 'ALL';
                              }),
                            ),
                            ..._orderFilterOptions.map(
                              (item) => _OrdersFilterChip(
                                label: item.label,
                                active: _selectedFilter == item.value,
                                onTap: () => setState(() {
                                  _selectedFilter = item.value;
                                }),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Row(
                        children: [
                          Expanded(
                            child: AppMetricTile(
                              title: 'سفارش‌های قابل مشاهده',
                              value: '${filteredOrders.length}',
                              subtitle: _showOnlyActionable
                                  ? 'فقط سفارش‌های قابل رسیدگی'
                                  : 'نتیجه فیلتر و جستجوی فعلی',
                              accentColor: AppColors.primary,
                              icon: Icons.receipt_long_rounded,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      if (filteredOrders.isEmpty)
                        const _OrdersEmptyState()
                      else
                        ...filteredOrders.map(
                          (order) => Padding(
                            padding: const EdgeInsets.only(
                              bottom: AppSpacing.lg,
                            ),
                            child: _OrderSummaryCard(
                              order: order,
                              selected: false,
                              onTap: () => _openOrderDetails(order),
                              onOpenDetails: () => _openOrderDetails(order),
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

class _OrdersHeroCard extends StatelessWidget {
  const _OrdersHeroCard({
    required this.totalOrdersCount,
    required this.pendingOrdersCount,
    required this.deliveredOrdersCount,
  });

  final int totalOrdersCount;
  final int pendingOrdersCount;
  final int deliveredOrdersCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.primaryDark],
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'میزکار سفارش‌ها',
              style: theme.textTheme.labelLarge?.copyWith(
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'تمرکز امروز را از سفارش‌های معطل شروع کن',
              style: theme.textTheme.titleMedium?.copyWith(color: Colors.white),
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: _HeroStat(
                    label: 'کل سفارش‌ها',
                    value: '$totalOrdersCount',
                  ),
                ),
                Expanded(
                  child: _HeroStat(
                    label: 'در انتظار رسیدگی',
                    value: '$pendingOrdersCount',
                  ),
                ),
                Expanded(
                  child: _HeroStat(
                    label: 'تحویل‌شده',
                    value: '$deliveredOrdersCount',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: theme.textTheme.headlineMedium?.copyWith(color: Colors.white),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(color: Colors.white70),
        ),
      ],
    );
  }
}

class _OrdersFilterChip extends StatelessWidget {
  const _OrdersFilterChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: active
                ? AppColors.primary.withValues(alpha: 0.12)
                : AppColors.surfaceSoft.withValues(alpha: 0.72),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: active
                  ? AppColors.primary.withValues(alpha: 0.22)
                  : Colors.transparent,
            ),
          ),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: active ? AppColors.primary : AppColors.textSecondary,
              fontWeight: active ? FontWeight.w800 : FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _OrderSummaryCard extends StatelessWidget {
  const _OrderSummaryCard({
    required this.order,
    required this.selected,
    required this.onTap,
    required this.onOpenDetails,
  });

  final VendorOrderSummary order;
  final bool selected;
  final VoidCallback onTap;
  final VoidCallback onOpenDetails;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      borderRadius: BorderRadius.circular(28),
      onTap: onTap,
      child: AppGlassCard(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: selected
                  ? AppColors.primary.withValues(alpha: 0.18)
                  : Colors.transparent,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'سفارش #${order.id}',
                      style: theme.textTheme.titleMedium,
                    ),
                  ),
                  _OrderStatusChip(status: order.status),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Text(order.customerName, style: theme.textTheme.headlineMedium),
              const SizedBox(height: AppSpacing.xs),
              Text(
                order.phoneNumber,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'شناسه سفارش: ${order.id}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _MiniInfoPill(
                    icon: Icons.payments_rounded,
                    text: '${_formatMoney(order.totalAmount)} تومان',
                  ),
                  _MiniInfoPill(
                    icon: Icons.phone_android_rounded,
                    text: order.phoneNumber,
                  ),
                  _MiniInfoPill(
                    icon: Icons.credit_card_rounded,
                    text: _translatePaymentStatus(order.paymentStatus),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Text(
                    _formatDateLabel(order.createdAt),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const Spacer(),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: () async {
                      await _callCustomer(context, order.phoneNumber);
                    },
                    icon: const Icon(Icons.call_rounded),
                    label: const Text('تماس با مشتری'),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onOpenDetails,
                      icon: const Icon(Icons.visibility_rounded),
                      label: const Text('مشاهده و مدیریت'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderDetailsPage extends StatelessWidget {
  const _OrderDetailsPage({
    required this.order,
    required this.isLoading,
    required this.busyAction,
    required this.errorMessage,
    required this.onRefresh,
    required this.onAccept,
    required this.onShip,
    required this.onDeliver,
    required this.onCancel,
  });

  final VendorOrderDetail order;
  final bool isLoading;
  final String? busyAction;
  final String? errorMessage;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onAccept;
  final Future<void> Function() onShip;
  final Future<void> Function() onDeliver;
  final Future<void> Function() onCancel;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppShellBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.surface.withValues(
                        alpha: 0.88,
                      ),
                    ),
                    icon: const Icon(Icons.arrow_back),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      'جزئیات سفارش #${order.id}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  IconButton(
                    onPressed: onRefresh,
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.surface.withValues(
                        alpha: 0.88,
                      ),
                    ),
                    icon: const Icon(Icons.refresh_rounded),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              _OrderDetailSection(
                order: order,
                isLoading: isLoading,
                busyAction: busyAction,
                errorMessage: errorMessage,
                onAccept: onAccept,
                onShip: onShip,
                onDeliver: onDeliver,
                onCancel: onCancel,
                expanded: true,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniInfoPill extends StatelessWidget {
  const _MiniInfoPill({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(
            text,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _OrderDetailSection extends StatelessWidget {
  const _OrderDetailSection({
    required this.order,
    required this.isLoading,
    required this.busyAction,
    required this.errorMessage,
    required this.onAccept,
    required this.onShip,
    required this.onDeliver,
    required this.onCancel,
    this.expanded = false,
  });

  final VendorOrderDetail order;
  final bool isLoading;
  final String? busyAction;
  final String? errorMessage;
  final Future<void> Function() onAccept;
  final Future<void> Function() onShip;
  final Future<void> Function() onDeliver;
  final Future<void> Function() onCancel;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'workspace سفارش #${order.id}',
                      style: theme.textTheme.headlineMedium,
                    ),
                  ),
                  _OrderStatusChip(status: order.status),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'جزئیات کامل سفارش، وضعیت مالی، محصولات، آدرس و actionهای لازم را از همین صفحه مدیریت کن.',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _DetailStatCard(
                    label: 'وضعیت سفارش',
                    value: _translateOrderStatus(order.status),
                    icon: Icons.local_shipping_rounded,
                  ),
                  _DetailStatCard(
                    label: 'وضعیت پرداخت',
                    value: _translatePaymentStatus(order.paymentStatus),
                    icon: Icons.payments_rounded,
                  ),
                  _DetailStatCard(
                    label: 'وضعیت تسویه',
                    value: _translateSettlementStatus(order.settlementStatus),
                    icon: Icons.account_balance_wallet_rounded,
                  ),
                  _DetailStatCard(
                    label: 'مبلغ سفارش',
                    value: '${_formatMoney(order.totalAmount)} تومان',
                    icon: Icons.sell_rounded,
                  ),
                  _DetailStatCard(
                    label: 'قابل پرداخت',
                    value: '${_formatMoney(order.payableAmount)} تومان',
                    icon: Icons.receipt_rounded,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              AppGlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('هویت سفارش', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.md),
                    _IdentityRow(label: 'مشتری', value: order.customerName),
                    _IdentityRow(label: 'شماره تماس', value: order.phoneNumber),
                    _IdentityRow(
                      label: 'کد/شناسه مشتری',
                      value: order.customerNationalId,
                    ),
                    _IdentityRow(
                      label: 'ثبت سفارش',
                      value: _formatDateLabel(order.createdAt),
                    ),
                    _IdentityRow(
                      label: 'بازه تحویل',
                      value: order.deliveryDate.isEmpty
                          ? 'هنوز ثبت نشده'
                          : _formatDateLabel(order.deliveryDate),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppGlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('آدرس و تحویل', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.md),
                    _IdentityRow(
                      label: 'عنوان آدرس',
                      value: order.shippingAddressTitle,
                    ),
                    _IdentityRow(
                      label: 'آدرس تحویل',
                      value: order.shippingAddressText,
                      expandValue: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (order.items.isNotEmpty)
                AppGlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('محصولات سفارش', style: theme.textTheme.titleMedium),
                      const SizedBox(height: AppSpacing.md),
                      ...order.items.map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _OrderProductCard(item: item),
                        ),
                      ),
                    ],
                  ),
                ),
              if (order.items.isNotEmpty) const SizedBox(height: AppSpacing.lg),
              if (order.latestOperationalFlags.isNotEmpty)
                AppGlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'هشدارهای عملیاتی',
                        style: theme.textTheme.titleMedium,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: order.latestOperationalFlags
                            .map(
                              (flag) => Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.secondary.withValues(
                                    alpha: 0.10,
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Text(
                                  _translateOperationalFlag(flag),
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: AppColors.secondary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ],
                  ),
                ),
              if (order.latestOperationalFlags.isNotEmpty)
                const SizedBox(height: AppSpacing.lg),
              if (errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: Text(
                    errorMessage!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              if (isLoading)
                const Padding(
                  padding: EdgeInsets.only(bottom: AppSpacing.md),
                  child: LinearProgressIndicator(),
                ),
              Text('اکشن‌های سفارش', style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _ActionButton(
                    label: 'پذیرش سفارش',
                    icon: Icons.check_circle_rounded,
                    tone: AppColors.primary,
                    isBusy: busyAction == 'accept',
                    onPressed:
                        _actionEnabled(order.availableActions, 'canAccept')
                        ? onAccept
                        : null,
                  ),
                  _ActionButton(
                    label: 'ثبت ارسال',
                    icon: Icons.outbox_rounded,
                    tone: AppColors.accent,
                    isBusy: busyAction == 'ship',
                    onPressed: _actionEnabled(order.availableActions, 'canShip')
                        ? onShip
                        : null,
                  ),
                  _ActionButton(
                    label: 'ثبت تحویل',
                    icon: Icons.done_all_rounded,
                    tone: AppColors.success,
                    isBusy: busyAction == 'deliver',
                    onPressed:
                        _actionEnabled(order.availableActions, 'canDeliver')
                        ? onDeliver
                        : null,
                  ),
                  _ActionButton(
                    label: 'لغو سفارش',
                    icon: Icons.close_rounded,
                    tone: AppColors.secondary,
                    isBusy: busyAction == 'cancel',
                    onPressed:
                        _actionEnabled(order.availableActions, 'canCancel')
                        ? onCancel
                        : null,
                  ),
                  _ActionButton(
                    label: 'تماس با مشتری',
                    icon: Icons.call_rounded,
                    tone: AppColors.textPrimary,
                    isBusy: false,
                    onPressed: () => _callCustomer(context, order.phoneNumber),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        AppGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('timeline سفارش', style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.md),
              if (order.timeline.isEmpty)
                Text(
                  'برای این سفارش هنوز timeline قابل نمایش ثبت نشده است.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                )
              else
                ...order.timeline
                    .take(8)
                    .map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _TimelineItem(item: item),
                      ),
                    ),
            ],
          ),
        ),
        if (order.auditTrail.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          AppGlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('رویدادهای ثبت‌شده', style: theme.textTheme.titleMedium),
                const SizedBox(height: AppSpacing.md),
                ...order.auditTrail
                    .take(4)
                    .map(
                      (event) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceSoft.withValues(
                              alpha: 0.72,
                            ),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  event.summary,
                                  style: theme.textTheme.bodyMedium,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Text(
                                _formatDateLabel(event.createdAt),
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _OrderProductCard extends StatelessWidget {
  const _OrderProductCard({required this.item});

  final VendorOrderItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.68),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ProductThumb(imageUrl: item.productImage),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.productName, style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(
                  'تعداد: ${item.quantity}',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'مبلغ واحد: ${_formatMoney(item.price)} تومان',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'جمع: ${_formatMoney(item.lineTotal)} تومان',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                  ),
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
  const _ProductThumb({required this.imageUrl});

  final String imageUrl;

  @override
  Widget build(BuildContext context) {
    if (imageUrl.isEmpty) {
      return Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
        ),
        child: const Icon(
          Icons.inventory_2_rounded,
          color: AppColors.textSecondary,
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Image.network(
        imageUrl,
        width: 72,
        height: 72,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: 72,
            height: 72,
            color: AppColors.surface,
            child: const Icon(
              Icons.broken_image_rounded,
              color: AppColors.textSecondary,
            ),
          );
        },
      ),
    );
  }
}

class _DetailStatCard extends StatelessWidget {
  const _DetailStatCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.70),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(height: AppSpacing.md),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(value, style: theme.textTheme.titleMedium),
        ],
      ),
    );
  }
}

class _IdentityRow extends StatelessWidget {
  const _IdentityRow({
    required this.label,
    required this.value,
    this.expandValue = false,
  });

  final String label;
  final String value;
  final bool expandValue;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(child: Text(value, style: theme.textTheme.bodyLarge)),
        ],
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  const _TimelineItem({required this.item});

  final VendorOrderTimelineEvent item;

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
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _translateOrderStatus(item.toStatus),
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${_translateOrderStatus(item.fromStatus)} ← ${_translateOrderStatus(item.toStatus)}',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                if (item.note.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    item.note,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  _formatDateLabel(item.createdAt),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.icon,
    required this.tone,
    required this.isBusy,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final Color tone;
  final bool isBusy;
  final Future<void> Function()? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      style: FilledButton.styleFrom(
        backgroundColor: tone,
        disabledBackgroundColor: AppColors.border,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      onPressed: onPressed == null
          ? null
          : () async {
              await onPressed!();
            },
      icon: isBusy
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : Icon(icon),
      label: Text(isBusy ? 'در حال انجام...' : label),
    );
  }
}

class _OrderStatusChip extends StatelessWidget {
  const _OrderStatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        _translateOrderStatus(status),
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: color,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _OrdersEmptyState extends StatelessWidget {
  const _OrdersEmptyState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Icon(
            Icons.inbox_rounded,
            size: 42,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'سفارشی با این فیلتر پیدا نشد',
            style: theme.textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'فیلتر یا متن جستجو را عوض کن تا سفارش مناسب را سریع‌تر پیدا کنیم.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _OrdersErrorView extends StatelessWidget {
  const _OrdersErrorView({
    required this.message,
    required this.embedded,
    required this.onRetry,
    this.onBack,
  });

  final String message;
  final bool embedded;
  final VoidCallback onRetry;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (embedded)
            Text('سفارش‌ها', style: theme.textTheme.titleMedium)
          else
            Row(
              children: [
                IconButton(
                  onPressed: onBack,
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.surface.withValues(alpha: 0.88),
                  ),
                  icon: const Icon(Icons.arrow_back),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text('سفارش‌ها', style: theme.textTheme.titleMedium),
                ),
              ],
            ),
          const SizedBox(height: AppSpacing.lg),
          AppGlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'خطا در بارگذاری سفارش‌ها',
                  style: theme.textTheme.headlineMedium,
                ),
                const SizedBox(height: AppSpacing.md),
                Text(message, style: theme.textTheme.bodyLarge),
                const SizedBox(height: AppSpacing.lg),
                FilledButton(
                  onPressed: onRetry,
                  child: const Text('تلاش دوباره'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OrdersLoadingView extends StatelessWidget {
  const _OrdersLoadingView();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('سفارش‌ها', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.lg),
          const AppGlassCard(
            child: SizedBox(
              height: 220,
              child: Center(child: CircularProgressIndicator()),
            ),
          ),
        ],
      ),
    );
  }
}

const _orderFilterOptions = [
  _OrderFilterOption(label: 'در انتظار', value: 'PENDING'),
  _OrderFilterOption(label: 'تاییدشده', value: 'ACCEPTED'),
  _OrderFilterOption(label: 'ارسال‌شده', value: 'SHIPPED'),
  _OrderFilterOption(label: 'تحویل‌شده', value: 'DELIVERED'),
];

class _OrderFilterOption {
  const _OrderFilterOption({required this.label, required this.value});

  final String label;
  final String value;
}

bool _actionEnabled(Map<String, dynamic> actions, String key) {
  return actions[key] == true;
}

String _translateOrderStatus(String value) {
  switch (value) {
    case 'PENDING':
      return 'در انتظار';
    case 'PAID':
      return 'پرداخت شده و منتظر پذیرش';
    case 'ACCEPTED':
      return 'تایید شده';
    case 'PROCESSING':
      return 'در حال آماده‌سازی';
    case 'SHIPPED':
      return 'ارسال شده';
    case 'DELIVERED':
      return 'تحویل شده';
    case 'CANCELLED':
      return 'لغوشده';
    case 'CANCELLED_BY_VENDOR':
      return 'لغوشده توسط فروشنده';
    case 'CANCELLED_BY_ADMIN':
      return 'لغوشده توسط ادمین';
    default:
      return value == '—' ? value : value.replaceAll('_', ' ');
  }
}

String _translatePaymentStatus(String value) {
  switch (value) {
    case 'PENDING':
      return 'در انتظار پرداخت';
    case 'PAID':
      return 'پرداخت شده';
    case 'FAILED':
      return 'ناموفق';
    case 'REFUNDED':
      return 'بازگشت کامل وجه';
    case 'PARTIALLY_REFUNDED':
      return 'بازگشت بخشی از وجه';
    case 'EXPIRED':
      return 'منقضی شده';
    default:
      return value;
  }
}

String _translateSettlementStatus(String value) {
  switch (value) {
    case 'PENDING':
      return 'در انتظار';
    case 'ON_HOLD':
      return 'روی هولد';
    case 'RELEASED':
      return 'آزاد شده';
    case 'REVERSED':
      return 'برگشت‌خورده';
    default:
      return value;
  }
}

String _translateOperationalFlag(String value) {
  switch (value) {
    case 'PAYMENT_EXPIRED':
      return 'پرداخت این سفارش منقضی شده است';
    case 'SETTLEMENT_NOT_HELD':
      return 'تسویه هنوز hold نشده است';
    case 'SETTLEMENT_OVERDUE':
      return 'تسویه از زمان معمول عبور کرده است';
    default:
      return value;
  }
}

Color _statusColor(String value) {
  switch (value) {
    case 'PENDING':
    case 'PAID':
      return AppColors.warning;
    case 'ACCEPTED':
    case 'PROCESSING':
      return AppColors.primary;
    case 'SHIPPED':
      return AppColors.accent;
    case 'DELIVERED':
      return AppColors.success;
    case 'CANCELLED':
    case 'CANCELLED_BY_VENDOR':
    case 'CANCELLED_BY_ADMIN':
      return AppColors.danger;
    default:
      return AppColors.textSecondary;
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

String _formatDateLabel(String raw) {
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) {
    return raw.isEmpty ? '—' : raw;
  }

  final local = parsed.toLocal();
  final hh = local.hour.toString().padLeft(2, '0');
  final mm = local.minute.toString().padLeft(2, '0');
  final yyyy = local.year.toString().padLeft(4, '0');
  final month = local.month.toString().padLeft(2, '0');
  final day = local.day.toString().padLeft(2, '0');

  return '$yyyy/$month/$day - $hh:$mm';
}

Future<void> _callCustomer(BuildContext context, String phoneNumber) async {
  final normalized = phoneNumber
      .trim()
      .replaceAll(' ', '')
      .replaceAll('-', '')
      .replaceAll('(', '')
      .replaceAll(')', '');
  if (normalized.isEmpty || normalized == '—') return;

  final uri = Uri.parse('tel:$normalized');
  final canLaunch = await canLaunchUrl(uri);

  if (canLaunch) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
    return;
  }

  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('امکان باز کردن شماره‌گیر روی این دستگاه وجود ندارد.'),
    ),
  );
}
