import 'dart:io';

import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../data/repositories/store_profile_repository.dart';
import '../../domain/vendor_store_profile.dart';

class StoreProfileViewState {
  const StoreProfileViewState({
    this.profile,
    this.isLoading = true,
    this.isSaving = false,
    this.isEditMode = false,
    this.isUploadingLogo = false,
    this.errorMessage,
    this.successMessage,
    this.sameDayDelivery = false,
    this.hasExpressDelivery = false,
    this.logoUrl = '',
    this.pendingLogoFile,
  });

  final VendorStoreProfile? profile;
  final bool isLoading;
  final bool isSaving;
  final bool isEditMode;
  final bool isUploadingLogo;
  final String? errorMessage;
  final String? successMessage;
  final bool sameDayDelivery;
  final bool hasExpressDelivery;
  final String logoUrl;
  final File? pendingLogoFile;

  StoreProfileViewState copyWith({
    VendorStoreProfile? profile,
    bool? isLoading,
    bool? isSaving,
    bool? isEditMode,
    bool? isUploadingLogo,
    String? errorMessage,
    String? successMessage,
    bool? sameDayDelivery,
    bool? hasExpressDelivery,
    String? logoUrl,
    File? pendingLogoFile,
    bool clearError = false,
    bool clearSuccess = false,
    bool clearPendingLogo = false,
  }) {
    return StoreProfileViewState(
      profile: profile ?? this.profile,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      isEditMode: isEditMode ?? this.isEditMode,
      isUploadingLogo: isUploadingLogo ?? this.isUploadingLogo,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      successMessage:
          clearSuccess ? null : successMessage ?? this.successMessage,
      sameDayDelivery: sameDayDelivery ?? this.sameDayDelivery,
      hasExpressDelivery: hasExpressDelivery ?? this.hasExpressDelivery,
      logoUrl: logoUrl ?? this.logoUrl,
      pendingLogoFile:
          clearPendingLogo ? null : pendingLogoFile ?? this.pendingLogoFile,
    );
  }
}

class StoreProfileFormInput {
  const StoreProfileFormInput({
    required this.name,
    required this.slug,
    required this.description,
    required this.minDeliveryHours,
    required this.maxDeliveryHours,
    required this.expressDeliveryHours,
  });

  final String name;
  final String slug;
  final String description;
  final int? minDeliveryHours;
  final int? maxDeliveryHours;
  final int? expressDeliveryHours;
}

class StoreProfileViewModel extends ChangeNotifier {
  StoreProfileViewModel({
    required String accessToken,
    required int storeId,
    required String storeSlug,
    StoreProfileRepository repository = const StoreProfileRepository(),
  })  : _accessToken = accessToken,
        _storeId = storeId,
        _storeSlug = storeSlug,
        _repository = repository;

  final String _accessToken;
  final int _storeId;
  final String _storeSlug;
  final StoreProfileRepository _repository;
  bool _isDisposed = false;

  StoreProfileViewState _state = const StoreProfileViewState();
  StoreProfileViewState get state => _state;

  Future<void> loadProfile() async {
    _state = _state.copyWith(isLoading: true, clearError: true);
    _notifyIfActive();

    try {
      final profile = await _repository.getStoreProfile(
        accessToken: _accessToken,
        storeSlug: _storeSlug,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(
        profile: profile,
        sameDayDelivery: profile.sameDayDelivery,
        hasExpressDelivery: profile.hasExpressDelivery,
        logoUrl: profile.logo,
        clearPendingLogo: true,
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isLoading: false);
      _notifyIfActive();
    }
  }

  Future<void> saveProfile(StoreProfileFormInput form) async {
    final currentProfile = _state.profile;
    if (currentProfile == null) return;

    if (form.name.trim().isEmpty || form.slug.trim().isEmpty) {
      _state = _state.copyWith(
        errorMessage: 'نام فروشگاه و اسلاگ الزامی هستند.',
        clearSuccess: true,
      );
      _notifyIfActive();
      return;
    }

    _state = _state.copyWith(
      isSaving: true,
      clearError: true,
      clearSuccess: true,
    );
    _notifyIfActive();

    try {
      final updated = await _repository.updateStoreProfile(
        accessToken: _accessToken,
        storeId: _storeId,
        storeSlug: _storeSlug,
        input: UpdateVendorStoreProfileInput(
          name: form.name,
          slug: form.slug,
          description: form.description,
          logo: _state.logoUrl,
          sameDayDelivery: _state.sameDayDelivery,
          hasExpressDelivery: _state.hasExpressDelivery,
          minDeliveryHours: form.minDeliveryHours,
          maxDeliveryHours: form.maxDeliveryHours,
          expressDeliveryHours: form.expressDeliveryHours,
          deliveryWindows: currentProfile.deliveryWindows,
        ),
      );

      if (_isDisposed) return;
      _state = _state.copyWith(
        profile: updated,
        isEditMode: false,
        successMessage: 'پروفایل فروشگاه با موفقیت ذخیره شد.',
        sameDayDelivery: updated.sameDayDelivery,
        hasExpressDelivery: updated.hasExpressDelivery,
        logoUrl: updated.logo,
        clearPendingLogo: true,
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isSaving: false);
      _notifyIfActive();
    }
  }

  Future<void> uploadLogo(File file) async {
    if (_state.isUploadingLogo || _state.isSaving) return;

    _state = _state.copyWith(
      isUploadingLogo: true,
      pendingLogoFile: file,
      clearError: true,
      clearSuccess: true,
    );
    _notifyIfActive();

    try {
      final uploadedUrl = await _repository.uploadStoreLogo(
        accessToken: _accessToken,
        file: file,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(
        logoUrl: uploadedUrl,
        isUploadingLogo: false,
        successMessage: 'لوگو آپلود شد و آماده ذخیره است.',
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        isUploadingLogo: false,
        errorMessage: error.message,
        clearPendingLogo: true,
      );
    } catch (_) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        isUploadingLogo: false,
        errorMessage: 'انتخاب یا برش لوگو انجام نشد.',
        clearPendingLogo: true,
      );
    } finally {
      _notifyIfActive();
    }
  }

  void startEdit() {
    _state = _state.copyWith(
      isEditMode: true,
      clearError: true,
      clearSuccess: true,
    );
    _notifyIfActive();
  }

  void cancelEdit() {
    final profile = _state.profile;
    if (profile == null) return;

    _state = _state.copyWith(
      isEditMode: false,
      sameDayDelivery: profile.sameDayDelivery,
      hasExpressDelivery: profile.hasExpressDelivery,
      logoUrl: profile.logo,
      clearError: true,
      clearSuccess: true,
      clearPendingLogo: true,
    );
    _notifyIfActive();
  }

  void setSameDayDelivery(bool value) {
    _state = _state.copyWith(sameDayDelivery: value);
    _notifyIfActive();
  }

  void setHasExpressDelivery(bool value) {
    _state = _state.copyWith(hasExpressDelivery: value);
    _notifyIfActive();
  }

  void setLogoPickerError() {
    _state = _state.copyWith(
      isUploadingLogo: false,
      errorMessage: 'انتخاب یا برش لوگو انجام نشد.',
      clearPendingLogo: true,
      clearSuccess: true,
    );
    _notifyIfActive();
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
