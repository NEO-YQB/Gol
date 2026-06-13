import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../auth/domain/auth_session.dart';
import '../../dashboard/presentation/dashboard_screen.dart';
import '../../orders/presentation/orders_screen.dart';

enum VendorShellTab {
  dashboard,
  orders,
  notifications,
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
      VendorShellTab.notifications => const _ShellPlaceholder(
          title: 'اعلان‌ها',
          description: 'مرکز اعلان در مرحله بعدی به navigation اصلی وصل می‌شود.',
        ),
      VendorShellTab.profile => _ShellPlaceholder(
          title: 'پروفایل فروشگاه',
          description:
              'تنظیمات و اطلاعات پایه فروشگاه در milestone بعدی وارد این بخش می‌شوند.',
        ),
    };

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        extendBody: true,
        body: body,
        bottomNavigationBar: SafeArea(
          minimum: const EdgeInsets.fromLTRB(18, 0, 18, 14),
          child: AppGlassCard(
            padding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
            child: Row(
              children: [
                _NavItem(
                  label: 'داشبورد',
                  icon: Icons.dashboard_rounded,
                  active: _currentTab == VendorShellTab.dashboard,
                  onTap: () => setState(() {
                    _currentTab = VendorShellTab.dashboard;
                  }),
                ),
                _NavItem(
                  label: 'سفارش‌ها',
                  icon: Icons.receipt_long_rounded,
                  active: _currentTab == VendorShellTab.orders,
                  onTap: () => setState(() {
                    _currentTab = VendorShellTab.orders;
                  }),
                ),
                _NavItem(
                  label: 'اعلان‌ها',
                  icon: Icons.notifications_rounded,
                  active: _currentTab == VendorShellTab.notifications,
                  onTap: () => setState(() {
                    _currentTab = VendorShellTab.notifications;
                  }),
                ),
                _NavItem(
                  label: 'پروفایل',
                  icon: Icons.storefront_rounded,
                  active: _currentTab == VendorShellTab.profile,
                  onTap: () => setState(() {
                    _currentTab = VendorShellTab.profile;
                  }),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
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

    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.sm,
            vertical: AppSpacing.md,
          ),
          decoration: BoxDecoration(
            color: active
                ? AppColors.primary.withValues(alpha: 0.12)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: active ? AppColors.primary : AppColors.textSecondary,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: theme.textTheme.labelMedium?.copyWith(
                  color: active ? AppColors.primary : AppColors.textSecondary,
                  fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
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
