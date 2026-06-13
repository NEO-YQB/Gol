import 'package:flutter/material.dart';

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
  VendorOrderDetail? _selectedOrder;
  String? _errorMessage;
  bool _isLoading = true;
  bool _isLoadingDetail = false;
  String? _busyAction;

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
      _errorMessage = null;
    });

    try {
      final orders = await _ordersApiService.getVendorOrders(widget.accessToken);
      if (!mounted) return;

      setState(() {
        _orders = orders;
      });

      if (orders.isNotEmpty) {
        await _loadOrderDetail(orders.first.id, silent: true);
      }
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

  Future<void> _loadOrderDetail(int orderId, {bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoadingDetail = true;
      });
    }

    try {
      final detail = await _ordersApiService.getOrderDetail(
        accessToken: widget.accessToken,
        orderId: orderId,
      );

      if (!mounted) return;
      setState(() {
        _selectedOrder = detail;
      });
    } catch (_) {
      // keep current state if detail fails
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
    final selectedOrder = _selectedOrder;
    if (selectedOrder == null) return;

    setState(() {
      _busyAction = key;
      _errorMessage = null;
    });

    try {
      final detail = await action();
      if (!mounted) return;
      setState(() {
        _selectedOrder = detail;
      });
      await _loadOrders();
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _busyAction = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final search = _searchController.text.trim().toLowerCase();
    final filteredOrders = _orders.where((order) {
      if (search.isEmpty) return true;
      return order.customerName.toLowerCase().contains(search) ||
          order.id.toString().contains(search) ||
          order.phoneNumber.toLowerCase().contains(search);
    }).toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: _isLoading
                ? const _OrdersLoadingView()
                : ListView(
                    padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                    children: [
                      if (widget.embedded)
                        Text(
                          'سفارش‌ها',
                          style: theme.textTheme.titleMedium,
                        )
                      else
                        Row(
                          children: [
                            IconButton(
                              onPressed: widget.onBack,
                              style: IconButton.styleFrom(
                                backgroundColor:
                                    AppColors.surface.withValues(alpha: 0.88),
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
                        title: 'سفارش‌ها را سریع و شفاف مدیریت کن',
                        description:
                            'لیست سفارش‌ها، جزئیات هر سفارش و actionهای اصلی را در یک تجربه سریع و premium ببین.',
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      TextField(
                        controller: _searchController,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          labelText: 'جستجو در سفارش‌ها',
                          hintText: 'شناسه، مشتری یا شماره تماس',
                          prefixIcon: Icon(Icons.search_rounded),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      AppMetricTile(
                        title: 'تعداد سفارش‌ها',
                        value: '${filteredOrders.length}',
                        subtitle: 'فقط سفارش‌های قابل مشاهده در لیست فعلی',
                        accentColor: AppColors.primary,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      ...filteredOrders.map(
                        (order) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                          child: GestureDetector(
                            onTap: () => _loadOrderDetail(order.id),
                            child: AppGlassCard(
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
                                  Text(
                                    order.customerName,
                                    style: theme.textTheme.headlineMedium,
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(
                                    '${order.totalAmount} تومان',
                                    style: theme.textTheme.bodyLarge?.copyWith(
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(
                                    order.phoneNumber,
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      if (_selectedOrder != null)
                        _OrderDetailSection(
                          order: _selectedOrder!,
                          isLoading: _isLoadingDetail,
                          busyAction: _busyAction,
                          errorMessage: _errorMessage,
                          onAccept: () => _runAction(
                            'accept',
                            () => _ordersApiService.acceptOrder(
                              accessToken: widget.accessToken,
                              orderId: _selectedOrder!.id,
                            ),
                          ),
                          onShip: () => _runAction(
                            'ship',
                            () => _ordersApiService.shipOrder(
                              accessToken: widget.accessToken,
                              orderId: _selectedOrder!.id,
                            ),
                          ),
                          onDeliver: () => _runAction(
                            'deliver',
                            () => _ordersApiService.deliverOrder(
                              accessToken: widget.accessToken,
                              orderId: _selectedOrder!.id,
                            ),
                          ),
                          onCancel: () => _runAction(
                            'cancel',
                            () => _ordersApiService.cancelOrder(
                              accessToken: widget.accessToken,
                              orderId: _selectedOrder!.id,
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
  });

  final VendorOrderDetail order;
  final bool isLoading;
  final String? busyAction;
  final String? errorMessage;
  final Future<void> Function() onAccept;
  final Future<void> Function() onShip;
  final Future<void> Function() onDeliver;
  final Future<void> Function() onCancel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'جزئیات سفارش #${order.id}',
            style: theme.textTheme.headlineMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            order.customerName,
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'وضعیت سفارش: ${_translateOrderStatus(order.status)}',
            style: theme.textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'وضعیت پرداخت: ${_translatePaymentStatus(order.paymentStatus)}',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'مبلغ: ${order.totalAmount} تومان',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'شماره تماس: ${order.phoneNumber}',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
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
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _ActionButton(
                label: 'پذیرش سفارش',
                isBusy: busyAction == 'accept',
                onPressed: _actionEnabled(order.availableActions, 'accept')
                    ? onAccept
                    : null,
              ),
              _ActionButton(
                label: 'ثبت ارسال',
                isBusy: busyAction == 'ship',
                onPressed: _actionEnabled(order.availableActions, 'ship')
                    ? onShip
                    : null,
              ),
              _ActionButton(
                label: 'ثبت تحویل',
                isBusy: busyAction == 'deliver',
                onPressed: _actionEnabled(order.availableActions, 'deliver')
                    ? onDeliver
                    : null,
              ),
              _ActionButton(
                label: 'لغو سفارش',
                isBusy: busyAction == 'cancel',
                onPressed: _actionEnabled(order.availableActions, 'cancel')
                    ? onCancel
                    : null,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.isBusy,
    required this.onPressed,
  });

  final String label;
  final bool isBusy;
  final Future<void> Function()? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed == null
          ? null
          : () async {
              await onPressed!();
            },
      child: Text(isBusy ? 'در حال انجام...' : label),
    );
  }
}

class _OrderStatusChip extends StatelessWidget {
  const _OrderStatusChip({
    required this.status,
  });

  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        _translateOrderStatus(status),
        style: Theme.of(context).textTheme.labelMedium,
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
          Text(
            'سفارش‌ها',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.lg),
          const AppGlassCard(
            child: SizedBox(
              height: 220,
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

bool _actionEnabled(Map<String, dynamic> actions, String key) {
  return actions[key] == true;
}

String _translateOrderStatus(String value) {
  switch (value) {
    case 'PENDING':
      return 'در انتظار';
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
      return value;
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
    default:
      return value;
  }
}
