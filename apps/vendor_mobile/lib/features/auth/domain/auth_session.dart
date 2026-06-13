import 'vendor_bootstrap.dart';

class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.phoneNumber,
    this.bootstrap,
    this.isPreview = false,
  });

  final String accessToken;
  final String phoneNumber;
  final VendorBootstrap? bootstrap;
  final bool isPreview;

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'phoneNumber': phoneNumber,
      'bootstrap': bootstrap?.toJson(),
      'isPreview': isPreview,
    };
  }

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      accessToken: json['accessToken'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? '',
      bootstrap: json['bootstrap'] is Map<String, dynamic>
          ? VendorBootstrap.fromJson(json['bootstrap'] as Map<String, dynamic>)
          : null,
      isPreview: json['isPreview'] as bool? ?? false,
    );
  }
}
