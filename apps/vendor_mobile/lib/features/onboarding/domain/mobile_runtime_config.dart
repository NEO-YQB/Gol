class MobileRuntimeConfig {
  const MobileRuntimeConfig({
    required this.mapProvider,
    required this.mapPublicKey,
    required this.mapStyleUrl,
    required this.mapRtlPluginUrl,
    required this.reverseGeocodeMode,
  });

  final String mapProvider;
  final String mapPublicKey;
  final String mapStyleUrl;
  final String mapRtlPluginUrl;
  final String reverseGeocodeMode;

  factory MobileRuntimeConfig.fromJson(Map<String, dynamic> json) {
    final map = json['map'] is Map<String, dynamic>
        ? json['map'] as Map<String, dynamic>
        : <String, dynamic>{};

    return MobileRuntimeConfig(
      mapProvider: map['provider']?.toString().trim() ?? '',
      mapPublicKey: map['publicKey']?.toString().trim() ?? '',
      mapStyleUrl: map['styleUrl']?.toString().trim() ?? '',
      mapRtlPluginUrl: map['rtlPluginUrl']?.toString().trim() ?? '',
      reverseGeocodeMode: map['reverseGeocodeMode']?.toString().trim() ?? 'proxy',
    );
  }
}
