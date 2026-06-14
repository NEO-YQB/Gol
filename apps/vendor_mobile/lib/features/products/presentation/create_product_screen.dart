import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../data/products_api_service.dart';
import 'product_workspace_screen.dart';

class CreateProductScreen extends StatefulWidget {
  const CreateProductScreen({
    super.key,
    required this.accessToken,
    required this.storeId,
  });

  final String accessToken;
  final int storeId;

  @override
  State<CreateProductScreen> createState() => _CreateProductScreenState();
}

class _CreateProductScreenState extends State<CreateProductScreen> {
  final _apiService = const ProductsApiService();
  final _imagePicker = ImagePicker();

  late final TextEditingController _nameController;
  late final TextEditingController _priceController;
  late final TextEditingController _discountPriceController;
  late final TextEditingController _quantityController;
  late final TextEditingController _shortDescriptionController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _mainImageAltController;

  bool _isBootstrapping = true;
  bool _isSaving = false;
  bool _isUploadingMainImage = false;
  bool _isUploadingGallery = false;
  String? _errorMessage;
  List<ProductCategoryOption> _categories = const [];
  List<ProductTypeOption> _productTypes = const [];
  List<ProductElementOption> _elements = const [];
  int? _selectedCategoryId;
  int? _selectedProductTypeId;
  String _mainImageUrl = '';
  File? _pendingMainImageFile;
  List<_EditableGalleryItem> _gallery = const [];
  List<_EditableCompositionItem> _compositions = const [];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _priceController = TextEditingController();
    _discountPriceController = TextEditingController();
    _quantityController = TextEditingController(text: '0');
    _shortDescriptionController = TextEditingController();
    _descriptionController = TextEditingController();
    _mainImageAltController = TextEditingController();
    _loadOptions();
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

  Future<void> _loadOptions() async {
    setState(() {
      _isBootstrapping = true;
      _errorMessage = null;
    });

    try {
      final categories = await _apiService.getCategories();
      final types = await _apiService.getProductTypes();
      final elements = await _apiService.getProductElements();

      if (!mounted) return;
      setState(() {
        _categories = categories;
        _productTypes = types;
        _elements = elements;
        _selectedCategoryId =
            categories.isNotEmpty ? categories.first.id : null;
        _selectedProductTypeId = types.isNotEmpty ? types.first.id : null;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isBootstrapping = false;
      });
    }
  }

  Future<void> _pickMainImage() async {
    if (_isSaving || _isUploadingMainImage) return;

    try {
      final file = await _pickCroppedImage(title: 'برش تصویر شاخص');
      if (file == null || !mounted) return;

      setState(() {
        _isUploadingMainImage = true;
        _pendingMainImageFile = file;
        _errorMessage = null;
      });

      final uploadedUrl = await _apiService.uploadProductImage(
        accessToken: widget.accessToken,
        file: file,
      );

      if (!mounted) return;
      setState(() {
        _mainImageUrl = uploadedUrl;
        _isUploadingMainImage = false;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _isUploadingMainImage = false;
        _pendingMainImageFile = null;
        _errorMessage = error.message;
      });
    }
  }

