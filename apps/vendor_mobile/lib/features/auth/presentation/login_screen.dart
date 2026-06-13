import 'package:flutter/material.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.onSubmitPhone,
    this.isLoading = false,
    this.errorMessage,
  });

  final Future<void> Function(String phoneNumber) onSubmitPhone;
  final bool isLoading;
  final String? errorMessage;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('ورود فروشنده'),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'ورود با شماره موبایل',
                  style: theme.textTheme.headlineMedium,
                ),
                const SizedBox(height: 12),
                Text(
                  'شماره موبایل فروشنده را وارد کن تا کد تایید ارسال شود.',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  enabled: !widget.isLoading,
                  decoration: const InputDecoration(
                    labelText: 'شماره موبایل',
                    hintText: 'مثلاً 09121234567',
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
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: widget.isLoading
                      ? null
                      : () async {
                    final phoneNumber = _phoneController.text.trim();
                    if (phoneNumber.isEmpty) return;
                    await widget.onSubmitPhone(phoneNumber);
                  },
                  child: Text(widget.isLoading ? 'در حال ارسال...' : 'ارسال کد تایید'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
