import 'dart:io';

import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../../discounts/domain/vendor_discount.dart';
import '../../data/products_api_service.dart';
import '../../data/repositories/products_repository.dart';
import '../../domain/product_editor_models.dart';
import '../../domain/vendor_product_detail.dart';

class ProductWorkspaceViewState {
  const ProductWorkspaceViewState({
    this.product,
    this.isLoading = true,
    this.isSaving = false,
    this.isUploadingMainImage = false,
    this.isUploadingGallery = false,
    this.errorMessage,
    this.successMessage,
    this.mainImageUrl = '',
    this.pendingMainImageFile,
    this.productTypes = const [],
    this.elements = const [],
    this.gallery = const [],
    this.compositions = const [],
    this.discounts = const [],
  });

  final VendorProductDetail? product;
  final bool isLoading;
  final bool isSaving;
  final bool isUploadingMainImage;
  final bool isUploadingGallery;
  final String? errorMessage;
  final String? successMessage;
  final String mainImageUrl;
  final File? pendingMainImageFile;
  final List<ProductTypeOption> productTypes;
  final List<ProductElementOption> elements;
  final List<EditableGalleryItem> gallery;
  final List<EditableCompositionItem> compositions;
  final List<VendorDiscount> discounts;

  List<ProductElementOption> get allowedElements {
    final currentProduct = product;
    if (currentProduct == null) return const [];
    ProductTypeOption? type;
    for (final item in productTypes) {
      if (item.id == currentProduct.productTypeId) {
        type = item;
        break;
      }
    }
    if (type == null || type.allowedElementIds.isEmpty) return elements;
    return elements
        .where((item) => type!.allowedElementIds.contains(item.id))
        .toList();
  }

  ProductWorkspaceViewState copyWith({
    VendorProductDetail? product,
    bool? isLoading,
    bool? isSaving,
    bool? isUploadingMainImage,
    bool? isUploadingGallery,
    String? errorMessage,
    bool clearError = false,
    String? successMessage,
    bool clearSuccess = false,
    String? mainImageUrl,
    File? pendingMainImageFile,
    bool clearPendingMainImageFile = false,
    List<ProductTypeOption>? productTypes,
    List<ProductElementOption>? elements,
    List<EditableGalleryItem>? gallery,
    List<EditableCompositionItem>? compositions,
    List<VendorDiscount>? discounts,
  }) {
    return ProductWorkspaceViewState(
      product: product ?? this.product,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      isUploadingMainImage: isUploadingMainImage ?? this.isUploadingMainImage,
      isUploadingGallery: isUploadingGallery ?? this.isUploadingGallery,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      successMessage:
          clearSuccess ? null : successMessage ?? this.successMessage,
      mainImageUrl: mainImageUrl ?? this.mainImageUrl,
      pendingMainImageFile: clearPendingMainImageFile
          ? null
          : pendingMainImageFile ?? this.pendingMainImageFile,
      productTypes: productTypes ?? this.productTypes,
      elements: elements ?? this.elements,
      gallery: gallery ?? this.gallery,
      compositions: compositions ?? this.compositions,
      discounts: discounts ?? this.discounts,
    );
  }
}

class ProductWorkspaceViewModel extends ChangeNotifier {
  ProductWorkspaceViewModel({
    required String accessToken,
    required String productSlug,
    ProductsRepository repository = const ProductsRepository(),
  })  : _accessToken = accessToken,
        _productSlug = productSlug,
        _repository = repository;

  final String _accessToken;
  final String _productSlug;
  final ProductsRepository _repository;
  bool _isDisposed = false;

  ProductWorkspaceViewState _state = const ProductWorkspaceViewState();
  ProductWorkspaceViewState get state => _state;

