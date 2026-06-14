class VendorDiscount {
  const VendorDiscount({
    required this.id,
    required this.title,
    required this.description,
    required this.valueType,
    required this.value,
    required this.priority,
    required this.isActive,
    required this.isExclusive,
    required this.allowCouponStacking,
    required this.startAt,
    required this.endAt,
    required this.productId,
    required this.productName,
    required this.productPrice,
    required this.storeName,
  });

  final int id;
  final String title;
  final String description;
  final String valueType;
  final num value;
  final int priority;
  final bool isActive;
  final bool isExclusive;
  final bool allowCouponStacking;
  final String startAt;
  final String endAt;
  final int productId;
  final String productName;
  final num productPrice;
  final String storeName;

  factory VendorDiscount.fromJson(Map<String, dynamic> json) {
    final product = json['product'] is Map<String, dynamic>
        ? json['product'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final store = json['store'] is Map<String, dynamic>
        ? json['store'] as Map<String, dynamic>
        : const <String, dynamic>{};

    return VendorDiscount(
      id: _asInt(json['id']),
      title: _readText(json, const ['title'], fallback: 'تخفیف'),
      description: _readText(json, const ['description']),
      valueType: _readText(json, const ['valueType'], fallback: 'PERCENTAGE'),
      value: _asNum(json['value']),
      priority: _asInt(json['priority']),
      isActive: json['isActive'] == true,
      isExclusive: json['isExclusive'] == true,
      allowCouponStacking: json['allowCouponStacking'] == true,
      startAt: _readText(json, const ['startAt']),
      endAt: _readText(json, const ['endAt']),
      productId: _asInt(product['id']),
      productName: _readText(product, const ['name'], fallback: 'محصول'),
      productPrice: _asNum(product['price']),
      storeName: _readText(store, const ['name']),
    );
  }
}

class VendorDiscountListResponse {
  const VendorDiscountListResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.lastPage,
  });

  final List<VendorDiscount> items;
  final int total;
  final int page;
  final int lastPage;

  factory VendorDiscountListResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is List ? json['data'] as List : const [];
    final meta = json['meta'] is Map<String, dynamic>
        ? json['meta'] as Map<String, dynamic>
        : const <String, dynamic>{};

    return VendorDiscountListResponse(
      items: data
          .whereType<Map<String, dynamic>>()
          .map(VendorDiscount.fromJson)
          .toList(),
      total: _asInt(meta['total']),
      page: _asInt(meta['page']),
      lastPage: _asInt(meta['lastPage']),
    );
  }
}

int _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

num _asNum(Object? value) {
  if (value is num) return value;
  return num.tryParse('$value') ?? 0;
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
