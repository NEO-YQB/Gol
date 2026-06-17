class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.golino.shop/v1',
  );

  static const mapReverseGeocodeUrl = String.fromEnvironment(
    'MAP_REVERSE_GEOCODE_URL',
    defaultValue: 'https://map.ir/reverse',
  );

  static const mapReverseGeocodeKey = String.fromEnvironment(
    'MAP_REVERSE_GEOCODE_KEY',
    defaultValue: '',
  );

  static const enableDevOtpBypass = bool.fromEnvironment(
    'ENABLE_DEV_OTP_BYPASS',
    defaultValue: false,
  );
}
