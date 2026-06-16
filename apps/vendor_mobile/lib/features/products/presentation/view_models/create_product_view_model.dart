import 'dart:io';

import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../data/products_api_service.dart';
import '../../data/repositories/products_repository.dart';
import '../../domain/product_editor_models.dart';
import '../../domain/vendor_product_detail.dart';

class CreateProductViewState {
  const CreateProductViewState({
    this.isBootstrapping = true,
    this.isSaving = false,
    this.isUploadingMainImage = false,
    this.isUploadingGallery = false,
    this.errorMessage,
    this.categories = const [],
    this.productTypes = const [],
    this.elements = const [],
    this.selectedCategoryId,
    this.selectedProductTypeId,
    this.mainImageUrl = '',
    this.pendingMainImageFile,
    this.gallery = const [],
    this.compositions = const [],
  });

  final bool isBootstrapping;
  final bool isSaving;
  final bool isUploadingMainImage;
  final bool isUploadingGallery;
  final String? errorMessage;
  final List<ProductCategoryOption> categories;
  final List<ProductTypeOption> productTypes;
  final List<ProductElementOption> elements;
  final int? selectedCategoryId;
  final int? selectedProductTypeId;
  final String mainImageUrl;
  final File? pendingMainImageFile;
  final List<EditableGalleryItem> gallery;
  final List<EditableCompositionItem> compositions;

  List<ProductElementOption> get allowedElements {
    final selectedType = productTypes.where(
      (item) => item.id == selectedProductTypeId,
    );
    if (selectedType.isEmpty) return const [];
    final allowedIds = selectedType.first.allowedElementIds;
    if (allowedIds.isEmpty) return elements;
    return elements.where((item) => allowedIds.contains(item.id)).toList();
  }

  CreateProductViewState copyWith({
    bool? isBootstrapping,
    bool? isSaving,
    bool? isUploadingMainImage,
    bool? isUploadingGallery,
    String? errorMessage,
    bool clearError = false,
    List<ProductCategoryOption>? categories,
    List<ProductTypeOption>? productTypes,
    List<ProductElementOption>? elements,
    int? selectedCategoryId,
    bool clearSelectedCategoryId = false,
    int? selectedProductTypeId,
    bool clearSelectedProductTypeId = false,
    String? mainImageUrl,
    File? pendingMainImageFile,
    bool clearPendingMainImageFile = false,
    List<EditableGalleryItem>? gallery,
    List<EditableCompositionItem>? compositions,
  }) {
    return CreateProductViewState(
      isBootstrapping: isBootstrapping ?? this.isBootstrapping,
      isSaving: isSaving ?? this.isSaving,
      isUploadingMainImage: isUploadingMainImage ?? this.isUploadingMainImage,
      isUploadingGallery: isUploadingGallery ?? this.isUploadingGallery,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      categories: categories ?? this.categories,
      productTypes: productTypes ?? this.productTypes,
      elements: elements ?? this.elements,
      selectedCategoryId: clearSelectedCategoryId
          ? null
          : selectedCategoryId ?? this.selectedCategoryId,
      selectedProductTypeId: clearSelectedProductTypeId
          ? null
          : selectedProductTypeId ?? this.selectedProductTypeId,
      mainImageUrl: mainImageUrl ?? this.mainImageUrl,
      pendingMainImageFile: clearPendingMainImageFile
          ? null
          : pendingMainImageFile ?? this.pendingMainImageFile,
      gallery: gallery ?? this.gallery,
      compositions: compositions ?? this.compositions,
    );
  }
}

class CreateProductViewModel extends ChangeNotifier {
  CreateProductViewModel({
    required String accessToken,
    required int storeId,
    ProductsRepository repository = const ProductsRepository(),
  })  : _accessToken = accessToken,
        _storeId = storeId,
        _repository = repository;

  final String _accessToken;
  final int _storeId;
  final ProductsRepository _repository;
  bool _isDisposed = false;

  CreateProductViewState _state = const CreateProductViewState();
  CreateProductViewState get state => _state;

  Future<void> loadOptions() async {
    _state = _state.copyWith(isBootstrapping: true, clearError: true);
    _notifyIfActive();

    try {
      final options = await _repository.getEditorOptions();
      if (_isDisposed) return;
      _state = _state.copyWith(
        categories: options.categories,
        productTypes: options.productTypes,
        elements: options.elements,
        selectedCategoryId:
            options.categories.isNotEmpty ? options.categories.first.id : null,
        clearSelectedCategoryId: options.categories.isEmpty,
        selectedProductTypeId: options.productTypes.isNotEmpty
            ? options.productTypes.first.id
            : null,
        clearSelectedProductTypeId: options.productTypes.isEmpty,
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isBootstrapping: false);
      _notifyIfActive();
    }
  }

  void selectCategory(int? categoryId) {
    _state = _state.copyWith(
      selectedCategoryId: categoryId,
      clearSelectedCategoryId: categoryId == null,
    );
    _notifyIfActive();
  }

  void selectProductType(int? productTypeId) {
    _state = _state.copyWith(
      selectedProductTypeId: productTypeId,
      clearSelectedProductTypeId: productTypeId == null,
      compositions: const [],
    );
    _notifyIfActive();
  }

  Future<void> uploadMainImage(File file) async {
    if (_state.isSaving || _state.isUploadingMainImage) return;

    _state = _state.copyWith(
      isUploadingMainImage: true,
      pendingMainImageFile: file,
      clearError: true,
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

  Future<VendorProductDetail?> createProduct({
    required String name,
    required String price,
    required String discountPrice,
    required String quantity,
    required String mainImageAlt,
    required String shortDescription,
    required String description,
  }) async {
    if (name.trim().isEmpty ||
        price.trim().isEmpty ||
        quantity.trim().isEmpty ||
        _state.mainImageUrl.trim().isEmpty ||
        _state.selectedCategoryId == null ||
        _state.selectedProductTypeId == null) {
      _state = _state.copyWith(
        errorMessage:
            'نام، قیمت، موجودی، تصویر شاخص، دسته‌بندی و نوع محصول الزامی هستند.',
      );
      _notifyIfActive();
      return null;
    }

    _state = _state.copyWith(isSaving: true, clearError: true);
    _notifyIfActive();

    try {
      return await _repository.createProduct(
        accessToken: _accessToken,
        input: {
          'name': name.trim(),
          'price': _parseNum(price) ?? 0,
          'discountPrice': _parseNum(discountPrice),
          'quantity': _parseInt(quantity) ?? 0,
          'mainImage': _state.mainImageUrl,
          'mainImageAlt': _emptyToNull(mainImageAlt),
          'shortDescription': _emptyToNull(shortDescription),
          'description': _emptyToNull(description),
          'storeId': _storeId,
          'categoryId': _state.selectedCategoryId,
          'productTypeId': _state.selectedProductTypeId,
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
