import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../../discounts/data/vendor_discounts_api_service.dart';
import '../../discounts/domain/vendor_discount.dart';
import '../data/products_api_service.dart';
import '../domain/vendor_product_detail.dart';

class ProductWorkspaceScreen extends StatefulWidget {
  const ProductWorkspaceScreen({
    super.key,
    required this.accessToken,
    required this.productSlug,
  });

  final String accessToken;
  final String productSlug;

  @override
  State<ProductWorkspaceScreen> createState() => _ProductWorkspaceScreenState();
}

class _ProductWorkspaceScreenState extends State<ProductWorkspaceScreen> {
  final _apiService = const ProductsApiService();
  final _discountsApiService = const VendorDiscountsApiService();
  final _imagePicker = ImagePicker();

  late final TextEditingController _nameController;
  late final TextEditingController _priceController;
  late final TextEditingController _discountPriceController;
  late final TextEditingController _quantityController;
  late final TextEditingController _shortDescriptionController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _mainImageAltController;

  VendorProductDetail? _product;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploadingMainImage = false;
  bool _isUploadingGallery = false;
  String? _errorMessage;
  String? _successMessage;
  String _mainImageUrl = '';
  File? _pendingMainImageFile;
  List<_EditableGalleryItem> _gallery = const [];
  List<ProductTypeOption> _productTypes = const [];
  List<ProductElementOption> _elements = const [];
  List<_EditableCompositionItem> _compositions = const [];
  List<VendorDiscount> _discounts = const [];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _priceController = TextEditingController();
    _discountPriceController = TextEditingController();
    _quantityController = TextEditingController();
    _shortDescriptionController = TextEditingController();
    _descriptionController = TextEditingController();
    _mainImageAltController = TextEditingController();
    _loadDetail();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _discountPriceController.dispose();
    _quantityController.dispose();
    _shortDescriptionController.dispose();
    _descriptionController.dispose();
    _mainImageAltController.dispose();
    super.dispose();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final typesFuture = _apiService.getProductTypes();
      final elementsFuture = _apiService.getProductElements();
      final product = await _apiService.getProductDetail(
        accessToken: widget.accessToken,
        slug: widget.productSlug,
      );
      final types = await typesFuture;
      final elements = await elementsFuture;
      final discounts = await _discountsApiService.getDiscounts(
        accessToken: widget.accessToken,
        storeId: product.storeId,
      );

