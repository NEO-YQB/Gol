import 'dart:io';

import 'package:flutter/foundation.dart';

import '../../../auth/data/auth_api_service.dart';
import '../../../auth/domain/vendor_bootstrap.dart';
import '../../data/repositories/vendor_onboarding_repository.dart';
import '../../domain/mobile_runtime_config.dart';
import '../../domain/vendor_onboarding_request.dart';

enum VendorOnboardingStep {
  profile,
  applicationReview,
  sampleProduct,
  productReview,
  completed,
}

class EditableOnboardingDocument {
  const EditableOnboardingDocument({
    required this.title,
    required this.url,
  });

  final String title;
  final String url;

  EditableOnboardingDocument copyWith({
    String? title,
    String? url,
  }) {
    return EditableOnboardingDocument(
      title: title ?? this.title,
      url: url ?? this.url,
    );
  }
}

class VendorOnboardingViewState {
  const VendorOnboardingViewState({
    this.request,
    this.isLoading = true,
    this.isSubmitting = false,
    this.isUploading = false,
    this.errorMessage,
    this.successMessage,
    this.currentStep = VendorOnboardingStep.profile,
    this.applicationDocuments = const [],
    this.productGalleryImages = const [],
    this.pendingUploadName,
    this.selectedBusinessLat,
    this.selectedBusinessLng,
    this.resolvedBusinessAddress,
    this.runtimeConfig,
  });

  final VendorOnboardingRequest? request;
  final bool isLoading;
  final bool isSubmitting;
  final bool isUploading;
  final String? errorMessage;
  final String? successMessage;
  final VendorOnboardingStep currentStep;
  final List<EditableOnboardingDocument> applicationDocuments;
  final List<String> productGalleryImages;
  final String? pendingUploadName;
  final double? selectedBusinessLat;
  final double? selectedBusinessLng;
  final String? resolvedBusinessAddress;
  final MobileRuntimeConfig? runtimeConfig;

  String? get activeApplicationReviewNote {
    final message = request?.reviewNote.trim() ?? '';
    if (message.isEmpty) return null;
    return request?.applicationStatus == 'REJECTED' ? message : null;
  }

  String? get activeProductReviewNote {
    final message = request?.productReviewNote.trim() ?? '';
    if (message.isEmpty) return null;
    return request?.productStatus == 'REJECTED' ? message : null;
  }

  bool get canEditProfile =>
      request == null ||
      request!.applicationStatus == 'DRAFT' ||
      request!.applicationStatus == 'REJECTED';

  bool get canEditProduct =>
      request != null &&
      request!.applicationStatus == 'APPROVED' &&
      (request!.productStatus == 'DRAFT' || request!.productStatus == 'REJECTED');

  VendorOnboardingViewState copyWith({
    VendorOnboardingRequest? request,
    bool? isLoading,
    bool? isSubmitting,
    bool? isUploading,
    String? errorMessage,
    bool clearError = false,
    String? successMessage,
    bool clearSuccess = false,
    VendorOnboardingStep? currentStep,
    List<EditableOnboardingDocument>? applicationDocuments,
    List<String>? productGalleryImages,
    String? pendingUploadName,
    bool clearPendingUpload = false,
    double? selectedBusinessLat,
    double? selectedBusinessLng,
    bool clearSelectedLocation = false,
    String? resolvedBusinessAddress,
    bool clearResolvedBusinessAddress = false,
    MobileRuntimeConfig? runtimeConfig,
  }) {
    return VendorOnboardingViewState(
      request: request ?? this.request,
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      isUploading: isUploading ?? this.isUploading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      successMessage: clearSuccess ? null : successMessage ?? this.successMessage,
      currentStep: currentStep ?? this.currentStep,
      applicationDocuments: applicationDocuments ?? this.applicationDocuments,
      productGalleryImages: productGalleryImages ?? this.productGalleryImages,
      pendingUploadName:
          clearPendingUpload ? null : pendingUploadName ?? this.pendingUploadName,
      selectedBusinessLat: clearSelectedLocation
          ? null
          : selectedBusinessLat ?? this.selectedBusinessLat,
      selectedBusinessLng: clearSelectedLocation
          ? null
          : selectedBusinessLng ?? this.selectedBusinessLng,
      resolvedBusinessAddress: clearResolvedBusinessAddress
          ? null
          : resolvedBusinessAddress ?? this.resolvedBusinessAddress,
      runtimeConfig: runtimeConfig ?? this.runtimeConfig,
    );
  }
}

class VendorOnboardingApplicationInput {
  const VendorOnboardingApplicationInput({
    required this.personalFullName,
    required this.personalNationalId,
    required this.businessName,
    required this.businessSlug,
    required this.businessDescription,
    required this.businessAddress,
    required this.licenseNumber,
    required this.businessLat,
    required this.businessLng,
  });

  final String personalFullName;
  final String personalNationalId;
  final String businessName;
  final String businessSlug;
  final String businessDescription;
  final String businessAddress;
  final String licenseNumber;
  final double? businessLat;
  final double? businessLng;
}

