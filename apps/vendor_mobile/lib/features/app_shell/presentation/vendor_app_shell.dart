import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../auth/domain/auth_session.dart';
import '../../dashboard/presentation/dashboard_screen.dart';
import '../../discounts/presentation/discounts_screen.dart';
import '../../orders/presentation/orders_screen.dart';
import '../../products/presentation/products_screen.dart';
import '../../store_profile/presentation/store_profile_screen.dart';

enum VendorShellTab {
  dashboard,
  orders,
  products,
  discounts,
  wallet,
  notifications,
  support,
  profile,
}

class VendorAppShell extends StatefulWidget {
  const VendorAppShell({
    super.key,
    required this.session,
    required this.onLogout,
  });

  final AuthSession session;
  final Future<void> Function() onLogout;

  @override
  State<VendorAppShell> createState() => _VendorAppShellState();
}

class _VendorAppShellState extends State<VendorAppShell> {
  VendorShellTab _currentTab = VendorShellTab.dashboard;

  List<_NavItemData> get _items => const [
        _NavItemData(
          tab: VendorShellTab.dashboard,
          label: 'داشبورد',
          icon: Icons.dashboard_rounded,
        ),
        _NavItemData(
          tab: VendorShellTab.orders,
          label: 'سفارش‌ها',
          icon: Icons.receipt_long_rounded,
        ),
        _NavItemData(
          tab: VendorShellTab.products,
          label: 'محصولات',
          icon: Icons.inventory_2_rounded,
        ),
        _NavItemData(
          tab: VendorShellTab.discounts,
          label: 'تخفیف‌ها',
          icon: Icons.local_offer_rounded,
        ),
        _NavItemData(
          tab: VendorShellTab.wallet,
          label: 'کیف پول',
          icon: Icons.account_balance_wallet_rounded,
        ),
        _NavItemData(
          tab: VendorShellTab.notifications,
          label: 'اعلان‌ها',
          icon: Icons.notifications_rounded,
        ),
        _NavItemData(
          tab: VendorShellTab.support,
          label: 'پشتیبانی',
          icon: Icons.support_agent_rounded,
        ),
        _NavItemData(
          tab: VendorShellTab.profile,
          label: 'پروفایل',
          icon: Icons.storefront_rounded,
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final body = switch (_currentTab) {
      VendorShellTab.dashboard => DashboardScreen(
          accessToken: widget.session.accessToken,
          phoneNumber: widget.session.phoneNumber,
          storeName: widget.session.bootstrap?.store?.name.isNotEmpty == true
              ? widget.session.bootstrap!.store!.name
              : 'فروشگاه شما',
          isPreview: widget.session.isPreview,
          onLogout: widget.onLogout,
        ),
      VendorShellTab.orders => OrdersScreen(
          accessToken: widget.session.accessToken,
          embedded: true,
        ),
      VendorShellTab.products => ProductsScreen(
          accessToken: widget.session.accessToken,
          storeId: widget.session.bootstrap?.store?.id ?? 0,
        ),
      VendorShellTab.discounts => DiscountsScreen(
          accessToken: widget.session.accessToken,
          storeId: widget.session.bootstrap?.store?.id ?? 0,
        ),
      VendorShellTab.wallet => const _ShellPlaceholder(
          title: 'کیف پول و تسویه حساب',
          description:
              'موجودی، گردش مالی و درخواست تسویه در مرحله بعدی داخل این بخش پیاده‌سازی می‌شود.',
        ),
      VendorShellTab.notifications => const _ShellPlaceholder(
          title: 'اعلان‌ها',
          description: 'مرکز اعلان در مرحله بعدی به navigation اصلی وصل می‌شود.',
        ),
      VendorShellTab.support => const _ShellPlaceholder(
          title: 'پشتیبانی',
          description:
              'تیکت‌ها، گفتگو با پشتیبانی و پیگیری درخواست‌ها در milestone بعدی اینجا قرار می‌گیرد.',
        ),
      VendorShellTab.profile =>
        (widget.session.bootstrap?.store?.slug ?? '').isEmpty
            ? const _ShellPlaceholder(
                title: 'پروفایل فروشگاه',
                description:
                    'هنوز اطلاعات فروشگاه برای این حساب کامل نشده است.',
              )
            : StoreProfileScreen(
                accessToken: widget.session.accessToken,
                storeId: widget.session.bootstrap?.store?.id ?? 0,
                storeSlug: widget.session.bootstrap!.store!.slug,
              ),
    };

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        extendBody: true,
        body: body,
        bottomNavigationBar: SafeArea(
          minimum: const EdgeInsets.fromLTRB(18, 0, 18, 14),
          child: _FloatingNavigationBar(
            items: _items,
            currentTab: _currentTab,
            onSelect: (tab) => setState(() {
              _currentTab = tab;
            }),
          ),
        ),
      ),
    );
  }
}

