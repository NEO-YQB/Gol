import 'dart:ui';
import 'package:flutter/material.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../app_shell/domain/vendor_shell_tab.dart';

class StoreProfileMenuButton extends StatelessWidget {
  const StoreProfileMenuButton({
    super.key,
    required this.storeName,
    this.storeLogo,
    this.fullName,
    required this.onSelectTab,
    required this.onLogout,
  });

  final String storeName;
  final String? storeLogo;
  final String? fullName;
  final ValueChanged<VendorShellTab>? onSelectTab;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () {
          showStoreProfileGlassMenu(
            context: context,
            storeName: storeName,
            storeLogo: storeLogo,
            fullName: fullName,
            onSelectTab: onSelectTab,
            onLogout: onLogout,
          );
        },
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.72),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.85),
                  width: 1.2,
                ),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x10000000),
                    blurRadius: 12,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _StoreAvatar(
                    storeLogo: storeLogo,
                    size: 28,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      (fullName ?? '').trim().isNotEmpty
                          ? fullName!.trim()
                          : 'فروشنده',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 18,
                    color: AppColors.textPrimary,
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

Future<void> showStoreProfileGlassMenu({
  required BuildContext context,
  required String storeName,
  String? storeLogo,
  String? fullName,
  required ValueChanged<VendorShellTab>? onSelectTab,
  required Future<void> Function() onLogout,
}) {
  return showGeneralDialog(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'بستن منو',
    barrierColor: Colors.black.withValues(alpha: 0.32),
    transitionDuration: const Duration(milliseconds: 320),
    pageBuilder: (ctx, anim1, anim2) => const SizedBox.shrink(),
    transitionBuilder: (ctx, anim1, anim2, child) {
      final curved = CurvedAnimation(
        parent: anim1,
        curve: Curves.easeOutBack,
      );
      final fadeCurved = CurvedAnimation(
        parent: anim1,
        curve: Curves.easeOutCubic,
      );

      return SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            child: FadeTransition(
              opacity: fadeCurved,
              child: ScaleTransition(
                scale: Tween<double>(begin: 0.90, end: 1.0).animate(curved),
                alignment: Alignment.topLeft,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, -0.12),
                    end: Offset.zero,
                  ).animate(fadeCurved),
                  child: Directionality(
                    textDirection: TextDirection.rtl,
                    child: _StoreProfileGlassCard(
                      storeName: storeName,
                      storeLogo: storeLogo,
                      fullName: fullName,
                      onSelectTab: onSelectTab,
                      onLogout: onLogout,
                    ),
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

class _StoreProfileGlassCard extends StatelessWidget {
  const _StoreProfileGlassCard({
    required this.storeName,
    this.storeLogo,
    this.fullName,
    required this.onSelectTab,
    required this.onLogout,
  });

  final String storeName;
  final String? storeLogo;
  final String? fullName;
  final ValueChanged<VendorShellTab>? onSelectTab;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxWidth: 360),
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white.withValues(alpha: 0.92),
                  const Color(0xFFFBF8F3).withValues(alpha: 0.88),
                ],
              ),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.95),
                width: 1.5,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1F0F2B1D),
                  blurRadius: 36,
                  offset: Offset(0, 18),
                  spreadRadius: -4,
                ),
                BoxShadow(
                  color: Color(0x22FFFFFF),
                  blurRadius: 10,
                  offset: Offset(0, -2),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top Header: Store Avatar & Names
                _StoreAvatar(
                  storeLogo: storeLogo,
                  size: 64,
                ),
                const SizedBox(height: 10),
                Text(
                  storeName,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.2,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  (fullName ?? '').trim().isNotEmpty
                      ? fullName!.trim()
                      : 'مدیریت فروشگاه',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 16),
                Divider(
                  color: Colors.black.withValues(alpha: 0.06),
                  height: 1,
                  thickness: 1,
                ),
                const SizedBox(height: 8),

                // Menu Items
                _GlassMenuItem(
                  icon: Icons.storefront_rounded,
                  iconColor: AppColors.primary,
                  iconBackgroundColor: AppColors.primary.withValues(alpha: 0.12),
                  title: 'پروفایل فروشگاه',
                  onTap: () {
                    Navigator.of(context).pop();
                    onSelectTab?.call(VendorShellTab.profile);
                  },
                ),
                _GlassMenuItem(
                  icon: Icons.support_agent_rounded,
                  iconColor: const Color(0xFF0284C7),
                  iconBackgroundColor: const Color(0xFF0284C7).withValues(alpha: 0.12),
                  title: 'پشتیبانی',
                  onTap: () {
                    Navigator.of(context).pop();
                    onSelectTab?.call(VendorShellTab.support);
                  },
                ),
                _GlassMenuItem(
                  icon: Icons.notifications_rounded,
                  iconColor: const Color(0xFFD97706),
                  iconBackgroundColor: const Color(0xFFD97706).withValues(alpha: 0.12),
                  title: 'اعلانات',
                  onTap: () {
                    Navigator.of(context).pop();
                    onSelectTab?.call(VendorShellTab.notifications);
                  },
                ),
                _GlassMenuItem(
                  icon: Icons.account_balance_wallet_rounded,
                  iconColor: const Color(0xFF059669),
                  iconBackgroundColor: const Color(0xFF059669).withValues(alpha: 0.12),
                  title: 'کیف پول',
                  onTap: () {
                    Navigator.of(context).pop();
                    onSelectTab?.call(VendorShellTab.wallet);
                  },
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Divider(
                    color: Colors.black.withValues(alpha: 0.06),
                    height: 1,
                    thickness: 1,
                  ),
                ),
                _GlassMenuItem(
                  icon: Icons.logout_rounded,
                  iconColor: AppColors.danger,
                  iconBackgroundColor: AppColors.danger.withValues(alpha: 0.12),
                  title: 'خروج از حساب',
                  titleColor: AppColors.danger,
                  showChevron: false,
                  onTap: () async {
                    Navigator.of(context).pop();
                    await onLogout();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StoreAvatar extends StatelessWidget {
  const _StoreAvatar({
    this.storeLogo,
    required this.size,
  });

  final String? storeLogo;
  final double size;

  @override
  Widget build(BuildContext context) {
    final validLogo = _resolveLogoUrl(storeLogo);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.surface,
        border: Border.all(
          color: Colors.white,
          width: size > 40 ? 2.5 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: size > 40 ? 12 : 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipOval(
        child: validLogo != null
            ? Image.network(
                validLogo,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) =>
                    _FallbackAvatar(size: size),
              )
            : _FallbackAvatar(size: size),
      ),
    );
  }

  String? _resolveLogoUrl(String? logoUrl) {
    final trimmedLogoUrl = logoUrl?.trim() ?? '';
    if (trimmedLogoUrl.isEmpty) return null;

    final parsedLogoUrl = Uri.tryParse(trimmedLogoUrl);
    if (parsedLogoUrl == null) return null;

    final apiOrigin = Uri.parse(AppConfig.apiBaseUrl).origin;
    final resolvedLogoUrl = Uri.parse('$apiOrigin/').resolveUri(parsedLogoUrl);
    if ((resolvedLogoUrl.scheme != 'http' &&
            resolvedLogoUrl.scheme != 'https') ||
        resolvedLogoUrl.host.isEmpty) {
      return null;
    }

    return resolvedLogoUrl.toString();
  }
}

class _FallbackAvatar extends StatelessWidget {
  const _FallbackAvatar({
    required this.size,
  });

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary,
            AppColors.primaryDark,
          ],
        ),
      ),
      alignment: Alignment.center,
      child: Icon(
        Icons.storefront_rounded,
        color: Colors.white,
        size: size * 0.58,
      ),
    );
  }
}

class _GlassMenuItem extends StatelessWidget {
  const _GlassMenuItem({
    required this.icon,
    required this.iconColor,
    required this.iconBackgroundColor,
    required this.title,
    this.titleColor,
    this.showChevron = true,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBackgroundColor;
  final String title;
  final Color? titleColor;
  final bool showChevron;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        splashColor: iconColor.withValues(alpha: 0.1),
        highlightColor: iconColor.withValues(alpha: 0.05),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: iconBackgroundColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: iconColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: titleColor != null ? FontWeight.w700 : FontWeight.w600,
                    color: titleColor ?? AppColors.textPrimary,
                  ),
                ),
              ),
              if (showChevron)
                const Icon(
                  Icons.chevron_left_rounded,
                  size: 20,
                  color: AppColors.textMuted,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
