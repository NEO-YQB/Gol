import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData light() {
    const fontFamily = 'YekanBakh';
    const primaryColor = Color(0xFF1F6A52);
    const surfaceColor = Color(0xFFFFFDF8);
    const canvasColor = Color(0xFFF6F1E8);
    const textColor = Color(0xFF1F352B);

    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
      primary: primaryColor,
      surface: surfaceColor,
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: fontFamily,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: canvasColor,
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        backgroundColor: surfaceColor,
        foregroundColor: textColor,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: surfaceColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(
          fontFamily: fontFamily,
          color: textColor,
          fontSize: 24,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: TextStyle(
          fontFamily: fontFamily,
          color: textColor,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        bodyMedium: TextStyle(
          fontFamily: fontFamily,
          color: textColor,
          fontSize: 14,
          height: 1.7,
        ),
      ),
    );
  }
}
