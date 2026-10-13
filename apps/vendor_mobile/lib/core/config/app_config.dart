class AppConfig {
  static const _defaultApiBaseUrl = 'https://api.golino.shop/v1';

  static const _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: _defaultApiBaseUrl,
  );

  static String get apiBaseUrl => _normalizeApiBaseUrl(_apiBaseUrl);

  static const enableDevOtpBypass = bool.fromEnvironment(
    'ENABLE_DEV_OTP_BYPASS',
    defaultValue: false,
  );

  static String _normalizeApiBaseUrl(String value) {
    final normalizedDomain = value.trim().replaceFirst(RegExp(r'/+$'), '');

    if (normalizedDomain.isEmpty) {
      return _defaultApiBaseUrl;
    }

    if (normalizedDomain.endsWith('/v1')) {
      return normalizedDomain;
    }

    return '$normalizedDomain/v1';
  }
}
