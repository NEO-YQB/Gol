import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
import '../features/app_shell/presentation/app_bootstrap_screen.dart';

class VendorMobileApp extends StatelessWidget {
  const VendorMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'اپ فروشنده',
      theme: AppTheme.light(),
      home: const AppBootstrapScreen(),
    );
  }
}
