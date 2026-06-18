import 'package:flutter/material.dart';

import '../../../core/services/push_notification_service.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../../auth/data/auth_session_storage.dart';
import '../../auth/domain/auth_session.dart';
import '../../auth/domain/vendor_bootstrap.dart';
import '../../auth/presentation/login_screen.dart';
import '../../auth/presentation/otp_verification_screen.dart';
import '../../onboarding/presentation/vendor_onboarding_screen.dart';
import 'vendor_app_shell.dart';

enum _BootstrapStep {
  checkingSession,
  login,
  verifyOtp,
  onboarding,
  authenticated,
}

class AppBootstrapScreen extends StatefulWidget {
  const AppBootstrapScreen({super.key});

  @override
  State<AppBootstrapScreen> createState() => _AppBootstrapScreenState();
}

class _AppBootstrapScreenState extends State<AppBootstrapScreen> {
  final _authApiService = const AuthApiService();
  final _authSessionStorage = AuthSessionStorage();

  _BootstrapStep _step = _BootstrapStep.checkingSession;
  String _phoneNumber = '';
  AuthSession? _session;
  bool _isSendingOtp = false;
  bool _isVerifyingOtp = false;
  String? _loginErrorMessage;
  String? _otpErrorMessage;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final storedSession = await _authSessionStorage.load();
    if (!mounted) return;

    if (storedSession != null) {
      if (storedSession.accessToken == 'dev-preview-token' || storedSession.isPreview) {
        await _authSessionStorage.clear();
      } else {
        try {
          final bootstrap = await _authApiService.getSessionBootstrap(
            storedSession.accessToken,
          );
          final refreshedSession = AuthSession(
            accessToken: storedSession.accessToken,
            phoneNumber: storedSession.phoneNumber,
            bootstrap: bootstrap,
          );
          await _authSessionStorage.save(refreshedSession);

          if (!mounted) return;
          setState(() {
            _session = refreshedSession;
            _phoneNumber = refreshedSession.phoneNumber;
            _step = _resolveBootstrapStep(bootstrap);
          });
          if (_step == _BootstrapStep.authenticated) {
            await PushNotificationService.instance.logToken(
              forceRefresh: true,
              reason: 'session-restore',
            );
            await PushNotificationService.instance.registerTokenForSession(
              accessToken: refreshedSession.accessToken,
            );
          }
          return;
        } catch (_) {
          await _authSessionStorage.clear();
        }
      }
    }

    setState(() {
      _session = null;
      _phoneNumber = '';
      _step = _BootstrapStep.login;
    });
  }

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
      final bootstrap = await _authApiService.getSessionBootstrap(
        session.accessToken,
      );
      final nextSession = AuthSession(
        accessToken: session.accessToken,
        phoneNumber: session.phoneNumber,
        bootstrap: bootstrap,
      );
      await _authSessionStorage.save(nextSession);

      if (!mounted) return;
      setState(() {
        _session = nextSession;
        _step = _resolveBootstrapStep(bootstrap);
      });
      if (_step == _BootstrapStep.authenticated) {
        await PushNotificationService.instance.logToken(
          forceRefresh: true,
          reason: 'otp-login',
        );
        await PushNotificationService.instance.registerTokenForSession(
          accessToken: nextSession.accessToken,
        );
      }
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

  _BootstrapStep _resolveBootstrapStep(VendorBootstrap bootstrap) {
    if (_isVendorPanelReady(bootstrap)) {
      return _BootstrapStep.authenticated;
    }
    return _BootstrapStep.onboarding;
  }

  bool _isVendorPanelReady(VendorBootstrap bootstrap) {
    final roles = bootstrap.roles;
    final onboarding = bootstrap.vendorOnboarding;
    final onboardingComplete =
        onboarding == null ||
        (onboarding.productStatus == 'APPROVED' &&
            (onboarding.storeActivatedAt?.trim().isNotEmpty ?? false));

    return roles.contains('VENDOR') &&
        bootstrap.store != null &&
        onboardingComplete;
  }

  Future<void> _handleOnboardingCompleted() async {
    final session = _session;
    if (session == null) return;

    try {
      final bootstrap = await _authApiService.getSessionBootstrap(
        session.accessToken,
      );
      final refreshedSession = AuthSession(
        accessToken: session.accessToken,
        phoneNumber: session.phoneNumber,
        bootstrap: bootstrap,
      );
      await _authSessionStorage.save(refreshedSession);

      if (!mounted) return;
      final nextStep = _resolveBootstrapStep(bootstrap);
      setState(() {
        _session = refreshedSession;
        _step = nextStep;
      });

      if (nextStep == _BootstrapStep.authenticated) {
        await PushNotificationService.instance.logToken(
          forceRefresh: true,
          reason: 'onboarding-complete',
        );
        await PushNotificationService.instance.registerTokenForSession(
          accessToken: refreshedSession.accessToken,
        );
      }
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _otpErrorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _otpErrorMessage = 'به‌روزرسانی وضعیت فروشنده ناموفق بود.';
      });
    }
  }

  Future<void> _handleLogout() async {
    await _authSessionStorage.clear();

    if (!mounted) return;
    setState(() {
      _session = null;
      _phoneNumber = '';
      _step = _BootstrapStep.login;
      _loginErrorMessage = null;
      _otpErrorMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    switch (_step) {
      case _BootstrapStep.checkingSession:
        return Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(
            body: AppShellBackground(
              child: const SafeArea(
                child: Center(
                  child: CircularProgressIndicator(),
                ),
              ),
            ),
          ),
        );
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
      case _BootstrapStep.onboarding:
        return VendorOnboardingScreen(
          session: _session!,
          onCompleted: _handleOnboardingCompleted,
          onLogout: _handleLogout,
        );
      case _BootstrapStep.authenticated:
        return VendorAppShell(
          session: _session!,
          onLogout: _handleLogout,
        );
    }
  }
}