  Future<void> _pickGalleryImage() async {
    if (_isSaving || _isUploadingGallery) return;

    try {
      final file = await _pickCroppedImage(title: 'برش تصویر گالری');
      if (file == null || !mounted) return;

      setState(() {
        _isUploadingGallery = true;
        _errorMessage = null;
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
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _isUploadingGallery = false;
        _errorMessage = error.message;
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

  Future<void> _createProduct() async {
    if (_nameController.text.trim().isEmpty ||
        _priceController.text.trim().isEmpty ||
        _quantityController.text.trim().isEmpty ||
        _mainImageUrl.trim().isEmpty ||
        _selectedCategoryId == null ||
        _selectedProductTypeId == null) {
      setState(() {
        _errorMessage =
            'نام، قیمت، موجودی، تصویر شاخص، دسته‌بندی و نوع محصول الزامی هستند.';
      });
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final created = await _apiService.createProduct(
        accessToken: widget.accessToken,
        input: {
          'name': _nameController.text.trim(),
          'price': _parseNum(_priceController.text) ?? 0,
          'discountPrice': _parseNum(_discountPriceController.text),
          'quantity': _parseInt(_quantityController.text) ?? 0,
          'mainImage': _mainImageUrl,
          'mainImageAlt': _emptyToNull(_mainImageAltController.text),
          'shortDescription': _emptyToNull(_shortDescriptionController.text),
          'description': _emptyToNull(_descriptionController.text),
          'storeId': widget.storeId,
          'categoryId': _selectedCategoryId,
          'productTypeId': _selectedProductTypeId,
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
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => ProductWorkspaceScreen(
            accessToken: widget.accessToken,
            productSlug: created.slug,
          ),
        ),
      );
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

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: _isBootstrapping
                ? const Center(child: CircularProgressIndicator())
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
                              'افزودن محصول',
                              style: theme.textTheme.titleMedium,
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(width: 48),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      AppGlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'محصول جدید بعد از ثبت، در صف تایید قرار می‌گیرد.',
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                            if (_errorMessage != null) ...[
                              const SizedBox(height: AppSpacing.md),
                              Text(
                                _errorMessage!,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: Theme.of(context).colorScheme.error,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                            const SizedBox(height: AppSpacing.lg),
                            TextField(
                              controller: _nameController,
                              decoration: const InputDecoration(
                                labelText: 'نام محصول',
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            DropdownButtonFormField<int>(
                              value: _selectedCategoryId,
                              decoration: const InputDecoration(
                                labelText: 'دسته‌بندی',
                              ),
                              items: _categories
                                  .map(
                                    (item) => DropdownMenuItem<int>(
                                      value: item.id,
                                      child: Text(item.name),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (value) {
                                setState(() {
                                  _selectedCategoryId = value;
                                });
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),
                            DropdownButtonFormField<int>(
                              value: _selectedProductTypeId,
                              decoration: const InputDecoration(
                                labelText: 'نوع محصول',
                              ),
                              items: _productTypes
                                  .map(
                                    (item) => DropdownMenuItem<int>(
                                      value: item.id,
                                      child: Text(item.name),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (value) {
                                setState(() {
                                  _selectedProductTypeId = value;
                                  _compositions = const [];
                                });
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _CompositionEditorCard(
                              elements: _allowedElementsForSelectedType(),
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
                            _UploadCard(
                              title: 'تصویر شاخص',
                              imageUrl: _mainImageUrl,
                              pendingFile: _pendingMainImageFile,
                              isUploading: _isUploadingMainImage,
                              onUpload: _pickMainImage,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            _GalleryCreateCard(
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
                                onPressed: _isSaving ? null : _createProduct,
                                child: Text(
                                  _isSaving
                                      ? 'در حال ثبت...'
                                      : 'ثبت محصول و ارسال برای تایید',
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

  List<ProductElementOption> _allowedElementsForSelectedType() {
    final selectedType = _productTypes.where((item) => item.id == _selectedProductTypeId);
    if (selectedType.isEmpty) return const [];
    final allowedIds = selectedType.first.allowedElementIds;
    if (allowedIds.isEmpty) return _elements;
    return _elements.where((item) => allowedIds.contains(item.id)).toList();
  }
}

class _UploadCard extends StatelessWidget {
  const _UploadCard({
    required this.title,
    required this.imageUrl,
    required this.pendingFile,
    required this.isUploading,
    required this.onUpload,
  });

  final String title;
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
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: _ImagePreview(
              imageUrl: imageUrl,
              pendingFile: pendingFile,
              size: 88,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            title,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 6),
          Text(
            'تصویر را با کراپ 1:1 انتخاب کن.',
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

class _GalleryCreateCard extends StatelessWidget {
  const _GalleryCreateCard({
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
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'گالری محصول',
            style: Theme.of(context).textTheme.titleSmall,
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
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _ImagePreview(
                      imageUrl: items[index].url,
                      pendingFile: null,
                      size: 72,
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        children: [
                          TextFormField(
                            initialValue: items[index].alt,
                            onChanged: (value) => onAltChanged(index, value),
                            decoration: const InputDecoration(
                              labelText: 'متن جایگزین تصویر',
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton.icon(
                              onPressed: () => onRemove(index),
                              icon: const Icon(Icons.delete_outline_rounded),
                              label: const Text('حذف'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
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
            'المان را انتخاب کن و مقدارش را مشخص کن.',
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
