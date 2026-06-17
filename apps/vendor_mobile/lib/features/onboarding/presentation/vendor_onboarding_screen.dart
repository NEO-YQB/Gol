import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/domain/auth_session.dart';
import 'location_picker_screen.dart';
import 'view_models/vendor_onboarding_view_model.dart';

class VendorOnboardingScreen extends StatefulWidget {
  const VendorOnboardingScreen({
    super.key,
    required this.session,
    required this.onCompleted,
    required this.onLogout,
  });

  final AuthSession session;
  final Future<void> Function() onCompleted;
  final Future<void> Function() onLogout;

  @override
  State<VendorOnboardingScreen> createState() => _VendorOnboardingScreenState();
}

class _VendorOnboardingScreenState extends State<VendorOnboardingScreen> {
  final _imagePicker = ImagePicker();
  late final VendorOnboardingViewModel _viewModel;
  bool _didHydrateFromRequest = false;
  bool _didTriggerCompletion = false;

  late final TextEditingController _fullNameController;
  late final TextEditingController _nationalIdController;
  late final TextEditingController _businessNameController;
  late final TextEditingController _businessSlugController;
  late final TextEditingController _businessDescriptionController;
  late final TextEditingController _businessAddressController;
  late final TextEditingController _licenseNumberController;
  bool _didHydrateAddressFromMap = false;

  late final TextEditingController _productNameController;
  late final TextEditingController _productDescriptionController;
  late final TextEditingController _productAltController;
  late final TextEditingController _productPriceController;
  late final TextEditingController _productQuantityController;

  @override
  void initState() {
    super.initState();
    _viewModel = VendorOnboardingViewModel(
      accessToken: widget.session.accessToken,
      bootstrapState: widget.session.bootstrap?.vendorOnboarding,
    );
    _viewModel.addListener(_syncForm);
    _fullNameController = TextEditingController();
    _nationalIdController = TextEditingController();
    _businessNameController = TextEditingController();
    _businessSlugController = TextEditingController();
    _businessDescriptionController = TextEditingController();
    _businessAddressController = TextEditingController();
    _licenseNumberController = TextEditingController();
    _productNameController = TextEditingController();
    _productDescriptionController = TextEditingController();
    _productAltController = TextEditingController();
    _productPriceController = TextEditingController();
    _productQuantityController = TextEditingController();
    _viewModel.loadRequest();
  }

  @override
  void dispose() {
    _viewModel.removeListener(_syncForm);
    _viewModel.dispose();
    _fullNameController.dispose();
    _nationalIdController.dispose();
    _businessNameController.dispose();
    _businessSlugController.dispose();
    _businessDescriptionController.dispose();
    _businessAddressController.dispose();
    _licenseNumberController.dispose();
    _productNameController.dispose();
    _productDescriptionController.dispose();
    _productAltController.dispose();
    _productPriceController.dispose();
    _productQuantityController.dispose();
    super.dispose();
  }

