import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../data/products_api_service.dart';
import '../domain/product_editor_models.dart';
import '../domain/vendor_product_detail.dart';
import 'view_models/product_workspace_view_model.dart';

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
  final _imagePicker = ImagePicker();
  late final ProductWorkspaceViewModel _viewModel;

  late final TextEditingController _nameController;
  late final TextEditingController _priceController;
  late final TextEditingController _discountPriceController;
  late final TextEditingController _quantityController;
  late final TextEditingController _shortDescriptionController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _mainImageAltController;

  @override
  void initState() {
    super.initState();
    _viewModel = ProductWorkspaceViewModel(
      accessToken: widget.accessToken,
      productSlug: widget.productSlug,
    );
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
    _viewModel.dispose();
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
    await _viewModel.loadDetail();
    final product = _viewModel.state.product;
    if (product != null && mounted) _fillForm(product);
  }

  String _displayPriceLabel() {
    return _viewModel.displayPriceLabel(
      price: _priceController.text,
      discountPrice: _discountPriceController.text,
    );
  }

  void _fillForm(VendorProductDetail product) {
    _nameController.text = product.name;
    _priceController.text = product.price.toString();
    _discountPriceController.text = product.discountPrice?.toString() ?? '';
    _quantityController.text = product.quantity.toString();
    _shortDescriptionController.text = product.shortDescription;
    _descriptionController.text = product.description;
    _mainImageAltController.text = product.mainImageAlt;
  }

  Future<void> _pickMainImage() async {
    try {
      final file = await _pickCroppedImage(
        title: 'برش تصویر شاخص',
      );
      if (file == null || !mounted) return;
      await _viewModel.uploadMainImage(file);
    } catch (_) {
      // Picker cancellation is a no-op.
    }
  }

  Future<void> _pickGalleryImage() async {
    try {
      final file = await _pickCroppedImage(
        title: 'برش تصویر گالری',
      );
      if (file == null || !mounted) return;
      await _viewModel.uploadGalleryImage(file);
    } catch (_) {
      // Picker cancellation is a no-op.
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
    final updated = await _viewModel.saveProduct(
      name: _nameController.text,
      price: _priceController.text,
      discountPrice: _discountPriceController.text,
      quantity: _quantityController.text,
      mainImageAlt: _mainImageAltController.text,
      shortDescription: _shortDescriptionController.text,
      description: _descriptionController.text,
    );
    if (updated != null && mounted) _fillForm(updated);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: ListenableBuilder(
              listenable: _viewModel,
              builder: (context, _) {
                final state = _viewModel.state;
                final product = state.product;

                return state.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : state.errorMessage != null && product == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: AppGlassCard(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  state.errorMessage!,
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
                              if (state.successMessage != null) ...[
                                Text(
                                  state.successMessage!,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.md),
                              ],
                              if (state.errorMessage != null) ...[
                                Text(
                                  state.errorMessage!,
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
                                priceLabel: _displayPriceLabel(),
                                status: _mapStatus(product.publicationStatus),
                                imageUrl: state.mainImageUrl,
                                pendingImageFile: state.pendingMainImageFile,
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
                                      imageUrl: state.mainImageUrl,
                                      pendingFile: state.pendingMainImageFile,
                                      isUploading: state.isUploadingMainImage,
                                      onUpload: _pickMainImage,
                                    ),
                                    const SizedBox(height: AppSpacing.lg),
                                    _GalleryEditorCard(
                                      items: state.gallery,
                                      isUploading: state.isUploadingGallery,
                                      onUpload: _pickGalleryImage,
                                      onAltChanged:
                                          _viewModel.updateGalleryAlt,
                                      onRemove: _viewModel.removeGalleryItem,
                                    ),
                                    const SizedBox(height: AppSpacing.lg),
                                    _CompositionEditorCard(
                                      elements: state.allowedElements,
                                      items: state.compositions,
                                      onAdd: _viewModel.addComposition,
                                      onRemove: _viewModel.removeComposition,
                                      onChanged: _viewModel.updateComposition,
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
                                        onPressed: state.isSaving
                                            ? null
                                            : _saveProduct,
                                        child: Text(
                                          state.isSaving
                                              ? 'در حال ذخیره...'
                                              : 'ذخیره تغییرات',
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          );
              },
            ),
          ),
        ),
      ),
    );
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

  final List<EditableGalleryItem> items;
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

  final EditableGalleryItem item;
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

class _CompositionEditorCard extends StatelessWidget {
  const _CompositionEditorCard({
    required this.elements,
    required this.items,
    required this.onAdd,
    required this.onRemove,
    required this.onChanged,
  });

  final List<ProductElementOption> elements;
  final List<EditableCompositionItem> items;
  final VoidCallback onAdd;
  final void Function(int index) onRemove;
  final void Function(int index, EditableCompositionItem item) onChanged;

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
  final EditableCompositionItem item;
  final VoidCallback onRemove;
  final ValueChanged<EditableCompositionItem> onChanged;

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

