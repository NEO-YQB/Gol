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

  Future<String> uploadApplicationDocument({
    required String accessToken,
    required File file,
  }) {
    return _apiService.uploadApplicationDocument(
      accessToken: accessToken,
      file: file,
    );
  }

  Future<String> uploadProductImage({
    required String accessToken,
    required File file,
  }) {
    return _apiService.uploadProductImage(
      accessToken: accessToken,
      file: file,
    );
  }

  Future<MapReverseGeocodeResult> reverseGeocode({
    required double lat,
    required double lng,
  }) {
    return _apiService.reverseGeocode(
      lat: lat,
      lng: lng,
    );
  }
}
