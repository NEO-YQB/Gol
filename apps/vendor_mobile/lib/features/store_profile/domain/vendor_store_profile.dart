class VendorStoreProfile {
  const VendorStoreProfile({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    required this.logo,
    required this.address,
    required this.sameDayDelivery,
    required this.hasExpressDelivery,
    required this.minDeliveryHours,
    required this.maxDeliveryHours,
    required this.expressDeliveryHours,
    required this.isVerified,
    required this.productCount,
    required this.deliveryWindows,
  });

  final int id;
  final String name;
  final String slug;
  final String description;
  final String logo;
  final String address;
  final bool sameDayDelivery;
  final bool hasExpressDelivery;
  final int? minDeliveryHours;
  final int? maxDeliveryHours;
  final int? expressDeliveryHours;
  final bool isVerified;
  final int productCount;
  final List<StoreDeliveryWindow> deliveryWindows;

  factory VendorStoreProfile.fromJson(Map<String, dynamic> json) {
    final countRecord = json['_count'] as Map<String, dynamic>?;

    return VendorStoreProfile(
      id: _asInt(json['id']),
      name: _readText(json, const ['name'], fallback: 'فروشگاه شما'),
      slug: _readText(json, const ['slug']),
      description: _readText(json, const ['description']),
      logo: _readText(json, const ['logo']),
      address: _readText(json, const ['address']),
      sameDayDelivery: json['sameDayDelivery'] == true,
      hasExpressDelivery: json['hasExpressDelivery'] == true,
      minDeliveryHours: _asNullableInt(json['minDeliveryHours']),
      maxDeliveryHours: _asNullableInt(json['maxDeliveryHours']),
      expressDeliveryHours: _asNullableInt(json['expressDeliveryHours']),
      isVerified: json['isVerified'] == true,
      productCount: _asInt(
        countRecord != null ? countRecord['products'] : json['productsCount'],
      ),
      deliveryWindows: _readDeliveryWindows(json['deliveryWindows']),
    );
  }
}

class StoreDeliveryWindow {
  const StoreDeliveryWindow({
    required this.key,
    required this.label,
    required this.startTime,
    required this.endTime,
  });

  final String key;
  final String label;
  final String startTime;
  final String endTime;

  factory StoreDeliveryWindow.fromJson(Map<String, dynamic> json) {
    return StoreDeliveryWindow(
      key: _readText(json, const ['key']),
      label: _readText(json, const ['label']),
      startTime: _readText(json, const ['startTime']),
      endTime: _readText(json, const ['endTime']),
    );
  }
}

class UpdateVendorStoreProfileInput {
  const UpdateVendorStoreProfileInput({
    required this.name,
    required this.slug,
    required this.description,
    required this.logo,
    required this.sameDayDelivery,
    required this.hasExpressDelivery,
    required this.minDeliveryHours,
    required this.maxDeliveryHours,
    required this.expressDeliveryHours,
    required this.deliveryWindows,
  });

  final String name;
  final String slug;
  final String description;
  final String logo;
  final bool sameDayDelivery;
  final bool hasExpressDelivery;
  final int? minDeliveryHours;
  final int? maxDeliveryHours;
  final int? expressDeliveryHours;
  final List<StoreDeliveryWindow> deliveryWindows;

  Map<String, dynamic> toJson() {
    return {
      'name': name.trim(),
      'slug': slug.trim(),
      'description': description.trim().isEmpty ? null : description.trim(),
      'logo': logo.trim().isEmpty ? null : logo.trim(),
      'sameDayDelivery': sameDayDelivery,
      'hasExpressDelivery': hasExpressDelivery,
      'minDeliveryHours': minDeliveryHours,
      'maxDeliveryHours': maxDeliveryHours,
      'expressDeliveryHours': expressDeliveryHours,
      'deliveryWindows': deliveryWindows.isEmpty
          ? null
          : deliveryWindows
              .map(
                (item) => {
                  'key': item.key.trim(),
                  'label': item.label.trim(),
                  'startTime': item.startTime.trim(),
                  'endTime': item.endTime.trim(),
                },
              )
              .toList(),
    };
  }
}

int _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

int? _asNullableInt(Object? value) {
  if (value == null) return null;
  final parsed = _asInt(value);
  return parsed == 0 && '$value'.trim().isEmpty ? null : parsed;
}

String _readText(
  Map<String, dynamic> json,
  List<String> keys, {
  String fallback = '',
}) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) continue;
    final text = value.toString().trim();
    if (text.isNotEmpty) return text;
  }
  return fallback;
}

List<StoreDeliveryWindow> _readDeliveryWindows(Object? value) {
  if (value is! List) return const [];

  return value
      .whereType<Map<String, dynamic>>()
      .map(StoreDeliveryWindow.fromJson)
      .toList();
}
