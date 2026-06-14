import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../../../shared/widgets/app_metric_tile.dart';
import '../../../shared/widgets/app_section_heading.dart';
import '../../../shared/widgets/app_shell_background.dart';
import '../../auth/data/auth_api_service.dart';
import '../data/store_profile_api_service.dart';
import '../domain/vendor_store_profile.dart';

class StoreProfileScreen extends StatefulWidget {
  const StoreProfileScreen({
    super.key,
    required this.accessToken,
    required this.storeId,
    required this.storeSlug,
  });

  final String accessToken;
  final int storeId;
  final String storeSlug;

  @override
  State<StoreProfileScreen> createState() => _StoreProfileScreenState();
}

class _StoreProfileScreenState extends State<StoreProfileScreen> {
  final _apiService = const StoreProfileApiService();
  final _imagePicker = ImagePicker();

  late final TextEditingController _nameController;
  late final TextEditingController _slugController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _minDeliveryController;
  late final TextEditingController _maxDeliveryController;
  late final TextEditingController _expressDeliveryController;

  VendorStoreProfile? _profile;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isEditMode = false;
  bool _isUploadingLogo = false;
  String? _errorMessage;
  String? _successMessage;
  bool _sameDayDelivery = false;
  bool _hasExpressDelivery = false;
  String _logoUrl = '';
  File? _pendingLogoFile;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _slugController = TextEditingController();
    _descriptionController = TextEditingController();
    _minDeliveryController = TextEditingController();
    _maxDeliveryController = TextEditingController();
    _expressDeliveryController = TextEditingController();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _slugController.dispose();
    _descriptionController.dispose();
    _minDeliveryController.dispose();
    _maxDeliveryController.dispose();
    _expressDeliveryController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final profile = await _apiService.getStoreProfile(
        accessToken: widget.accessToken,
        storeSlug: widget.storeSlug,
      );

