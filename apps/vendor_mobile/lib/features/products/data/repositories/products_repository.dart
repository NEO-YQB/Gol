import 'dart:io';

import '../../../discounts/data/vendor_discounts_api_service.dart';
import '../../../discounts/domain/vendor_discount.dart';
import '../products_api_service.dart';
import '../../domain/vendor_product_detail.dart';
import '../../domain/vendor_product_summary.dart';

class ProductEditorOptions {
  const ProductEditorOptions({
    required this.categories,
    required this.productTypes,
    required this.elements,
  });

  final List<ProductCategoryOption> categories;
  final List<ProductTypeOption> productTypes;
  final List<ProductElementOption> elements;
}

class ProductsOverview {
  const ProductsOverview({
    required this.products,
    required this.discounts,
  });

  final VendorProductListResponse products;
  final List<VendorDiscount> discounts;
}

class ProductsRepository {
  const ProductsRepository({
    ProductsApiService productsApiService = const ProductsApiService(),
    VendorDiscountsApiService discountsApiService =
        const VendorDiscountsApiService(),
  })  : _productsApiService = productsApiService,
        _discountsApiService = discountsApiService;

  final ProductsApiService _productsApiService;
  final VendorDiscountsApiService _discountsApiService;

  Future<ProductsOverview> getProductsOverview({
    required String accessToken,
    required int storeId,
    required String search,
    required String statusFilter,
  }) async {
    final productsFuture = _productsApiService.getProducts(
      accessToken: accessToken,
      storeId: storeId,
      search: search,
      publicationStatus: statusFilter == 'ALL' ? null : statusFilter,
    );
    final discountsFuture = _discountsApiService.getDiscounts(
      accessToken: accessToken,
      storeId: storeId,
    );
    final products = await productsFuture;
    final discounts = await discountsFuture;

    return ProductsOverview(
      products: products,
      discounts: discounts.items,
    );
  }

  Future<ProductEditorOptions> getEditorOptions() async {
    final categoriesFuture = _productsApiService.getCategories();
    final productTypesFuture = _productsApiService.getProductTypes();
    final elementsFuture = _productsApiService.getProductElements();

    return ProductEditorOptions(
      categories: await categoriesFuture,
      productTypes: await productTypesFuture,
      elements: await elementsFuture,
    );
  }

  Future<String> uploadProductImage({
    required String accessToken,
    required File file,
  }) {
    return _productsApiService.uploadProductImage(
      accessToken: accessToken,
      file: file,
    );
  }

  Future<VendorProductDetail> createProduct({
    required String accessToken,
    required Map<String, dynamic> input,
  }) {
    return _productsApiService.createProduct(
      accessToken: accessToken,
      input: input,
    );
  }

  Future<VendorProductDetail> getProductDetail({
    required String accessToken,
    required String slug,
  }) {
    return _productsApiService.getProductDetail(
      accessToken: accessToken,
      slug: slug,
    );
  }

  Future<List<VendorDiscount>> getDiscounts({
    required String accessToken,
    required int storeId,
    int? productId,
  }) async {
    final discounts = await _discountsApiService.getDiscounts(
      accessToken: accessToken,
      storeId: storeId,
    );
    if (productId == null) return discounts.items;
    return discounts.items.where((item) => item.productId == productId).toList();
  }

  Future<VendorProductDetail> updateProduct({
    required String accessToken,
    required int productId,
    required String slug,
    required Map<String, dynamic> input,
  }) {
    return _productsApiService.updateProduct(
      accessToken: accessToken,
      productId: productId,
      slug: slug,
      input: input,
    );
  }
}
