class VendorProductDetail {
  const VendorProductDetail({
    required this.id,
    required this.name,
    required this.slug,
    required this.price,
    required this.discountPrice,
    required this.quantity,
    required this.mainImage,
    required this.mainImageAlt,
    required this.description,
    required this.shortDescription,
    required this.publicationStatus,
    required this.reviewNote,
    required this.isPurchasable,
    required this.isArchived,
    required this.categoryName,
    required this.productTypeName,
    required this.storeName,
    required this.gallery,
  });

  final int id;
  final String name;
  final String slug;
  final num price;
  final num? discountPrice;
  final int quantity;
  final String mainImage;
  final String mainImageAlt;
  final String description;
  final String shortDescription;
  final String publicationStatus;
  final String reviewNote;
  final bool isPurchasable;
  final bool isArchived;
  final String categoryName;
  final String productTypeName;
  final String storeName;
  final List<String> gallery;

  factory VendorProductDetail.fromJson(Map<String, dynamic> json) {
    return VendorProductDetail(
      id: _asInt(json['id']),
      name: _readText(json, const ['name'], fallback: 'محصول بدون نام'),
      slug: _readText(json, const ['slug']),
      price: _asNum(json['price']),
      discountPrice: _asNullableNum(json['discountPrice']),
      quantity: _asInt(json['quantity']),
      mainImage: _readText(json, const ['mainImage']),
      mainImageAlt: _readText(json, const ['mainImageAlt']),
      description: _readText(json, const ['description']),
      shortDescription: _readText(json, const ['shortDescription']),
      publicationStatus:
          _readText(json, const ['publicationStatus'], fallback: 'DRAFT'),
      reviewNote: _readText(json, const ['reviewNote']),
      isPurchasable: json['isPurchasable'] == true,
      isArchived: json['isArchived'] == true,
      categoryName: _readNestedText(json['category'], const ['name']),
      productTypeName: _readNestedText(json['productType'], const ['name']),
      storeName: _readNestedText(json['store'], const ['name']),
      gallery: _readGallery(json),
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

String _readNestedText(
  Object? value,
  List<String> keys, {
  String fallback = '',
}) {
  if (value is! Map<String, dynamic>) return fallback;
  return _readText(value, keys, fallback: fallback);
}

List<String> _readGallery(Map<String, dynamic> json) {
  final raw = json['gallery'];
  if (raw is List) {
    return raw
        .map((item) {
          if (item is String) return item.trim();
          if (item is Map<String, dynamic>) {
            return _readText(item, const ['url', 'src']);
          }
          return '';
        })
        .where((item) => item.isNotEmpty)
        .toList();
  }
  return const [];
}