class _FloatingNavigationBar extends StatelessWidget {
  const _FloatingNavigationBar({
    required this.items,
    required this.currentTab,
    required this.onSelect,
  });

  final List<_NavItemData> items;
  final VendorShellTab currentTab;
  final ValueChanged<VendorShellTab> onSelect;

  static const double _slotWidth = 66;
  static const double _activeWidth = 92;

  @override
  Widget build(BuildContext context) {
    final activeIndex = items.indexWhere((item) => item.tab == currentTab);
    final safeIndex = activeIndex < 0 ? 0 : activeIndex;
    final contentWidth =
        (items.length * _slotWidth) + (_activeWidth - _slotWidth);

    return LayoutBuilder(
      builder: (context, constraints) {
        final shellWidth = math.max(0.0, constraints.maxWidth - 36.0);
        final visibleContentWidth = math.max(0.0, shellWidth - 20.0);

        return Transform.translate(
          offset: const Offset(0, -6),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: AppGlassCard(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
              child: SizedBox(
                width: shellWidth,
                height: 58,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  clipBehavior: Clip.hardEdge,
                  child: SizedBox(
                    width: math.max(contentWidth.toDouble(), visibleContentWidth),
                    height: 58,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        AnimatedPositionedDirectional(
                          duration: const Duration(milliseconds: 320),
                          curve: Curves.easeOutCubic,
                          start: safeIndex * _slotWidth,
                          top: 0,
                          child: _WaterSurfaceAccent(
                            width: _activeWidth,
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          textDirection: TextDirection.rtl,
                          children: items
                              .map(
                                (item) => _NavSlot(
                                  label: item.label,
                                  icon: item.icon,
                                  active: currentTab == item.tab,
                                  onTap: () => onSelect(item.tab),
                                ),
                              )
                              .toList(),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _WaterSurfaceAccent extends StatelessWidget {
  const _WaterSurfaceAccent({
    required this.width,
  });

  final double width;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: width,
            height: 40,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.white.withValues(alpha: 0.72),
                  Colors.white.withValues(alpha: 0.14),
                ],
              ),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
                bottom: Radius.circular(20),
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.07),
                  blurRadius: 12,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NavSlot extends StatelessWidget {
  const _NavSlot({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
      width: active
          ? _FloatingNavigationBar._activeWidth
          : _FloatingNavigationBar._slotWidth,
      alignment: Alignment.center,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: TweenAnimationBuilder<double>(
          tween: Tween<double>(begin: 0, end: active ? 1 : 0),
          duration: const Duration(milliseconds: 320),
          curve: Curves.easeOutCubic,
          builder: (context, value, child) {
            return Transform.translate(
              offset: Offset(0, -3 * value),
              child: Container(
                width: active
                    ? _FloatingNavigationBar._activeWidth
                    : _FloatingNavigationBar._slotWidth,
                height: 58,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  gradient: active
                      ? const LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Color(0xFFFFFEFC),
                            Color(0xFFEAF8F0),
                          ],
                        )
                      : null,
                  color: active ? null : Colors.transparent,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: active
                        ? AppColors.primary.withValues(alpha: 0.14)
                        : Colors.transparent,
                  ),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    if (active)
                      Positioned(
                        top: 4,
                        left: 14,
                        right: 14,
                        child: Container(
                          height: 9,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(999),
                            gradient: LinearGradient(
                              colors: [
                                Colors.white.withValues(alpha: 0.82),
                                Colors.white.withValues(alpha: 0.02),
                              ],
                            ),
                          ),
                        ),
                      ),
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: active
                                ? AppColors.primary.withValues(alpha: 0.14)
                                : AppColors.surfaceSoft.withValues(alpha: 0.88),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            icon,
                            size: 18,
                            color: active
                                ? AppColors.primary
                                : AppColors.textSecondary,
                          ),
                        ),
                        AnimatedSize(
                          duration: const Duration(milliseconds: 220),
                          curve: Curves.easeOutCubic,
                          child: active
                              ? Padding(
                                  padding: const EdgeInsets.only(top: 3),
                                  child: SizedBox(
                                    width: active
                                        ? _FloatingNavigationBar._activeWidth - 16
                                        : _FloatingNavigationBar._slotWidth,
                                    child: Text(
                                      label,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      softWrap: false,
                                      textAlign: TextAlign.center,
                                      style: theme.textTheme.labelSmall?.copyWith(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w800,
                                        height: 1,
                                        fontSize: 10.5,
                                      ),
                                    ),
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _NavItemData {
  const _NavItemData({
    required this.tab,
    required this.label,
    required this.icon,
  });

  final VendorShellTab tab;
  final String label;
  final IconData icon;
}

class _ShellPlaceholder extends StatelessWidget {
  const _ShellPlaceholder({
    required this.title,
    required this.description,
  });

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: AppGlassCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
