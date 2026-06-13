import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({
    super.key,
    required this.phoneNumber,
    required this.onBack,
    required this.onVerify,
    this.isLoading = false,
    this.errorMessage,
  });

  final String phoneNumber;
  final VoidCallback onBack;
  final Future<void> Function(String code) onVerify;
  final bool isLoading;
  final String? errorMessage;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _codeController = TextEditingController();
  bool _didAutoSubmit = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submitIfComplete(String value) async {
    final code = value.trim();
    if (code.length != 5 || widget.isLoading || _didAutoSubmit) return;

    _didAutoSubmit = true;
    await widget.onVerify(code);
    if (mounted) {
      _didAutoSubmit = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('تایید کد'),
          leading: IconButton(
            onPressed: widget.onBack,
            icon: const Icon(Icons.arrow_back),
          ),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'کد تایید را وارد کن',
                  style: theme.textTheme.headlineMedium,
                ),
                const SizedBox(height: 12),
                Text(
                  'کد ارسال‌شده به ${widget.phoneNumber} را وارد کن.',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  autofillHints: const [AutofillHints.oneTimeCode],
                  maxLength: 5,
                  enabled: !widget.isLoading,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(5),
                  ],
                  onChanged: (value) async {
                    await _submitIfComplete(value);
                  },
                  decoration: const InputDecoration(
                    labelText: 'کد تایید',
                    hintText: 'مثلاً 12345',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (widget.errorMessage != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    widget.errorMessage!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  widget.isLoading
                      ? 'در حال بررسی کد...'
                      : 'به‌محض وارد شدن ۵ رقم، ورود خودکار انجام می‌شود.',
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
