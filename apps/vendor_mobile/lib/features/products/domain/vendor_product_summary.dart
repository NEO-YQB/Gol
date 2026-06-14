class VendorProductSummary {
  const VendorProductSummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.price,
    required this.discountPrice,
    required this.mainImage,
    required this.publicationStatus,
    required this.reviewNote,
    required this.isPurchasable,
    required this.isArchived,
  });

  final int id;
  final String name;
  final String slug;
  final num price;
  final num? discountPrice;
  final String mainImage;
  final String publicationStatus;
  final String reviewNote;
  final bool isPurchasable;
  final bool isArchived;

  factory VendorProductSummary.fromJson(Map<String, dynamic> json) {
    return VendorProductSummary(
      id: _asInt(json['id']),
      name: _readText(json, const ['name'], fallback: 'محصول بدون نام'),
      slug: _readText(json, const ['slug']),
      price: _asNum(json['price']),
      discountPrice: _asNullableNum(json['discountPrice']),
      mainImage: _readText(json, const ['mainImage']),
      publicationStatus:
          _readText(json, const ['publicationStatus'], fallback: 'DRAFT'),
      reviewNote: _readText(json, const ['reviewNote']),
      isPurchasable: json['isPurchasable'] == true,
      isArchived: json['isArchived'] == true,
    );
  }
}

class VendorProductListResponse {
  const VendorProductListResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.lastPage,
  });

  final List<VendorProductSummary> items;
  final int total;
  final int page;
  final int lastPage;

  factory VendorProductListResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is List ? json['data'] as List : const [];
    final meta = json['meta'] is Map<String, dynamic>
        ? json['meta'] as Map<String, dynamic>
        : const <String, dynamic>{};

    return VendorProductListResponse(
      items: data
          .whereType<Map<String, dynamic>>()
          .map(VendorProductSummary.fromJson)
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

num? _asNullableNum(Object? value) {
  if (value == null) return null;
  if ('$value'.trim().isEmpty) return null;
  if (value is num) return value;
  return num.tryParse('$value');
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
