import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import '../../auth/data/auth_api_service.dart';
import '../domain/vendor_product_detail.dart';
import '../domain/vendor_product_summary.dart';

class ProductsApiService {
  const ProductsApiService();

  Future<List<ProductCategoryOption>> getCategories() async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/categories'),
            headers: const {
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری دسته‌بندی‌ها ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body);
      final rawItems = payload is List ? payload : const [];
      return _flattenCategories(rawItems);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<List<ProductTypeOption>> getProductTypes() async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/product-types'),
            headers: const {
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری نوع محصول ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body);
      final rawItems = payload is List ? payload : const [];
      return rawItems
          .whereType<Map<String, dynamic>>()
          .map(ProductTypeOption.fromJson)
          .toList();
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<List<ProductElementOption>> getProductElements() async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/products/elements'),
            headers: const {
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری المان‌ها ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body);
      final rawItems = payload is List ? payload : const [];
      return rawItems
          .whereType<Map<String, dynamic>>()
          .map(ProductElementOption.fromJson)
          .toList();
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<String> uploadProductImage({
    required String accessToken,
    required File file,
  }) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConfig.apiBaseUrl}/files/upload-product-image'),
      );

      request.headers['Authorization'] = 'Bearer $accessToken';
      request.files.add(
        await http.MultipartFile.fromPath('file', file.path),
      );

      final streamedResponse =
          await request.send().timeout(const Duration(seconds: 20));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'آپلود تصویر محصول ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body);
      if (payload is Map<String, dynamic>) {
        final url = payload['url']?.toString().trim() ?? '';
        if (url.isEmpty) {
          throw const AuthApiException('آدرس تصویر آپلودشده نامعتبر است.');
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }

        final apiRoot = AppConfig.apiBaseUrl.replaceFirst(RegExp(r'/v1/?$'), '');
        return '$apiRoot${url.startsWith('/') ? '' : '/'}$url';
      }

      throw const AuthApiException('پاسخ آپلود تصویر معتبر نیست.');
    } on TimeoutException {
      throw const AuthApiException('آپلود تصویر زمان‌بر شد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال برای آپلود تصویر برقرار نشد.');
    }
  }

  Future<VendorProductListResponse> getProducts({
    required String accessToken,
    required int storeId,
    String? search,
    String? publicationStatus,
  }) async {
    try {
      final uri = Uri.parse('${AppConfig.apiBaseUrl}/products').replace(
        queryParameters: {
          'storeId': '$storeId',
          'limit': '40',
          if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
          if (publicationStatus != null && publicationStatus.trim().isNotEmpty)
            'publicationStatus': publicationStatus.trim(),
        },
      );

      final response = await http
          .get(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری محصولات ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorProductListResponse.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<VendorProductDetail> getProductDetail({
    required String accessToken,
    required String slug,
  }) async {
    try {
      final response = await http
          .get(
            Uri.parse('${AppConfig.apiBaseUrl}/products/$slug'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'بارگذاری جزئیات محصول ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorProductDetail.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<VendorProductDetail> updateProduct({
    required String accessToken,
    required int productId,
    required String slug,
    required Map<String, dynamic> input,
  }) async {
    try {
      final response = await http
          .patch(
            Uri.parse('${AppConfig.apiBaseUrl}/products/$productId'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: jsonEncode(input),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'ذخیره محصول ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      return getProductDetail(
        accessToken: accessToken,
        slug: slug,
      );
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  Future<VendorProductDetail> createProduct({
    required String accessToken,
    required Map<String, dynamic> input,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('${AppConfig.apiBaseUrl}/products'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
            body: jsonEncode(input),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuthApiException(
          _extractErrorMessage(response.body, 'ساخت محصول ناموفق بود.'),
          statusCode: response.statusCode,
        );
      }

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      return VendorProductDetail.fromJson(payload);
    } on TimeoutException {
      throw const AuthApiException('پاسخی از سرور دریافت نشد. دوباره تلاش کن.');
    } on SocketException {
      throw const AuthApiException('اتصال به سرور برقرار نشد.');
    }
  }

  String _extractErrorMessage(String body, String fallback) {
    if (body.isEmpty) return fallback;

    try {
      final payload = jsonDecode(body);
      if (payload is Map<String, dynamic>) {
        final message = payload['message'];
        if (message is String && message.trim().isNotEmpty) {
          return message;
        }
        if (message is List && message.isNotEmpty) {
          return message.first.toString();
        }
      }
    } catch (_) {
      return fallback;
    }

    return fallback;
  }
}

class ProductCategoryOption {
  const ProductCategoryOption({
    required this.id,
    required this.name,
  });

  final int id;
  final String name;
}

class ProductTypeOption {
  const ProductTypeOption({
    required this.id,
    required this.name,
    required this.allowedElementIds,
  });

  final int id;
  final String name;
  final List<int> allowedElementIds;

  factory ProductTypeOption.fromJson(Map<String, dynamic> json) {
    return ProductTypeOption(
      id: _asInt(json['id']),
      name: json['name']?.toString().trim().isNotEmpty == true
          ? json['name'].toString().trim()
          : 'نوع محصول',
      allowedElementIds: _readAllowedElementIds(json['allowedElements']),
    );
  }
}

class ProductElementOption {
  const ProductElementOption({
    required this.id,
    required this.name,
    required this.type,
    required this.unit,
  });

  final int id;
  final String name;
  final String type;
  final String unit;

  factory ProductElementOption.fromJson(Map<String, dynamic> json) {
    return ProductElementOption(
      id: _asInt(json['id']),
      name: json['name']?.toString().trim().isNotEmpty == true
          ? json['name'].toString().trim()
          : 'المان',
      type: json['type']?.toString().trim() ?? '',
      unit: json['unit']?.toString().trim() ?? '',
    );
  }
}

List<ProductCategoryOption> _flattenCategories(List<dynamic> rawItems) {
  final output = <ProductCategoryOption>[];

  void walk(List<dynamic> items, [String prefix = '']) {
    for (final item in items) {
      if (item is! Map<String, dynamic>) continue;
      final id = _asInt(item['id']);
      final name = item['name']?.toString().trim() ?? '';
      if (id > 0 && name.isNotEmpty) {
        output.add(
          ProductCategoryOption(
            id: id,
            name: prefix.isEmpty ? name : '$prefix ← $name',
          ),
        );
      }

      final children = item['children'];
      if (children is List && children.isNotEmpty) {
        walk(children, name);
      }
    }
  }

  walk(rawItems);
  return output;
}

int _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

List<int> _readAllowedElementIds(Object? value) {
  if (value is! List) return const [];

  return value
      .map((item) {
        if (item is num) return item.toInt();
        if (item is String) return int.tryParse(item.trim());
        if (item is Map<String, dynamic>) {
          return _asInt(item['id']);
        }
        return null;
      })
      .whereType<int>()
      .where((item) => item > 0)
      .toList();
}