      if (!mounted) return;
      setState(() {
        _profile = profile;
        _fillForm(profile);
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

  void _fillForm(VendorStoreProfile profile) {
    _nameController.text = profile.name;
    _slugController.text = profile.slug;
    _descriptionController.text = profile.description;
    _logoUrl = profile.logo;
    _pendingLogoFile = null;
    _minDeliveryController.text =
        profile.minDeliveryHours?.toString() ?? '';
    _maxDeliveryController.text =
        profile.maxDeliveryHours?.toString() ?? '';
    _expressDeliveryController.text =
        profile.expressDeliveryHours?.toString() ?? '';
    _sameDayDelivery = profile.sameDayDelivery;
    _hasExpressDelivery = profile.hasExpressDelivery;
  }

  Future<void> _saveProfile() async {
    final currentProfile = _profile;
    if (currentProfile == null) return;

    if (_nameController.text.trim().isEmpty ||
        _slugController.text.trim().isEmpty) {
      setState(() {
        _errorMessage = 'نام فروشگاه و اسلاگ الزامی هستند.';
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
      final updated = await _apiService.updateStoreProfile(
        accessToken: widget.accessToken,
        storeId: widget.storeId,
        storeSlug: widget.storeSlug,
        input: UpdateVendorStoreProfileInput(
          name: _nameController.text,
          slug: _slugController.text,
          description: _descriptionController.text,
          logo: _logoUrl,
          sameDayDelivery: _sameDayDelivery,
          hasExpressDelivery: _hasExpressDelivery,
          minDeliveryHours: _parseInt(_minDeliveryController.text),
          maxDeliveryHours: _parseInt(_maxDeliveryController.text),
          expressDeliveryHours: _parseInt(_expressDeliveryController.text),
          deliveryWindows: currentProfile.deliveryWindows,
        ),
      );

      if (!mounted) return;
      setState(() {
        _profile = updated;
        _fillForm(updated);
        _isEditMode = false;
        _successMessage = 'پروفایل فروشگاه با موفقیت ذخیره شد.';
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

  Future<void> _pickAndUploadLogo() async {
    if (_isUploadingLogo || _isSaving) return;

    try {
      final pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 92,
      );
      if (pickedFile == null || !mounted) return;

      final croppedFile = await ImageCropper().cropImage(
        sourcePath: pickedFile.path,
        compressFormat: ImageCompressFormat.jpg,
        compressQuality: 92,
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'برش لوگو',
            toolbarColor: AppColors.primary,
            toolbarWidgetColor: Colors.white,
            activeControlsWidgetColor: AppColors.primary,
            lockAspectRatio: true,
            initAspectRatio: CropAspectRatioPreset.square,
            hideBottomControls: false,
          ),
          IOSUiSettings(
            title: 'برش لوگو',
            aspectRatioLockEnabled: true,
            resetAspectRatioEnabled: false,
          ),
        ],
      );

      if (croppedFile == null || !mounted) return;

      setState(() {
        _isUploadingLogo = true;
        _errorMessage = null;
        _successMessage = null;
        _pendingLogoFile = File(croppedFile.path);
      });

      final uploadedUrl = await _apiService.uploadStoreLogo(
        accessToken: widget.accessToken,
        file: File(croppedFile.path),
      );

      if (!mounted) return;
      setState(() {
        _logoUrl = uploadedUrl;
        _isUploadingLogo = false;
        _successMessage = 'لوگو آپلود شد و آماده ذخیره است.';
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _isUploadingLogo = false;
        _pendingLogoFile = null;
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isUploadingLogo = false;
        _pendingLogoFile = null;
        _errorMessage = 'انتخاب یا برش لوگو انجام نشد.';
      });
    }
  }

  void _cancelEdit() {
    final profile = _profile;
    if (profile == null) return;

    setState(() {
      _fillForm(profile);
      _isEditMode = false;
      _errorMessage = null;
      _successMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final profile = _profile;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: AppShellBackground(
          child: SafeArea(
            child: _isLoading
                ? const _StoreProfileLoadingView()
                : _errorMessage != null && profile == null
                    ? _StoreProfileErrorView(
                        message: _errorMessage!,
                        onRetry: _loadProfile,
                      )
                    : profile == null
                        ? _StoreProfileErrorView(
                            message: 'اطلاعات فروشگاه در دسترس نیست.',
                            onRetry: _loadProfile,
                          )
                        : ListView(
                        padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
                        children: [
                          Text(
                            'پروفایل فروشگاه',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          const AppSectionHeading(
                            eyebrow: 'هویت فروشگاه',
                            title: 'اطلاعات پایه فروشگاه را تمیز و سریع مدیریت کن',
                            description:
                                'این بخش برای ویرایش مواردی است که فروشنده در کار روزانه به آن‌ها نیاز دارد؛ بدون شلوغی و بدون ورود به flowهای سنگین.',
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          _StoreProfileHeroCard(profile: profile),
                          const SizedBox(height: AppSpacing.lg),
                          AppMetricTile(
                            title: 'محصول‌های متصل',
                            value: '${profile.productCount}',
                            subtitle: 'تعداد محصول‌های فعلی فروشگاه',
                            accentColor: AppColors.primary,
                            icon: Icons.inventory_2_rounded,
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          AppMetricTile(
                            title: 'ارسال امروز',
                            value: profile.sameDayDelivery ? 'فعال' : 'غیرفعال',
                            subtitle: profile.hasExpressDelivery
                                ? 'ارسال فوری هم فعال است'
                                : 'ارسال فوری فعال نیست',
                            accentColor: AppColors.accent,
                            icon: Icons.local_shipping_rounded,
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          AppGlassCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Wrap(
                                  alignment: WrapAlignment.spaceBetween,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  runSpacing: 12,
                                  spacing: 12,
                                  children: [
                                    Text(
                                      _isEditMode ? 'ویرایش پروفایل' : 'خلاصه پروفایل',
                                      style: theme.textTheme.titleMedium,
                                    ),
                                    if (_isEditMode)
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          TextButton(
                                            onPressed:
                                                _isSaving ? null : _cancelEdit,
                                            child: const Text('انصراف'),
                                          ),
                                          FilledButton(
                                            onPressed:
                                                _isSaving ? null : _saveProfile,
                                            child: Text(
                                              _isSaving
                                                  ? 'در حال ذخیره...'
                                                  : 'ذخیره',
                                            ),
                                          ),
                                        ],
                                      )
                                    else
                                      FilledButton.icon(
                                        onPressed: () {
                                          setState(() {
                                            _isEditMode = true;
                                            _errorMessage = null;
                                            _successMessage = null;
                                          });
                                        },
                                        icon: const Icon(Icons.edit_rounded),
                                        label: const Text('ویرایش'),
                                      ),
                                  ],
                                ),
                                if (_successMessage != null) ...[
                                  const SizedBox(height: AppSpacing.md),
                                  Text(
                                    _successMessage!,
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: AppColors.success,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                                if (_errorMessage != null && _profile != null) ...[
                                  const SizedBox(height: AppSpacing.md),
                                  Text(
                                    _errorMessage!,
                                    style: TextStyle(
                                      color: Theme.of(context).colorScheme.error,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: AppSpacing.lg),
                                if (_isEditMode)
                                  _StoreProfileEditForm(
                                    nameController: _nameController,
                                    slugController: _slugController,
                                    descriptionController: _descriptionController,
                                    minDeliveryController: _minDeliveryController,
                                    maxDeliveryController: _maxDeliveryController,
                                    expressDeliveryController:
                                        _expressDeliveryController,
                                    sameDayDelivery: _sameDayDelivery,
                                    hasExpressDelivery: _hasExpressDelivery,
                                    onSameDayChanged: (value) {
                                      setState(() {
                                        _sameDayDelivery = value;
                                      });
                                    },
                                    onExpressChanged: (value) {
                                      setState(() {
                                        _hasExpressDelivery = value;
                                      });
                                    },
                                    logoUrl: _logoUrl,
                                    pendingLogoFile: _pendingLogoFile,
                                    isUploadingLogo: _isUploadingLogo,
                                    onPickLogo: _pickAndUploadLogo,
                                    lockedAddress: profile.address,
                                  )
                                else
                                  _StoreProfileSummary(profile: profile),
                              ],
                            ),
                          ),
                          if (profile.deliveryWindows.isNotEmpty) ...[
                            const SizedBox(height: AppSpacing.lg),
                            AppGlassCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'بازه‌های ارسال',
                                    style: theme.textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: AppSpacing.md),
                                  ...profile.deliveryWindows.map(
                                    (item) => Padding(
                                      padding: const EdgeInsets.only(bottom: 10),
                                      child: Container(
                                        padding: const EdgeInsets.all(14),
                                        decoration: BoxDecoration(
                                          color: AppColors.surfaceSoft
                                              .withValues(alpha: 0.72),
                                          borderRadius:
                                              BorderRadius.circular(18),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item.label,
                                              style: theme.textTheme.labelLarge
                                                  ?.copyWith(
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${item.startTime} تا ${item.endTime}',
                                              style: theme.textTheme.bodyMedium
                                                  ?.copyWith(
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
          ),
        ),
      ),
    );
  }
}

class _StoreProfileHeroCard extends StatelessWidget {
  const _StoreProfileHeroCard({
    required this.profile,
  });

  final VendorStoreProfile profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final availableWidth = MediaQuery.sizeOf(context).width - 84;
    final contentWidth = availableWidth < 0 ? 0.0 : availableWidth;

    return AppGlassCard(
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            colors: [
              AppColors.primary,
              AppColors.primaryDark,
            ],
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
          ),
        ),
        child: Wrap(
          spacing: AppSpacing.lg,
          runSpacing: AppSpacing.lg,
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            _StoreLogo(logoUrl: profile.logo),
            SizedBox(
              width: contentWidth.clamp(0.0, 320.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile.name,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    profile.address.isEmpty
                        ? 'آدرس فروشگاه هنوز کامل نشده است.'
                        : profile.address,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _HeroPill(
                        text: profile.slug.isEmpty ? 'بدون اسلاگ' : profile.slug,
                      ),
                      _HeroPill(
                        text: profile.isVerified ? 'تایید شده' : 'در انتظار تایید',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({
    required this.text,
  });

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _StoreLogo extends StatelessWidget {
  const _StoreLogo({
    required this.logoUrl,
    this.file,
  });

  final String logoUrl;
  final File? file;

  @override
  Widget build(BuildContext context) {
    if (file != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Image.file(
          file!,
          width: 76,
          height: 76,
          fit: BoxFit.cover,
        ),
      );
    }

    if (logoUrl.isEmpty) {
      return Container(
        width: 76,
        height: 76,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(22),
        ),
        child: const Icon(
          Icons.storefront_rounded,
          color: Colors.white,
          size: 32,
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: Image.network(
        logoUrl,
        width: 76,
        height: 76,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: 76,
            height: 76,
            color: Colors.white.withValues(alpha: 0.14),
            child: const Icon(
              Icons.broken_image_rounded,
              color: Colors.white,
            ),
          );
        },
      ),
    );
  }
}

class _StoreProfileSummary extends StatelessWidget {
  const _StoreProfileSummary({
    required this.profile,
  });

  final VendorStoreProfile profile;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _SummaryRow(label: 'نام فروشگاه', value: profile.name),
        _SummaryRow(label: 'اسلاگ', value: profile.slug),
        _SummaryRow(
          label: 'توضیحات',
          value: profile.description.isEmpty ? 'هنوز ثبت نشده' : profile.description,
        ),
        _SummaryRow(
          label: 'آدرس',
          value: profile.address.isEmpty ? 'قفل یا ثبت‌نشده' : profile.address,
        ),
        _SummaryRow(
          label: 'ارسال امروز',
          value: profile.sameDayDelivery ? 'فعال' : 'غیرفعال',
        ),
        _SummaryRow(
          label: 'ارسال فوری',
          value: profile.hasExpressDelivery ? 'فعال' : 'غیرفعال',
        ),
        _SummaryRow(
          label: 'حداقل زمان ارسال',
          value: profile.minDeliveryHours == null
              ? '—'
              : '${profile.minDeliveryHours} ساعت',
        ),
        _SummaryRow(
          label: 'حداکثر زمان ارسال',
          value: profile.maxDeliveryHours == null
              ? '—'
              : '${profile.maxDeliveryHours} ساعت',
        ),
        _SummaryRow(
          label: 'زمان ارسال فوری',
          value: profile.expressDeliveryHours == null
              ? '—'
              : '${profile.expressDeliveryHours} ساعت',
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodyLarge,
            ),
          ),
        ],
      ),
    );
  }
}

class _StoreProfileEditForm extends StatelessWidget {
  const _StoreProfileEditForm({
    required this.nameController,
    required this.slugController,
    required this.descriptionController,
    required this.minDeliveryController,
    required this.maxDeliveryController,
    required this.expressDeliveryController,
    required this.sameDayDelivery,
    required this.hasExpressDelivery,
    required this.onSameDayChanged,
    required this.onExpressChanged,
    required this.logoUrl,
    required this.pendingLogoFile,
    required this.isUploadingLogo,
    required this.onPickLogo,
    required this.lockedAddress,
  });

  final TextEditingController nameController;
  final TextEditingController slugController;
  final TextEditingController descriptionController;
  final TextEditingController minDeliveryController;
  final TextEditingController maxDeliveryController;
  final TextEditingController expressDeliveryController;
  final bool sameDayDelivery;
  final bool hasExpressDelivery;
  final ValueChanged<bool> onSameDayChanged;
  final ValueChanged<bool> onExpressChanged;
  final String logoUrl;
  final File? pendingLogoFile;
  final bool isUploadingLogo;
  final VoidCallback onPickLogo;
  final String lockedAddress;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'نام فروشگاه',
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: slugController,
          decoration: const InputDecoration(
            labelText: 'اسلاگ',
          ),
          textDirection: TextDirection.ltr,
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: descriptionController,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'توضیحات فروشگاه',
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surfaceSoft.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.65),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: _StoreLogo(
                  logoUrl: logoUrl,
                  file: pendingLogoFile,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'لوگوی فروشگاه',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 6),
              Text(
                'تصویر مربع 1:1 انتخاب کن. قبل از ذخیره، داخل موبایل کراپ می‌شود.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
              ),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: isUploadingLogo ? null : onPickLogo,
                  icon: isUploadingLogo
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.cloud_upload_rounded),
                  label: Text(isUploadingLogo ? 'در حال آپلود' : 'بارگذاری'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        InputDecorator(
          decoration: const InputDecoration(
            labelText: 'آدرس فروشگاه',
            helperText: 'آدرس از سمت فروشنده در این مرحله قابل ویرایش نیست.',
          ),
          child: Text(
            lockedAddress.isEmpty ? 'ثبت نشده' : lockedAddress,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        SwitchListTile(
          value: sameDayDelivery,
          onChanged: onSameDayChanged,
          title: const Text('ارسال امروز فعال باشد'),
          contentPadding: EdgeInsets.zero,
        ),
        SwitchListTile(
          value: hasExpressDelivery,
          onChanged: onExpressChanged,
          title: const Text('ارسال فوری فعال باشد'),
          contentPadding: EdgeInsets.zero,
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: minDeliveryController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'حداقل زمان ارسال',
                  hintText: 'ساعت',
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: TextField(
                controller: maxDeliveryController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'حداکثر زمان ارسال',
                  hintText: 'ساعت',
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: expressDeliveryController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'زمان ارسال فوری',
            hintText: 'ساعت',
          ),
        ),
      ],
    );
  }
}

class _StoreProfileLoadingView extends StatelessWidget {
  const _StoreProfileLoadingView();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
      children: [
        Text(
          'پروفایل فروشگاه',
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: AppSpacing.lg),
        const AppGlassCard(
          child: SizedBox(
            height: 220,
            child: Center(
              child: CircularProgressIndicator(),
            ),
          ),
        ),
      ],
    );
  }
}

class _StoreProfileErrorView extends StatelessWidget {
  const _StoreProfileErrorView({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'پروفایل فروشگاه',
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: AppSpacing.lg),
        AppGlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'خطا در بارگذاری پروفایل',
                style: theme.textTheme.headlineMedium,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                message,
                style: theme.textTheme.bodyLarge,
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: onRetry,
                child: const Text('تلاش دوباره'),
              ),
            ],
          ),
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
