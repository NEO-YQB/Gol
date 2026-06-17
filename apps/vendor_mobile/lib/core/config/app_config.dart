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

  static const mapIrApiKey = String.fromEnvironment(
    'MAP_IR_API_KEY',
    defaultValue: '',
  );

  static const mapIrStyleUrl = String.fromEnvironment(
    'MAP_IR_STYLE_URL',
    defaultValue: 'https://map.ir/vector/styles/main/mapir-xyz-style.json',
  );

  static const mapIrRtlPluginUrl = String.fromEnvironment(
    'MAP_IR_RTL_PLUGIN_URL',
    defaultValue:
        'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.4.0/mapbox-gl-rtl-text.js',
  );

  static const enableDevOtpBypass = bool.fromEnvironment(
    'ENABLE_DEV_OTP_BYPASS',
    defaultValue: false,
  );
}
