import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../core/constants/app_strings.dart';
import '../core/theme/app_theme.dart';
import '../features/app_shell/presentation/app_bootstrap_screen.dart';

class VendorMobileApp extends StatelessWidget {
  const VendorMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: AppStrings.appTitle,
      theme: AppTheme.light(),
      locale: const Locale('fa', 'IR'),
      supportedLocales: const [
        Locale('fa', 'IR'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const AppBootstrapScreen(),
    );
  }
}
