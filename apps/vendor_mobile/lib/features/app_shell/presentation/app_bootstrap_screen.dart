import 'package:flutter/material.dart';

import '../../auth/domain/auth_session.dart';
import '../../auth/presentation/login_screen.dart';
import '../../auth/presentation/otp_verification_screen.dart';
import '../../dashboard/presentation/dashboard_screen.dart';

enum _BootstrapStep {
  login,
  verifyOtp,
  authenticated,
}

class AppBootstrapScreen extends StatefulWidget {
  const AppBootstrapScreen({super.key});

  @override
  State<AppBootstrapScreen> createState() => _AppBootstrapScreenState();
}

class _AppBootstrapScreenState extends State<AppBootstrapScreen> {
  _BootstrapStep _step = _BootstrapStep.login;
  String _phoneNumber = '';
  AuthSession? _session;

  void _handleSubmitPhone(String phoneNumber) {
    setState(() {
      _phoneNumber = phoneNumber;
      _step = _BootstrapStep.verifyOtp;
    });
  }

  void _handleBackToLogin() {
    setState(() {
      _step = _BootstrapStep.login;
    });
  }

  void _handleVerify(String code) {
    setState(() {
      _session = AuthSession(
        accessToken: 'demo-token-$code',
        phoneNumber: _phoneNumber,
      );
      _step = _BootstrapStep.authenticated;
    });
  }

  void _handleLogout() {
    setState(() {
      _session = null;
      _phoneNumber = '';
      _step = _BootstrapStep.login;
    });
  }

  @override
  Widget build(BuildContext context) {
    switch (_step) {
      case _BootstrapStep.login:
        return LoginScreen(
          onSubmitPhone: _handleSubmitPhone,
        );
      case _BootstrapStep.verifyOtp:
        return OtpVerificationScreen(
          phoneNumber: _phoneNumber,
          onBack: _handleBackToLogin,
          onVerify: _handleVerify,
        );
      case _BootstrapStep.authenticated:
        return DashboardScreen(
          phoneNumber: _session?.phoneNumber ?? _phoneNumber,
          onLogout: _handleLogout,
        );
    }
  }
}
