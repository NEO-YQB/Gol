class VendorBootstrap {
  const VendorBootstrap({
    this.fullName,
    this.roles = const [],
    this.effectivePermissions = const [],
    this.store,
    this.vendorOnboarding,
  });

  final String? fullName;
  final List<String> roles;
  final List<BootstrapPermission> effectivePermissions;
  final BootstrapStore? store;
  final VendorOnboardingState? vendorOnboarding;

  factory VendorBootstrap.fromJson(Map<String, dynamic> json) {
    return VendorBootstrap(
      fullName: (json['fullName'] as String?)?.trim().isEmpty == true
          ? null
          : json['fullName'] as String?,
      roles: (json['roles'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
      effectivePermissions:
          (json['effectivePermissions'] as List<dynamic>? ?? const [])
              .whereType<Map<String, dynamic>>()
              .map(BootstrapPermission.fromJson)
              .toList(),
      store: json['store'] is Map<String, dynamic>
          ? BootstrapStore.fromJson(json['store'] as Map<String, dynamic>)
          : null,
      vendorOnboarding: json['vendorOnboarding'] is Map<String, dynamic>
          ? VendorOnboardingState.fromJson(
              json['vendorOnboarding'] as Map<String, dynamic>,
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'roles': roles,
      'fullName': fullName,
      'effectivePermissions':
          effectivePermissions.map((item) => item.toJson()).toList(),
      'store': store?.toJson(),
      'vendorOnboarding': vendorOnboarding?.toJson(),
    };
  }
}

class BootstrapPermission {
  const BootstrapPermission({
    required this.action,
    required this.subject,
  });

  final String action;
  final String subject;

  factory BootstrapPermission.fromJson(Map<String, dynamic> json) {
    return BootstrapPermission(
      action: json['action'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'action': action,
      'subject': subject,
    };
  }
}

class BootstrapStore {
  const BootstrapStore({
    required this.id,
    required this.isVerified,
    required this.name,
    required this.slug,
  });

  final int id;
  final bool isVerified;
  final String name;
  final String slug;

  factory BootstrapStore.fromJson(Map<String, dynamic> json) {
    return BootstrapStore(
      id: json['id'] as int? ?? 0,
      isVerified: json['isVerified'] as bool? ?? false,
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'isVerified': isVerified,
      'name': name,
      'slug': slug,
    };
  }
}

class VendorOnboardingState {
  const VendorOnboardingState({
    required this.applicationStatus,
    required this.productStatus,
    this.storeActivatedAt,
  });

  final String applicationStatus;
  final String productStatus;
  final String? storeActivatedAt;

  factory VendorOnboardingState.fromJson(Map<String, dynamic> json) {
    return VendorOnboardingState(
      applicationStatus: json['applicationStatus'] as String? ?? '',
      productStatus: json['productStatus'] as String? ?? '',
      storeActivatedAt: json['storeActivatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'applicationStatus': applicationStatus,
      'productStatus': productStatus,
      'storeActivatedAt': storeActivatedAt,
    };
  }
}