  Future<void> loadDetail() async {
    _state = _state.copyWith(isLoading: true, clearError: true);
    _notifyIfActive();

    try {
      final typesFuture = _repository.getEditorOptions();
      final product = await _repository.getProductDetail(
        accessToken: _accessToken,
        slug: _productSlug,
      );
      final options = await typesFuture;
      final discounts = await _repository.getDiscounts(
        accessToken: _accessToken,
        storeId: product.storeId,
        productId: product.id,
      );

      if (_isDisposed) return;
      _state = _state.copyWith(
        product: product,
        productTypes: options.productTypes,
        elements: options.elements,
        discounts: discounts,
      );
      _fillFormState(product);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isLoading: false);
      _notifyIfActive();
    }
  }

  String displayPriceLabel({
    required String price,
    required String discountPrice,
  }) {
    final product = _state.product;
    if (product == null) return '';

    final editedBasePrice = _parseNum(price) ?? product.price;
    final editedLegacyDiscount = _parseNum(discountPrice);
    VendorDiscount? activeDiscount;
    final now = DateTime.now();
    for (final item in _state.discounts) {
      if (item.productId != product.id || !item.isActive) continue;
      final startAt = DateTime.tryParse(item.startAt)?.toLocal();
      final endAt = DateTime.tryParse(item.endAt)?.toLocal();
      if (startAt != null && now.isBefore(startAt)) continue;
      if (endAt != null && now.isAfter(endAt)) continue;
      activeDiscount = item;
      break;
    }

    final resolved = activeDiscount != null
        ? resolveDiscountedPrice(
            basePrice: editedBasePrice,
            discount: activeDiscount,
            now: now,
          )
        : editedLegacyDiscount ?? editedBasePrice;

    return _formatPrice(resolved);
  }

  Future<void> uploadMainImage(File file) async {
    if (_state.isSaving || _state.isUploadingMainImage) return;

    _state = _state.copyWith(
      isUploadingMainImage: true,
      pendingMainImageFile: file,
      clearError: true,
      clearSuccess: true,
    );
    _notifyIfActive();

    try {
      final uploadedUrl = await _repository.uploadProductImage(
        accessToken: _accessToken,
        file: file,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(
        mainImageUrl: uploadedUrl,
        isUploadingMainImage: false,
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        isUploadingMainImage: false,
        clearPendingMainImageFile: true,
        errorMessage: error.message,
      );
    }
    _notifyIfActive();
  }

  Future<void> uploadGalleryImage(File file) async {
    if (_state.isSaving || _state.isUploadingGallery) return;

    _state = _state.copyWith(
      isUploadingGallery: true,
      clearError: true,
      clearSuccess: true,
    );
    _notifyIfActive();

    try {
      final uploadedUrl = await _repository.uploadProductImage(
        accessToken: _accessToken,
        file: file,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(
        gallery: [
          ..._state.gallery,
          EditableGalleryItem(url: uploadedUrl, alt: ''),
        ],
        isUploadingGallery: false,
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        isUploadingGallery: false,
        errorMessage: error.message,
      );
    }
    _notifyIfActive();
  }

  void updateGalleryAlt(int index, String value) {
    final next = [..._state.gallery];
    next[index] = next[index].copyWith(alt: value);
    _state = _state.copyWith(gallery: next);
    _notifyIfActive();
  }

  void removeGalleryItem(int index) {
    final next = [..._state.gallery]..removeAt(index);
    _state = _state.copyWith(gallery: next);
    _notifyIfActive();
  }

  void addComposition() {
    _state = _state.copyWith(
      compositions: [
        ..._state.compositions,
        EditableCompositionItem.empty(),
      ],
    );
    _notifyIfActive();
  }

  void removeComposition(int index) {
    final next = [..._state.compositions]..removeAt(index);
    _state = _state.copyWith(compositions: next);
    _notifyIfActive();
  }

  void updateComposition(int index, EditableCompositionItem item) {
    final next = [..._state.compositions];
    next[index] = item;
    _state = _state.copyWith(compositions: next);
    _notifyIfActive();
  }

  Future<VendorProductDetail?> saveProduct({
    required String name,
    required String price,
    required String discountPrice,
    required String quantity,
    required String mainImageAlt,
    required String shortDescription,
    required String description,
  }) async {
    final product = _state.product;
    if (product == null) return null;

    if (name.trim().isEmpty ||
        price.trim().isEmpty ||
        quantity.trim().isEmpty ||
        _state.mainImageUrl.trim().isEmpty) {
      _state = _state.copyWith(
        errorMessage: 'نام، قیمت، موجودی و تصویر شاخص الزامی هستند.',
        clearSuccess: true,
      );
      _notifyIfActive();
      return null;
    }

    _state = _state.copyWith(
      isSaving: true,
      clearError: true,
      clearSuccess: true,
    );
    _notifyIfActive();

    try {
      final updated = await _repository.updateProduct(
        accessToken: _accessToken,
        productId: product.id,
        slug: product.slug,
        input: {
          'name': name.trim(),
          'price': _parseNum(price) ?? product.price,
          'discountPrice': _parseNum(discountPrice),
          'quantity': _parseInt(quantity) ?? product.quantity,
          'mainImage': _state.mainImageUrl,
          'mainImageAlt': _emptyToNull(mainImageAlt),
          'shortDescription': _emptyToNull(shortDescription),
          'description': _emptyToNull(description),
          'storeId': product.storeId,
          'categoryId': product.categoryId,
          'productTypeId': product.productTypeId,
          'gallery': _state.gallery
              .where((item) => item.url.trim().isNotEmpty)
              .map((item) => item.toJson())
              .toList(),
          'compositions': _state.compositions
              .where((item) => item.elementId != null)
              .map((item) => item.toJson())
              .toList(),
        },
      );

      if (_isDisposed) return updated;
      _state = _state.copyWith(
        product: updated,
        successMessage: 'تغییرات محصول ذخیره شد.',
      );
      _fillFormState(updated);
      return updated;
    } on AuthApiException catch (error) {
      if (!_isDisposed) {
        _state = _state.copyWith(errorMessage: error.message);
      }
      return null;
    } finally {
      if (!_isDisposed) {
        _state = _state.copyWith(isSaving: false);
        _notifyIfActive();
      }
    }
  }

  void _fillFormState(VendorProductDetail product) {
    _state = _state.copyWith(
      mainImageUrl: product.mainImage,
      clearPendingMainImageFile: true,
      gallery: product.gallery.map(EditableGalleryItem.fromDetail).toList(),
      compositions:
          product.compositions.map(EditableCompositionItem.fromDetail).toList(),
    );
  }

  void _notifyIfActive() {
    if (!_isDisposed) notifyListeners();
  }

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }
}

int? _parseInt(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return int.tryParse(trimmed);
}

num? _parseNum(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return num.tryParse(trimmed);
}

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

String _formatPrice(num value) {
  final number = value.toInt().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < number.length; i++) {
    final reverseIndex = number.length - i;
    buffer.write(number[i]);
    if (reverseIndex > 1 && reverseIndex % 3 == 1) {
      buffer.write(',');
    }
  }
  return '${buffer.toString()} تومان';
}
