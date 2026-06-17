import 'dart:io';

import '../../domain/vendor_onboarding_request.dart';
import '../vendor_onboarding_api_service.dart';

class VendorOnboardingRepository {
  const VendorOnboardingRepository({
    VendorOnboardingApiService apiService = const VendorOnboardingApiService(),
  }) : _apiService = apiService;

  final VendorOnboardingApiService _apiService;

  Future<VendorOnboardingRequest> getMyRequest({
    required String accessToken,
  }) {
    return _apiService.getMyRequest(accessToken: accessToken);
  }

  Future<VendorOnboardingRequest> submitApplication({
    required String accessToken,
    required Map<String, dynamic> input,
  }) {
    return _apiService.submitApplication(
      accessToken: accessToken,
      input: input,
    );
  }

  Future<VendorOnboardingRequest> submitProduct({
    required String accessToken,
    required Map<String, dynamic> input,
  }) {
    return _apiService.submitProduct(
      accessToken: accessToken,
      input: input,
    );
  }

  Future<String> uploadDocument({
    required String accessToken,
    required File file,
  }) {
    return _apiService.uploadDocument(
      accessToken: accessToken,
      file: file,
    );
  }
}