      if (!mounted) return;
      setState(() {
        _product = product;
        _productTypes = types;
        _elements = elements;
        _discounts = discounts.items.where((item) => item.productId == product.id).toList();
        _fillForm(product);
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  String _displayPriceLabel(VendorProductDetail product) {
    final editedBasePrice = _parseNum(_priceController.text) ?? product.price;
    final editedLegacyDiscount = _parseNum(_discountPriceController.text);
    VendorDiscount? activeDiscount;
    final now = DateTime.now();
    for (final item in _discounts) {
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

  void _fillForm(VendorProductDetail product) {
    _nameController.text = product.name;
    _priceController.text = product.price.toString();
    _discountPriceController.text = product.discountPrice?.toString() ?? '';
    _quantityController.text = product.quantity.toString();
    _shortDescriptionController.text = product.shortDescription;
    _descriptionController.text = product.description;
    _mainImageAltController.text = product.mainImageAlt;
    _mainImageUrl = product.mainImage;
    _pendingMainImageFile = null;
    _gallery = product.gallery
        .map(
          (item) => _EditableGalleryItem(
            url: item.url,
            alt: item.alt,
          ),
        )
        .toList();
    _compositions = product.compositions
        .map(
          (item) => _EditableCompositionItem(
            elementId: item.elementId,
            elementType: item.elementType,
            quantity: item.quantity,
          ),
        )
        .toList();
  }

  Future<void> _pickMainImage() async {
    if (_isSaving || _isUploadingMainImage) return;

    try {
      final file = await _pickCroppedImage(
        title: 'برش تصویر شاخص',
      );
      if (file == null || !mounted) return;

      setState(() {
        _isUploadingMainImage = true;
        _pendingMainImageFile = file;
        _errorMessage = null;
        _successMessage = null;
      });

      final uploadedUrl = await _apiService.uploadProductImage(
        accessToken: widget.accessToken,
        file: file,
      );

      if (!mounted) return;
      setState(() {
        _mainImageUrl = uploadedUrl;
        _isUploadingMainImage = false;
        _successMessage = 'تصویر شاخص آپلود شد.';
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _isUploadingMainImage = false;
        _pendingMainImageFile = null;
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isUploadingMainImage = false;
        _pendingMainImageFile = null;
        _errorMessage = 'انتخاب یا برش تصویر شاخص انجام نشد.';
      });
    }
  }

  Future<void> _pickGalleryImage() async {
    if (_isSaving || _isUploadingGallery) return;

    try {
      final file = await _pickCroppedImage(
        title: 'برش تصویر گالری',
      );
      if (file == null || !mounted) return;

      setState(() {
        _isUploadingGallery = true;
        _errorMessage = null;
        _successMessage = null;
      });

      final uploadedUrl = await _apiService.uploadProductImage(
        accessToken: widget.accessToken,
        file: file,
      );

      if (!mounted) return;
      setState(() {
        _gallery = [
          ..._gallery,
          _EditableGalleryItem(url: uploadedUrl, alt: ''),
        ];
        _isUploadingGallery = false;
        _successMessage = 'تصویر گالری اضافه شد.';
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _isUploadingGallery = false;
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isUploadingGallery = false;
        _errorMessage = 'انتخاب یا برش تصویر گالری انجام نشد.';
      });
    }
  }

  Future<File?> _pickCroppedImage({
    required String title,
  }) async {
    final pickedFile = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 92,
    );
    if (pickedFile == null) return null;

    final croppedFile = await ImageCropper().cropImage(
      sourcePath: pickedFile.path,
      compressFormat: ImageCompressFormat.jpg,
      compressQuality: 92,
      aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle: title,
          toolbarColor: AppColors.primary,
          toolbarWidgetColor: Colors.white,
          activeControlsWidgetColor: AppColors.primary,
          lockAspectRatio: true,
          initAspectRatio: CropAspectRatioPreset.square,
          hideBottomControls: false,
        ),
        IOSUiSettings(
          title: title,
          aspectRatioLockEnabled: true,
          resetAspectRatioEnabled: false,
        ),
      ],
    );

    if (croppedFile == null) return null;
    return File(croppedFile.path);
  }

  Future<void> _saveProduct() async {
    final product = _product;
    if (product == null) return;

    if (_nameController.text.trim().isEmpty ||
        _priceController.text.trim().isEmpty ||
        _quantityController.text.trim().isEmpty ||
        _mainImageUrl.trim().isEmpty) {
      setState(() {
        _errorMessage = 'نام، قیمت، موجودی و تصویر شاخص الزامی هستند.';
        _successMessage = null;
      });
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final updated = await _apiService.updateProduct(
        accessToken: widget.accessToken,
        productId: product.id,
        slug: product.slug,
        input: {
          'name': _nameController.text.trim(),
          'price': _parseNum(_priceController.text) ?? product.price,
          'discountPrice': _parseNum(_discountPriceController.text),
          'quantity': _parseInt(_quantityController.text) ?? product.quantity,
          'mainImage': _mainImageUrl,
          'mainImageAlt': _mainImageAltController.text.trim().isEmpty
              ? null
              : _mainImageAltController.text.trim(),
          'shortDescription': _emptyToNull(_shortDescriptionController.text),
          'description': _emptyToNull(_descriptionController.text),
          'storeId': product.storeId,
          'categoryId': product.categoryId,
          'productTypeId': product.productTypeId,
          'gallery': _gallery
              .where((item) => item.url.trim().isNotEmpty)
              .map(
                (item) => {
                  'url': item.url.trim(),
                  'alt': item.alt.trim().isEmpty ? null : item.alt.trim(),
                },
              )
              .toList(),
          'compositions': _compositions
              .where((item) => item.elementId != null)
              .map(
                (item) => {
                  'elementId': item.elementId,
                  'elementType': item.elementType,
                  'quantity': item.quantity,
                },
              )
              .toList(),
        },
      );

      if (!mounted) return;
      setState(() {
        _product = updated;
        _fillForm(updated);
        _successMessage = 'تغییرات محصول ذخیره شد.';
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final product = _product;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null && product == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: AppGlassCard(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _errorMessage!,
                                  style: theme.textTheme.bodyLarge,
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: AppSpacing.lg),
                                FilledButton(
                                  onPressed: _loadDetail,
                                  child: const Text('تلاش دوباره'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                    : product == null
                        ? const SizedBox.shrink()
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                            children: [
                              Row(
                                children: [
                                  IconButton(
                                    onPressed: () => Navigator.of(context).pop(),
                                    icon: const Icon(Icons.arrow_back_rounded),
                                  ),
                                  Expanded(
                                    child: Text(
                                      'جزئیات محصول',
                                      style: theme.textTheme.titleMedium,
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                  const SizedBox(width: 48),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.lg),
                              if (product.reviewNote.trim().isNotEmpty) ...[
                                AppGlassCard(
                                  child: Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: AppColors.secondary.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(22),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'یادداشت بازبینی',
                                          style: theme.textTheme.titleSmall?.copyWith(
                                            color: AppColors.secondary,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        const SizedBox(height: AppSpacing.sm),
                                        Text(
                                          product.reviewNote,
                                          style: theme.textTheme.bodyLarge,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.lg),
                              ],
                              if (_successMessage != null) ...[
                                Text(
                                  _successMessage!,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.md),
                              ],
                              if (_errorMessage != null) ...[
                                Text(
                                  _errorMessage!,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.error,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.md),
                              ],
                              _EditorHeroCard(
                                name: _nameController.text.isEmpty
                                    ? product.name
                                    : _nameController.text,
                                priceLabel: _displayPriceLabel(product),
                                status: _mapStatus(product.publicationStatus),
                                imageUrl: _mainImageUrl,
                                pendingImageFile: _pendingMainImageFile,
                              ),
                              const SizedBox(height: AppSpacing.lg),
                              AppGlassCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'ویرایش سریع',
                                      style: theme.textTheme.titleMedium,
                                    ),
                                    const SizedBox(height: AppSpacing.lg),
                                    TextField(
                                      controller: _nameController,
                                      decoration: const InputDecoration(
                                        labelText: 'نام محصول',
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.md),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: TextField(
                                            controller: _priceController,
                                            keyboardType: TextInputType.number,
                                            decoration: const InputDecoration(
                                              labelText: 'قیمت',
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: AppSpacing.md),
                                        Expanded(
                                          child: TextField(
                                            controller: _discountPriceController,
                                            keyboardType: TextInputType.number,
                                            decoration: const InputDecoration(
                                              labelText: 'قیمت با تخفیف',
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: AppSpacing.md),
                                    TextField(
                                      controller: _quantityController,
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                        labelText: 'موجودی',
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.md),
                                    TextField(
                                      controller: _mainImageAltController,
                                      decoration: const InputDecoration(
                                        labelText: 'متن جایگزین تصویر شاخص',
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.lg),
                                    _ImageUploadCard(
                                      title: 'تصویر شاخص',
                                      description:
                                          'یک تصویر مربع 1:1 انتخاب کن. قبل از ذخیره، کراپ می‌شود.',
                                      imageUrl: _mainImageUrl,
                                      pendingFile: _pendingMainImageFile,
                                      isUploading: _isUploadingMainImage,
                                      onUpload: _pickMainImage,
                                    ),
                                    const SizedBox(height: AppSpacing.lg),
                                    _GalleryEditorCard(
                                      items: _gallery,
                                      isUploading: _isUploadingGallery,
                                      onUpload: _pickGalleryImage,
                                      onAltChanged: (index, value) {
                                        setState(() {
                                          _gallery = [..._gallery];
                                          _gallery[index] =
                                              _gallery[index].copyWith(alt: value);
                                        });
                                      },
                                      onRemove: (index) {
                                        setState(() {
                                          final next = [..._gallery];
                                          next.removeAt(index);
                                          _gallery = next;
                                        });
                                      },
                                    ),
                                    const SizedBox(height: AppSpacing.lg),
                                    _CompositionEditorCard(
                                      elements: _allowedElementsForCurrentType(),
                                      items: _compositions,
                                      onAdd: () {
                                        setState(() {
                                          _compositions = [
                                            ..._compositions,
                                            _EditableCompositionItem.empty(),
                                          ];
                                        });
                                      },
                                      onRemove: (index) {
                                        setState(() {
                                          final next = [..._compositions];
                                          next.removeAt(index);
                                          _compositions = next;
                                        });
                                      },
                                      onChanged: (index, item) {
                                        setState(() {
                                          _compositions = [..._compositions];
                                          _compositions[index] = item;
                                        });
                                      },
                                    ),
                                    const SizedBox(height: AppSpacing.lg),
                                    TextField(
                                      controller: _shortDescriptionController,
                                      maxLines: 3,
                                      decoration: const InputDecoration(
                                        labelText: 'خلاصه محصول',
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.md),
                                    TextField(
                                      controller: _descriptionController,
                                      maxLines: 6,
                                      decoration: const InputDecoration(
                                        labelText: 'توضیحات کامل',
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.lg),
                                    SizedBox(
                                      width: double.infinity,
                                      child: FilledButton(
                                        onPressed: _isSaving ? null : _saveProduct,
                                        child: Text(
                                          _isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات',
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
          ),
        ),
      ),
    );
  }

  List<ProductElementOption> _allowedElementsForCurrentType() {
    final product = _product;
    if (product == null) return const [];
    ProductTypeOption? type;
    for (final item in _productTypes) {
      if (item.id == product.productTypeId) {
        type = item;
        break;
      }
    }
    if (type == null) return _elements;
    if (type.allowedElementIds.isEmpty) return _elements;
    return _elements
        .where((item) => type!.allowedElementIds.contains(item.id))
        .toList();
  }
}

class _EditorHeroCard extends StatelessWidget {
  const _EditorHeroCard({
    required this.name,
    required this.priceLabel,
    required this.status,
    required this.imageUrl,
    required this.pendingImageFile,
  });

  final String name;
  final String priceLabel;
  final _ProductStatusView status;
  final String imageUrl;
  final File? pendingImageFile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppGlassCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ImagePreview(
            imageUrl: imageUrl,
            pendingFile: pendingImageFile,
            size: 98,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: theme.textTheme.headlineMedium,
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  priceLabel,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                _StatusBadge(
                  label: status.label,
                  color: status.color,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ImageUploadCard extends StatelessWidget {
  const _ImageUploadCard({
    required this.title,
    required this.description,
    required this.imageUrl,
    required this.pendingFile,
    required this.isUploading,
    required this.onUpload,
  });

  final String title;
  final String description;
  final String imageUrl;
  final File? pendingFile;
  final bool isUploading;
  final VoidCallback onUpload;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.65),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: _ImagePreview(
              imageUrl: imageUrl,
              pendingFile: pendingFile,
              size: 86,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            title,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 6),
          Text(
            description,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: isUploading ? null : onUpload,
              icon: isUploading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.cloud_upload_rounded),
              label: Text(isUploading ? 'در حال آپلود' : 'انتخاب تصویر'),
            ),
          ),
        ],
      ),
    );
  }
}

class _GalleryEditorCard extends StatelessWidget {
  const _GalleryEditorCard({
    required this.items,
    required this.isUploading,
    required this.onUpload,
    required this.onAltChanged,
    required this.onRemove,
  });

  final List<_EditableGalleryItem> items;
  final bool isUploading;
  final VoidCallback onUpload;
  final void Function(int index, String value) onAltChanged;
  final void Function(int index) onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.65),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'گالری محصول',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 6),
          Text(
            'برای هر عکس گالری هم دکمه انتخاب تصویر و کراپ 1:1 فعال است.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: isUploading ? null : onUpload,
              icon: isUploading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.add_photo_alternate_rounded),
              label: Text(isUploading ? 'در حال آپلود' : 'افزودن تصویر گالری'),
            ),
          ),
          if (items.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.lg),
            ...List.generate(
              items.length,
              (index) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: _GalleryItemEditor(
                  item: items[index],
                  onAltChanged: (value) => onAltChanged(index, value),
                  onRemove: () => onRemove(index),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _GalleryItemEditor extends StatelessWidget {
  const _GalleryItemEditor({
    required this.item,
    required this.onAltChanged,
    required this.onRemove,
  });

  final _EditableGalleryItem item;
  final ValueChanged<String> onAltChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ImagePreview(
          imageUrl: item.url,
          pendingFile: null,
          size: 72,
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            children: [
              TextFormField(
                initialValue: item.alt,
                onChanged: onAltChanged,
                decoration: const InputDecoration(
                  labelText: 'متن جایگزین تصویر',
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: onRemove,
                  icon: const Icon(Icons.delete_outline_rounded),
                  label: const Text('حذف'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ImagePreview extends StatelessWidget {
  const _ImagePreview({
    required this.imageUrl,
    required this.pendingFile,
    required this.size,
  });

  final String imageUrl;
  final File? pendingFile;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (pendingFile != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Image.file(
          pendingFile!,
          width: size,
          height: size,
          fit: BoxFit.cover,
        ),
      );
    }

    if (imageUrl.isEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppColors.surfaceSoft.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(22),
        ),
        child: const Icon(
          Icons.image_outlined,
          color: AppColors.primary,
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: Image.network(
        imageUrl,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: AppColors.surfaceSoft.withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(22),
          ),
          child: const Icon(
            Icons.broken_image_rounded,
            color: AppColors.primary,
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _ProductStatusView {
  const _ProductStatusView({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;
}

class _EditableGalleryItem {
  const _EditableGalleryItem({
    required this.url,
    required this.alt,
  });

  final String url;
  final String alt;

  _EditableGalleryItem copyWith({
    String? url,
    String? alt,
  }) {
    return _EditableGalleryItem(
      url: url ?? this.url,
      alt: alt ?? this.alt,
    );
  }
}

class _EditableCompositionItem {
  const _EditableCompositionItem({
    required this.elementId,
    required this.elementType,
    required this.quantity,
  });

  final int? elementId;
  final String elementType;
  final num quantity;

  factory _EditableCompositionItem.empty() {
    return const _EditableCompositionItem(
      elementId: null,
      elementType: '',
      quantity: 1,
    );
  }

  _EditableCompositionItem copyWith({
    int? elementId,
    String? elementType,
    num? quantity,
    bool clearElementId = false,
  }) {
    return _EditableCompositionItem(
      elementId: clearElementId ? null : (elementId ?? this.elementId),
      elementType: elementType ?? this.elementType,
      quantity: quantity ?? this.quantity,
    );
  }
}

class _CompositionEditorCard extends StatelessWidget {
  const _CompositionEditorCard({
    required this.elements,
    required this.items,
    required this.onAdd,
    required this.onRemove,
    required this.onChanged,
  });

  final List<ProductElementOption> elements;
  final List<_EditableCompositionItem> items;
  final VoidCallback onAdd;
  final void Function(int index) onRemove;
  final void Function(int index, _EditableCompositionItem item) onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.65),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Composition محصول',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              TextButton.icon(
                onPressed: onAdd,
                icon: const Icon(Icons.add_rounded),
                label: const Text('افزودن'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'المان را انتخاب کن و تعداد یا مقدارش را مشخص کن.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
          if (items.isEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              'هنوز composition اضافه نشده است.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          ] else ...[
            const SizedBox(height: AppSpacing.md),
            ...List.generate(
              items.length,
              (index) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: _CompositionRow(
                  elements: elements,
                  item: items[index],
                  onRemove: () => onRemove(index),
                  onChanged: (item) => onChanged(index, item),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CompositionRow extends StatelessWidget {
  const _CompositionRow({
    required this.elements,
    required this.item,
    required this.onRemove,
    required this.onChanged,
  });

  final List<ProductElementOption> elements;
  final _EditableCompositionItem item;
  final VoidCallback onRemove;
  final ValueChanged<_EditableCompositionItem> onChanged;

  @override
  Widget build(BuildContext context) {
    final quantityController =
        TextEditingController(text: item.quantity.toString());

    return Column(
      children: [
        DropdownButtonFormField<int>(
          value: item.elementId,
          decoration: const InputDecoration(
            labelText: 'المان',
          ),
          items: elements
              .map(
                (element) => DropdownMenuItem<int>(
                  value: element.id,
                  child: Text(
                    element.unit.isEmpty
                        ? element.name
                        : '${element.name} (${element.unit})',
                  ),
                ),
              )
              .toList(),
          onChanged: (value) {
            ProductElementOption? element;
            for (final candidate in elements) {
              if (candidate.id == value) {
                element = candidate;
                break;
              }
            }
            onChanged(
              item.copyWith(
                elementId: value,
                elementType: element?.type ?? '',
              ),
            );
          },
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: quantityController,
                keyboardType: TextInputType.number,
                onChanged: (value) {
                  onChanged(
                    item.copyWith(
                      quantity: num.tryParse(value.trim()) ?? item.quantity,
                    ),
                  );
                },
                decoration: const InputDecoration(
                  labelText: 'مقدار',
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            TextButton.icon(
              onPressed: onRemove,
              icon: const Icon(Icons.delete_outline_rounded),
              label: const Text('حذف'),
            ),
          ],
        ),
      ],
    );
  }
}

_ProductStatusView _mapStatus(String value) {
  switch (value) {
    case 'PUBLISHED':
      return const _ProductStatusView(
        label: 'منتشرشده',
        color: AppColors.success,
      );
    case 'SUBMITTED':
      return const _ProductStatusView(
        label: 'در بازبینی',
        color: AppColors.accent,
      );
    case 'CHANGES_REQUESTED':
      return const _ProductStatusView(
        label: 'برگشت برای ویرایش',
        color: AppColors.secondary,
      );
    case 'ARCHIVED':
      return const _ProductStatusView(
        label: 'منتشر نشده',
        color: AppColors.textSecondary,
      );
    default:
      return const _ProductStatusView(
        label: 'پیش‌نویس',
        color: AppColors.warning,
      );
  }
}

String _formatPrice(num value) {
  final digits = value.toInt().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    buffer.write(digits[i]);
    final remaining = digits.length - i - 1;
    if (remaining > 0 && remaining % 3 == 0) {
      buffer.write(',');
    }
  }
  return '${buffer.toString()} تومان';
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
