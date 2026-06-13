import 'package:flutter/material.dart';

import '../../../core/constants/app_strings.dart';
import '../../auth/data/auth_api_service.dart';
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
  final _authApiService = const AuthApiService();

  _BootstrapStep _step = _BootstrapStep.login;
  String _phoneNumber = '';
  AuthSession? _session;
  bool _isSendingOtp = false;
  bool _isVerifyingOtp = false;
  String? _loginErrorMessage;
  String? _otpErrorMessage;

  Future<void> _handleSubmitPhone(String phoneNumber) async {
    setState(() {
      _isSendingOtp = true;
      _loginErrorMessage = null;
    });

    try {
      await _authApiService.sendOtp(phoneNumber);

      if (!mounted) return;
      setState(() {
        _phoneNumber = phoneNumber;
        _step = _BootstrapStep.verifyOtp;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _loginErrorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loginErrorMessage = 'ارسال کد تایید ناموفق بود.';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isSendingOtp = false;
      });
    }
  }

  void _handleBackToLogin() {
    setState(() {
      _step = _BootstrapStep.login;
      _otpErrorMessage = null;
    });
  }

  Future<void> _handleVerify(String code) async {
    setState(() {
      _isVerifyingOtp = true;
      _otpErrorMessage = null;
    });

    try {
      final session = await _authApiService.verifyOtp(_phoneNumber, code);

      if (!mounted) return;
      setState(() {
        _session = session;
        _step = _BootstrapStep.authenticated;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _otpErrorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _otpErrorMessage = 'کد تایید معتبر نیست.';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isVerifyingOtp = false;
      });
    }
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
          isLoading: _isSendingOtp,
          errorMessage: _loginErrorMessage,
        );
      case _BootstrapStep.verifyOtp:
        return OtpVerificationScreen(
          phoneNumber: _phoneNumber,
          onBack: _handleBackToLogin,
          onVerify: _handleVerify,
          isLoading: _isVerifyingOtp,
          errorMessage: _otpErrorMessage,
        );
      case _BootstrapStep.authenticated:
        return DashboardScreen(
          phoneNumber: _session?.phoneNumber ?? _phoneNumber,
          onLogout: _handleLogout,
        );
    }
  }
}
