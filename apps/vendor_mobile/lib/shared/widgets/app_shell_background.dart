import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

class AppShellBackground extends StatelessWidget {
  const AppShellBackground({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFFFFF9F0),
            AppColors.canvas,
          ],
        ),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0.0, -0.85),
                  radius: 1.25,
                  colors: [
                    Colors.white.withValues(alpha: 0.82),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: -90,
            right: -30,
            child: _GlowOrb(
              size: 220,
              color: AppColors.secondary.withValues(alpha: 0.14),
            ),
          ),
          Positioned(
            top: 140,
            left: -60,
            child: _GlowOrb(
              size: 180,
              color: AppColors.primary.withValues(alpha: 0.10),
            ),
          ),
          Positioned(
            bottom: -70,
            right: 50,
            child: Transform.rotate(
              angle: -math.pi / 5,
              child: _GlowOrb(
                size: 170,
                color: AppColors.accent.withValues(alpha: 0.12),
              ),
            ),
          ),
          Positioned(
            top: 100,
            right: 120,
            child: _MeshBlur(
              width: 180,
              height: 180,
              color: AppColors.primary.withValues(alpha: 0.08),
            ),
          ),
          Positioned(
            bottom: 120,
            left: 20,
            child: _MeshBlur(
              width: 220,
              height: 150,
              color: AppColors.secondary.withValues(alpha: 0.07),
            ),
          ),
          Positioned.fill(
            child: child,
          ),
        ],
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({
    required this.size,
    required this.color,
  });

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        boxShadow: [
          BoxShadow(
            color: color,
            blurRadius: 40,
            spreadRadius: 10,
          ),
        ],
      ),
    );
  }
}

class _MeshBlur extends StatelessWidget {
  const _MeshBlur({
    required this.width,
    required this.height,
    required this.color,
  });

  final double width;
  final double height;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return ImageFiltered(
      imageFilter: ImageFilter.blur(sigmaX: 26, sigmaY: 26),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              color,
              color.withValues(alpha: color.a * 0.25),
            ],
          ),
        ),
      ),
    );
  }
}
