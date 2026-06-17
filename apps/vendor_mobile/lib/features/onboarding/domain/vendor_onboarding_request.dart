class VendorOnboardingRequest {
  const VendorOnboardingRequest({
    required this.id,
    required this.applicationStatus,
    required this.productStatus,
    required this.personalFullName,
    required this.personalNationalId,
    required this.businessName,
    required this.businessSlug,
    required this.businessDescription,
    required this.businessAddress,
    required this.businessLat,
    required this.businessLng,
    required this.licenseNumber,
    required this.licenseImageUrl,
    required this.documents,
    required this.productName,
    required this.productDescription,
    required this.productMainImage,
    required this.productMainImageAlt,
    required this.productGalleryImages,
    required this.productGalleryAlts,
    required this.productCategoryId,
    required this.productTypeId,
    required this.productPrice,
    required this.productQuantity,
    required this.reviewNote,
    required this.productReviewNote,
  });

  final int id;
  final String applicationStatus;
  final String productStatus;
  final String personalFullName;
  final String personalNationalId;
  final String businessName;
  final String businessSlug;
  final String businessDescription;
  final String businessAddress;
  final double? businessLat;
  final double? businessLng;
  final String licenseNumber;
  final String licenseImageUrl;
  final List<OnboardingDocument> documents;
  final String productName;
  final String productDescription;
  final String productMainImage;
  final String productMainImageAlt;
  final List<String> productGalleryImages;
  final List<String> productGalleryAlts;
  final int? productCategoryId;
  final int? productTypeId;
  final num? productPrice;
  final int? productQuantity;
  final String reviewNote;
  final String productReviewNote;

  bool get applicationApproved => applicationStatus == 'APPROVED';
  bool get productApproved => productStatus == 'APPROVED';

  factory VendorOnboardingRequest.fromJson(Map<String, dynamic> json) {
    final documents = (json['documents'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(OnboardingDocument.fromJson)
        .toList();

    return VendorOnboardingRequest(
      id: _asInt(json['id']),
      applicationStatus: _readText(json, const ['applicationStatus'], fallback: 'DRAFT'),
      productStatus: _readText(json, const ['productStatus'], fallback: 'DRAFT'),
      personalFullName: _readText(json, const ['personalFullName']),
      personalNationalId: _readText(json, const ['personalNationalId']),
      businessName: _readText(json, const ['businessName']),
      businessSlug: _readText(json, const ['businessSlug']),
      businessDescription: _readText(json, const ['businessDescription']),
      businessAddress: _readText(json, const ['businessAddress']),
      businessLat: _asNullableDouble(json['businessLat']),
      businessLng: _asNullableDouble(json['businessLng']),
      licenseNumber: _readText(json, const ['licenseNumber']),
      licenseImageUrl: _readText(json, const ['licenseImageUrl']),
      documents: documents,
      productName: _readText(json, const ['productName']),
      productDescription: _readText(json, const ['productDescription']),
      productMainImage: _readText(json, const ['productMainImage']),
      productMainImageAlt: _readText(json, const ['productMainImageAlt']),
      productGalleryImages: _readStringList(json['productGalleryImages']),
      productGalleryAlts: _readStringList(json['productGalleryAlts']),
      productCategoryId: _asNullableInt(json['productCategoryId']),
      productTypeId: _asNullableInt(json['productTypeId']),
      productPrice: _asNullableNum(json['productPrice']),
      productQuantity: _asNullableInt(json['productQuantity']),
      reviewNote: _readText(json, const ['reviewNote']),
      productReviewNote: _readText(json, const ['productReviewNote']),
    );
  }
}

class OnboardingDocument {
  const OnboardingDocument({
    required this.title,
    required this.url,
  });

  final String title;
  final String url;

  factory OnboardingDocument.fromJson(Map<String, dynamic> json) {
    return OnboardingDocument(
      title: _readText(json, const ['title']),
      url: _readText(json, const ['url']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'url': url,
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
  final text = '$value'.trim();
  if (text.isEmpty) return null;
  return int.tryParse(text);
}

double? _asNullableDouble(Object? value) {
  if (value == null) return null;
  final text = '$value'.trim();
  if (text.isEmpty) return null;
  return double.tryParse(text);
}

num? _asNullableNum(Object? value) {
  if (value == null) return null;
  final text = '$value'.trim();
  if (text.isEmpty) return null;
  return num.tryParse(text);
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

List<String> _readStringList(Object? value) {
  if (value is! List) return const [];
  return value.map((item) => item.toString().trim()).where((item) => item.isNotEmpty).toList();
}