class VendorOnboardingProductInput {
  const VendorOnboardingProductInput({
    required this.productName,
    required this.productDescription,
    required this.productMainImageAlt,
    required this.productPrice,
    required this.productQuantity,
  });

  final String productName;
  final String productDescription;
  final String productMainImageAlt;
  final String productPrice;
  final String productQuantity;
}

class VendorOnboardingViewModel extends ChangeNotifier {
  VendorOnboardingViewModel({
    required String accessToken,
    required VendorOnboardingState? bootstrapState,
    VendorOnboardingRepository repository = const VendorOnboardingRepository(),
  })  : _accessToken = accessToken,
        _bootstrapState = bootstrapState,
        _repository = repository {
    _state = VendorOnboardingViewState(
      isLoading: true,
      currentStep: _resolveBootstrapStep(bootstrapState),
    );
  }

  final String _accessToken;
  final VendorOnboardingState? _bootstrapState;
  final VendorOnboardingRepository _repository;
  bool _isDisposed = false;

  VendorOnboardingViewState _state = const VendorOnboardingViewState();
  VendorOnboardingViewState get state => _state;

  Future<void> loadRequest() async {
    _state = _state.copyWith(isLoading: true, clearError: true);
    _notifyIfActive();

    try {
      final runtimeConfigFuture = _repository.getRuntimeConfig();
      final requestFuture = _repository.getMyRequest(accessToken: _accessToken);
      final results = await Future.wait([runtimeConfigFuture, requestFuture]);
      final runtimeConfig = results[0] as MobileRuntimeConfig;
      final request = results[1] as VendorOnboardingRequest;
      if (_isDisposed) return;
      _state = _state.copyWith(
        runtimeConfig: runtimeConfig,
        request: request,
        applicationDocuments: request.documents
            .map((item) => EditableOnboardingDocument(title: item.title, url: item.url))
            .toList(),
        productGalleryImages: request.productGalleryImages,
        selectedBusinessLat: request.businessLat,
        selectedBusinessLng: request.businessLng,
        resolvedBusinessAddress: request.businessAddress,
        currentStep: _resolveCurrentStep(request),
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

  Future<void> submitApplication(VendorOnboardingApplicationInput form) async {
    if (form.personalFullName.trim().isEmpty ||
        form.personalNationalId.trim().isEmpty ||
        form.businessName.trim().isEmpty ||
        form.businessSlug.trim().isEmpty ||
        form.businessAddress.trim().isEmpty ||
        form.licenseNumber.trim().isEmpty) {
      _state = _state.copyWith(
        errorMessage: 'همه اطلاعات اصلی فروشنده و کسب‌وکار را کامل کن.',
        clearSuccess: true,
      );
      _notifyIfActive();
      return;
    }

    _state = _state.copyWith(
      isSubmitting: true,
      clearError: true,
      clearSuccess: true,
    );
    _notifyIfActive();

    try {
      final request = await _repository.submitApplication(
        accessToken: _accessToken,
        input: {
          'personalFullName': form.personalFullName.trim(),
          'personalNationalId': form.personalNationalId.trim(),
          'businessName': form.businessName.trim(),
          'businessSlug': form.businessSlug.trim(),
          'businessDescription': form.businessDescription.trim(),
          'businessAddress': form.businessAddress.trim(),
          'businessLat': form.businessLat,
          'businessLng': form.businessLng,
          'licenseNumber': form.licenseNumber.trim(),
          'licenseImageUrl': _state.applicationDocuments
              .firstWhere(
                (item) => item.title == 'تصویر جواز',
                orElse: () => const EditableOnboardingDocument(title: '', url: ''),
              )
              .url,
          'documents': _state.applicationDocuments
              .map((item) => {'title': item.title, 'url': item.url})
              .toList(),
        },
      );
      if (_isDisposed) return;
      _state = _state.copyWith(
        request: request,
        currentStep: _resolveCurrentStep(request),
        successMessage: 'درخواست فروشندگی ثبت شد و منتظر بررسی است.',
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isSubmitting: false);
      _notifyIfActive();
    }
  }

  Future<void> submitProduct(VendorOnboardingProductInput form) async {
    if (form.productName.trim().isEmpty) {
      _state = _state.copyWith(
        errorMessage: 'حداقل نام محصول نمونه را وارد کن.',
        clearSuccess: true,
      );
      _notifyIfActive();
      return;
    }

    _state = _state.copyWith(
      isSubmitting: true,
      clearError: true,
      clearSuccess: true,
    );
    _notifyIfActive();

    try {
      final request = await _repository.submitProduct(
        accessToken: _accessToken,
        input: {
          'productName': form.productName.trim(),
          'productDescription': form.productDescription.trim(),
          'productMainImage': _state.productGalleryImages.isEmpty
              ? (_state.request?.productMainImage ?? '')
              : _state.productGalleryImages.first,
          'productMainImageAlt': form.productMainImageAlt.trim(),
          'productGalleryImages': _state.productGalleryImages,
          'productPrice': num.tryParse(form.productPrice.trim()),
          'productQuantity': int.tryParse(form.productQuantity.trim()),
        },
      );
      if (_isDisposed) return;
      _state = _state.copyWith(
        request: request,
        currentStep: _resolveCurrentStep(request),
        successMessage: 'محصول نمونه ثبت شد و منتظر بررسی است.',
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isSubmitting: false);
      _notifyIfActive();
    }
  }

  Future<void> uploadApplicationDocument({
    required File file,
    required String title,
  }) async {
    await _uploadFile(
      file: file,
      title: title,
      onUploaded: (url) {
        final next = [..._state.applicationDocuments];
        final index = next.indexWhere((item) => item.title == title);
        final document = EditableOnboardingDocument(title: title, url: url);
        if (index >= 0) {
          next[index] = document;
        } else {
          next.add(document);
        }
        _state = _state.copyWith(
          applicationDocuments: next,
          successMessage: 'فایل $title آپلود شد.',
        );
      },
    );
  }

  Future<void> uploadProductImage(File file) async {
    await _uploadFile(
      file: file,
      title: 'تصویر محصول',
      useDocumentEndpoint: false,
      onUploaded: (url) {
        final next = [..._state.productGalleryImages, url];
        _state = _state.copyWith(
          productGalleryImages: next,
          successMessage: 'تصویر محصول آپلود شد.',
        );
      },
    );
  }

  void removeApplicationDocument(String title) {
    _state = _state.copyWith(
      applicationDocuments: _state.applicationDocuments
          .where((item) => item.title != title)
          .toList(),
    );
    _notifyIfActive();
  }

  Future<void> selectBusinessLocation({
    required double lat,
    required double lng,
  }) async {
    _state = _state.copyWith(
      isLoading: true,
      clearError: true,
      clearSuccess: true,
      selectedBusinessLat: lat,
      selectedBusinessLng: lng,
      clearResolvedBusinessAddress: true,
    );
    _notifyIfActive();

    try {
      final result = await _repository.reverseGeocode(
        accessToken: _accessToken,
        lat: lat,
        lng: lng,
      );
      if (_isDisposed) return;
      _state = _state.copyWith(
        resolvedBusinessAddress: result.formattedAddress,
        successMessage: result.formattedAddress.trim().isEmpty
            ? 'موقعیت فروشگاه انتخاب شد.'
            : 'آدرس از روی نقشه شناسایی شد.',
      );
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(
        errorMessage: error.message,
      );
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(isLoading: false);
      _notifyIfActive();
    }
  }

  void removeProductImage(String url) {
    _state = _state.copyWith(
      productGalleryImages:
          _state.productGalleryImages.where((item) => item != url).toList(),
    );
    _notifyIfActive();
  }

  VendorOnboardingStep _resolveCurrentStep(VendorOnboardingRequest request) {
    if (request.productApproved) return VendorOnboardingStep.completed;
    if (request.applicationApproved && request.productStatus == 'SUBMITTED') {
      return VendorOnboardingStep.productReview;
    }
    if (request.applicationApproved) return VendorOnboardingStep.sampleProduct;
    if (request.applicationStatus == 'SUBMITTED' ||
        request.applicationStatus == 'UNDER_REVIEW') {
      return VendorOnboardingStep.applicationReview;
    }
    return VendorOnboardingStep.profile;
  }

  VendorOnboardingStep _resolveBootstrapStep(VendorOnboardingState? bootstrapState) {
    if (bootstrapState == null) return VendorOnboardingStep.profile;
    if (bootstrapState.productStatus == 'APPROVED') {
      return VendorOnboardingStep.completed;
    }
    if (bootstrapState.applicationStatus == 'APPROVED' &&
        bootstrapState.productStatus == 'SUBMITTED') {
      return VendorOnboardingStep.productReview;
    }
    if (bootstrapState.applicationStatus == 'APPROVED') {
      return VendorOnboardingStep.sampleProduct;
    }
    if (bootstrapState.applicationStatus == 'SUBMITTED' ||
        bootstrapState.applicationStatus == 'UNDER_REVIEW') {
      return VendorOnboardingStep.applicationReview;
    }
    return VendorOnboardingStep.profile;
  }

  Future<void> _uploadFile({
    required File file,
    required String title,
    bool useDocumentEndpoint = true,
    required void Function(String url) onUploaded,
  }) async {
    _state = _state.copyWith(
      isUploading: true,
      pendingUploadName: title,
      clearError: true,
      clearSuccess: true,
    );
    _notifyIfActive();

    try {
      final url = useDocumentEndpoint
          ? await _repository.uploadApplicationDocument(
              accessToken: _accessToken,
              file: file,
            )
          : await _repository.uploadProductImage(
              accessToken: _accessToken,
              file: file,
            );
      if (_isDisposed) return;
      onUploaded(url);
    } on AuthApiException catch (error) {
      if (_isDisposed) return;
      _state = _state.copyWith(errorMessage: error.message);
    } finally {
      if (_isDisposed) return;
      _state = _state.copyWith(
        isUploading: false,
        clearPendingUpload: true,
      );
      _notifyIfActive();
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