  void _syncForm() {
    final request = _viewModel.state.request;

    if (request != null && !_didHydrateFromRequest) {
      _fullNameController.text = request.personalFullName;
      _nationalIdController.text = request.personalNationalId;
      _businessNameController.text = request.businessName;
      _businessSlugController.text = request.businessSlug;
      _businessDescriptionController.text = request.businessDescription;
      _businessAddressController.text = request.businessAddress;
      _licenseNumberController.text = request.licenseNumber;
      _productNameController.text = request.productName;
      _productDescriptionController.text = request.productDescription;
      _productAltController.text = request.productMainImageAlt;
      _productPriceController.text = request.productPrice?.toString() ?? '';
      _productQuantityController.text = request.productQuantity?.toString() ?? '';
      _didHydrateFromRequest = true;
    }

    final resolvedAddress = _viewModel.state.resolvedBusinessAddress?.trim() ?? '';
    if (resolvedAddress.isNotEmpty &&
        resolvedAddress != _businessAddressController.text.trim()) {
      _businessAddressController.text = resolvedAddress;
      _didHydrateAddressFromMap = true;
    }

    if (_viewModel.state.currentStep == VendorOnboardingStep.completed &&
        !_didTriggerCompletion) {
      _didTriggerCompletion = true;
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        await widget.onCompleted();
      });
    }
  }

  Future<void> _pickAndUploadDocument(String title) async {
    final picked = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 92,
    );
    if (picked == null || !mounted) return;
    await _viewModel.uploadApplicationDocument(
      file: File(picked.path),
      title: title,
    );
  }

  Future<void> _pickAndUploadProductImage() async {
    final picked = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 92,
    );
    if (picked == null || !mounted) return;
    await _viewModel.uploadProductImage(File(picked.path));
  }

  Future<void> _submitApplication() {
    return _viewModel.submitApplication(
      VendorOnboardingApplicationInput(
        personalFullName: _fullNameController.text,
        personalNationalId: _nationalIdController.text,
        businessName: _businessNameController.text,
        businessSlug: _businessSlugController.text,
        businessDescription: _businessDescriptionController.text,
        businessAddress: _businessAddressController.text,
        licenseNumber: _licenseNumberController.text,
        businessLat: _viewModel.state.selectedBusinessLat,
        businessLng: _viewModel.state.selectedBusinessLng,
      ),
    );
  }

  Future<void> _pickBusinessLocation() async {
    final selected = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OnboardingLocationPickerScreen(
          initialLat: _viewModel.state.selectedBusinessLat,
          initialLng: _viewModel.state.selectedBusinessLng,
        ),
      ),
    );

    if (!mounted || selected is! LatLng) return;
    final lat = selected.latitude;
    final lng = selected.longitude;

    await _viewModel.selectBusinessLocation(lat: lat, lng: lng);
  }

  Future<void> _submitProduct() {
    return _viewModel.submitProduct(
      VendorOnboardingProductInput(
        productName: _productNameController.text,
        productDescription: _productDescriptionController.text,
        productMainImageAlt: _productAltController.text,
        productPrice: _productPriceController.text,
        productQuantity: _productQuantityController.text,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: ListenableBuilder(
              listenable: _viewModel,
              builder: (context, _) {
                final state = _viewModel.state;

                if (state.isLoading) {
                  return state.request == null
                      ? const Center(child: CircularProgressIndicator())
                      : _buildLoadedContent(state);
                }

                return _buildLoadedContent(state);
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoadedContent(VendorOnboardingViewState state) {
    return ListView(
                  padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'ورود فروشنده',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        TextButton(
                          onPressed: widget.onLogout,
                          child: const Text('خروج'),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    const AppSectionHeading(
                      eyebrow: 'شروع همکاری',
                      title: 'ثبت‌نام فروشندگی مرحله‌به‌مرحله',
                      description: 'ابتدا مشخصاتت را ثبت کن، بعد محصول نمونه را بفرست و پس از تایید وارد پنل شو.',
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _OnboardingStepper(currentStep: state.currentStep),
                    const SizedBox(height: AppSpacing.lg),
                    if (state.errorMessage != null) ...[
                      _NoticeCard(
                        message: state.errorMessage!,
                        color: AppColors.danger,
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    if (state.successMessage != null) ...[
                      _NoticeCard(
                        message: state.successMessage!,
                        color: AppColors.success,
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 320),
                      switchInCurve: Curves.easeOutCubic,
                      switchOutCurve: Curves.easeInOut,
                      child: _buildStepContent(state),
                    ),
                  ],
                );
  }

  Widget _buildStepContent(VendorOnboardingViewState state) {
    switch (state.currentStep) {
      case VendorOnboardingStep.profile:
        return _ApplicationStepCard(
          key: const ValueKey('application-step'),
          fullNameController: _fullNameController,
          nationalIdController: _nationalIdController,
          businessNameController: _businessNameController,
          businessSlugController: _businessSlugController,
          businessDescriptionController: _businessDescriptionController,
          businessAddressController: _businessAddressController,
          licenseNumberController: _licenseNumberController,
          selectedBusinessLat: state.selectedBusinessLat,
          selectedBusinessLng: state.selectedBusinessLng,
          documents: state.applicationDocuments,
          isUploading: state.isUploading,
          pendingUploadName: state.pendingUploadName,
          onUploadDocument: _pickAndUploadDocument,
          onRemoveDocument: _viewModel.removeApplicationDocument,
          onPickLocation: _pickBusinessLocation,
          isSubmitting: state.isSubmitting,
          onSubmit: _submitApplication,
        );
      case VendorOnboardingStep.applicationReview:
        return _StatusStepCard(
          key: const ValueKey('application-review'),
          title: 'درخواست فروشندگی در حال بررسی است',
          description:
              'اطلاعات هویتی و مدارک کسب‌وکار شما ثبت شد. بعد از تایید این مرحله، وارد ثبت محصول نمونه می‌شوی.',
          note: state.request?.reviewNote,
          onRefresh: _viewModel.loadRequest,
        );
      case VendorOnboardingStep.sampleProduct:
        return _ProductStepCard(
          key: const ValueKey('product-step'),
          productNameController: _productNameController,
          productDescriptionController: _productDescriptionController,
          productAltController: _productAltController,
          productPriceController: _productPriceController,
          productQuantityController: _productQuantityController,
          images: state.productGalleryImages,
          isUploading: state.isUploading,
          pendingUploadName: state.pendingUploadName,
          isSubmitting: state.isSubmitting,
          onUploadImage: _pickAndUploadProductImage,
          onRemoveImage: _viewModel.removeProductImage,
          onSubmit: _submitProduct,
        );
      case VendorOnboardingStep.productReview:
        return _StatusStepCard(
          key: const ValueKey('product-review'),
          title: 'محصول نمونه در حال بررسی است',
          description:
              'درخواست فروشندگی شما تایید شده و حالا محصول نمونه برای بررسی محتوا و کیفیت منتظر تایید است.',
          note: state.request?.productReviewNote,
          onRefresh: _viewModel.loadRequest,
        );
      case VendorOnboardingStep.completed:
        return const _StatusStepCard(
          key: ValueKey('completed'),
          title: 'ثبت‌نام کامل شد',
          description: 'همه تاییدها انجام شده و در حال ورود به پنل فروشنده هستی.',
        );
    }
  }
}

class _OnboardingStepper extends StatelessWidget {
  const _OnboardingStepper({
    required this.currentStep,
  });

  final VendorOnboardingStep currentStep;

  @override
  Widget build(BuildContext context) {
    const steps = [
      ('مشخصات', VendorOnboardingStep.profile),
      ('بررسی', VendorOnboardingStep.applicationReview),
      ('محصول نمونه', VendorOnboardingStep.sampleProduct),
      ('تایید نهایی', VendorOnboardingStep.productReview),
    ];

    final currentIndex = steps.indexWhere((item) => item.$2 == currentStep);
    final resolvedIndex = currentIndex < 0 ? steps.length : currentIndex;

    return AppGlassCard(
      padding: const EdgeInsets.all(14),
      child: Wrap(
        spacing: AppSpacing.sm,
        runSpacing: AppSpacing.sm,
        children: steps.asMap().entries.map((entry) {
          final index = entry.key;
          final label = entry.value.$1;
          final active = index <= resolvedIndex;

          return AnimatedContainer(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            constraints: const BoxConstraints(minWidth: 110),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: active
                  ? AppColors.primary.withValues(alpha: 0.12)
                  : AppColors.surfaceSoft.withValues(alpha: 0.72),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: active
                    ? AppColors.primary
                    : AppColors.textSecondary,
                fontWeight: FontWeight.w800,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({
    required this.message,
    required this.color,
  });

  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return AppGlassCard(
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _ApplicationStepCard extends StatelessWidget {
  const _ApplicationStepCard({
    super.key,
    required this.fullNameController,
    required this.nationalIdController,
    required this.businessNameController,
    required this.businessSlugController,
    required this.businessDescriptionController,
    required this.businessAddressController,
    required this.licenseNumberController,
    required this.selectedBusinessLat,
    required this.selectedBusinessLng,
    required this.documents,
    required this.isUploading,
    required this.pendingUploadName,
    required this.onUploadDocument,
    required this.onRemoveDocument,
    required this.onPickLocation,
    required this.isSubmitting,
    required this.onSubmit,
  });

  final TextEditingController fullNameController;
  final TextEditingController nationalIdController;
  final TextEditingController businessNameController;
  final TextEditingController businessSlugController;
  final TextEditingController businessDescriptionController;
  final TextEditingController businessAddressController;
  final TextEditingController licenseNumberController;
  final double? selectedBusinessLat;
  final double? selectedBusinessLng;
  final List<EditableOnboardingDocument> documents;
  final bool isUploading;
  final String? pendingUploadName;
  final ValueChanged<String> onUploadDocument;
  final ValueChanged<String> onRemoveDocument;
  final Future<void> Function() onPickLocation;
  final bool isSubmitting;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('مرحله ۱: مشخصات فروشنده و کسب‌وکار', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.lg),
          TextField(controller: fullNameController, decoration: const InputDecoration(labelText: 'نام و نام خانوادگی')),
          const SizedBox(height: AppSpacing.md),
          TextField(controller: nationalIdController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'کد ملی')),
          const SizedBox(height: AppSpacing.md),
          TextField(controller: businessNameController, decoration: const InputDecoration(labelText: 'نام کسب‌وکار')),
          const SizedBox(height: AppSpacing.md),
          TextField(controller: businessSlugController, textDirection: TextDirection.ltr, decoration: const InputDecoration(labelText: 'اسلاگ کسب‌وکار')),
          const SizedBox(height: AppSpacing.md),
          TextField(controller: businessDescriptionController, maxLines: 3, decoration: const InputDecoration(labelText: 'توضیح کوتاه کسب‌وکار')),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: businessAddressController,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'آدرس کسب‌وکار'),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onPickLocation,
              icon: const Icon(Icons.map_rounded),
              label: Text(
                selectedBusinessLat == null || selectedBusinessLng == null
                    ? 'انتخاب موقعیت روی نقشه'
                    : 'ویرایش موقعیت روی نقشه',
              ),
            ),
          ),
          if (selectedBusinessLat != null && selectedBusinessLng != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'مختصات ثبت‌شده: ${selectedBusinessLat!.toStringAsFixed(5)} ، ${selectedBusinessLng!.toStringAsFixed(5)}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          TextField(controller: licenseNumberController, decoration: const InputDecoration(labelText: 'شماره جواز')),
          const SizedBox(height: AppSpacing.lg),
          _UploadRow(
            title: 'تصویر جواز',
            document: documents.cast<EditableOnboardingDocument?>().firstWhere(
                  (item) => item?.title == 'تصویر جواز',
                  orElse: () => null,
                ),
            isUploading: isUploading && pendingUploadName == 'تصویر جواز',
            onTap: () => onUploadDocument('تصویر جواز'),
            onRemove: () => onRemoveDocument('تصویر جواز'),
          ),
          const SizedBox(height: AppSpacing.md),
          _UploadRow(
            title: 'کارت ملی یا مدرک هویتی',
            document: documents.cast<EditableOnboardingDocument?>().firstWhere(
                  (item) => item?.title == 'مدرک هویتی',
                  orElse: () => null,
                ),
            isUploading: isUploading && pendingUploadName == 'مدرک هویتی',
            onTap: () => onUploadDocument('مدرک هویتی'),
            onRemove: () => onRemoveDocument('مدرک هویتی'),
          ),
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: isSubmitting ? null : onSubmit,
              child: Text(isSubmitting ? 'در حال ثبت...' : 'ثبت و ارسال برای بررسی'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductStepCard extends StatelessWidget {
  const _ProductStepCard({
    super.key,
    required this.productNameController,
    required this.productDescriptionController,
    required this.productAltController,
    required this.productPriceController,
    required this.productQuantityController,
    required this.images,
    required this.isUploading,
    required this.pendingUploadName,
    required this.isSubmitting,
    required this.onUploadImage,
    required this.onRemoveImage,
    required this.onSubmit,
  });

  final TextEditingController productNameController;
  final TextEditingController productDescriptionController;
  final TextEditingController productAltController;
  final TextEditingController productPriceController;
  final TextEditingController productQuantityController;
  final List<String> images;
  final bool isUploading;
  final String? pendingUploadName;
  final bool isSubmitting;
  final Future<void> Function() onUploadImage;
  final ValueChanged<String> onRemoveImage;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('مرحله ۲: محصول نمونه', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.lg),
          TextField(controller: productNameController, decoration: const InputDecoration(labelText: 'نام محصول نمونه')),
          const SizedBox(height: AppSpacing.md),
          TextField(controller: productDescriptionController, maxLines: 4, decoration: const InputDecoration(labelText: 'توضیحات محصول')),
          const SizedBox(height: AppSpacing.md),
          TextField(controller: productAltController, decoration: const InputDecoration(labelText: 'توضیح کوتاه تصویر اصلی')),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: productPriceController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'قیمت'),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: TextField(
                  controller: productQuantityController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'موجودی'),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          _UploadRow(
            title: 'تصاویر محصول و مستندات',
            uploaded: images.isNotEmpty,
            isUploading: isUploading && pendingUploadName == 'تصویر محصول',
            onTap: onUploadImage,
            onRemove: null,
          ),
          if (images.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: images
                  .map(
                    (url) => Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.network(
                            url,
                            width: 88,
                            height: 88,
                            fit: BoxFit.cover,
                          ),
                        ),
                        PositionedDirectional(
                          top: 4,
                          end: 4,
                          child: InkWell(
                            onTap: () => onRemoveImage(url),
                            child: Container(
                              width: 24,
                              height: 24,
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: isSubmitting ? null : onSubmit,
              child: Text(isSubmitting ? 'در حال ثبت...' : 'ثبت محصول نمونه'),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusStepCard extends StatelessWidget {
  const _StatusStepCard({
    super.key,
    required this.title,
    required this.description,
    this.note,
    this.onRefresh,
  });

  final String title;
  final String description;
  final String? note;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    return AppGlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          Text(
            description,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
          if (note != null && note!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              note!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w700,
              ),
            ),
          ],
          if (onRefresh != null) ...[
            const SizedBox(height: AppSpacing.lg),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: OutlinedButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('به‌روزرسانی وضعیت'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _UploadRow extends StatelessWidget {
  const _UploadRow({
    required this.title,
    this.document,
    this.uploaded = false,
    required this.isUploading,
    required this.onTap,
    this.onRemove,
  });

  final String title;
  final EditableOnboardingDocument? document;
  final bool uploaded;
  final bool isUploading;
  final VoidCallback onTap;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
              if (document != null || uploaded)
                const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.success,
                ),
            ],
          ),
          if (document != null) ...[
            const SizedBox(height: AppSpacing.md),
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    document!.url,
                    width: 96,
                    height: 96,
                    fit: BoxFit.cover,
                  ),
                ),
                PositionedDirectional(
                  top: 4,
                  end: 4,
                  child: InkWell(
                    onTap: onRemove,
                    child: Container(
                      width: 26,
                      height: 26,
                      decoration: const BoxDecoration(
                        color: Colors.black54,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: isUploading ? null : onTap,
              child: Text(
                isUploading
                    ? 'در حال آپلود...'
                    : document == null
                        ? 'بارگذاری'
                        : 'بارگذاری مجدد',
              ),
            ),
          ),
        ],
      ),
    );
  }
}
