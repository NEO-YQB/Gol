import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

class AppGlassCard extends StatelessWidget {
  const AppGlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.borderRadius = 28,
    this.backgroundColor,
    this.borderColor,
    this.blurSigma = 14,
  });

  final Widget child;
  final EdgeInsets padding;
  final double borderRadius;
  final Color? backgroundColor;
  final Color? borderColor;
  final double blurSigma;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                (backgroundColor ?? AppColors.surface).withValues(alpha: 0.94),
                (backgroundColor ?? AppColors.surfaceSoft).withValues(alpha: 0.86),
              ],
            ),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: borderColor ?? Colors.white.withValues(alpha: 0.72),
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x120E1712),
                blurRadius: 32,
                offset: Offset(0, 16),
              ),
              BoxShadow(
                color: Color(0x12FFFFFF),
                blurRadius: 10,
                offset: Offset(0, -2),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}
