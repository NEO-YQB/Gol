import 'dart:io';

import '../../domain/vendor_store_profile.dart';
import '../store_profile_api_service.dart';

class StoreProfileRepository {
  const StoreProfileRepository({
    StoreProfileApiService apiService = const StoreProfileApiService(),
  }) : _apiService = apiService;

  final StoreProfileApiService _apiService;

  Future<VendorStoreProfile> getStoreProfile({
    required String accessToken,
    required String storeSlug,
  }) {
    return _apiService.getStoreProfile(
      accessToken: accessToken,
      storeSlug: storeSlug,
    );
  }

  Future<VendorStoreProfile> updateStoreProfile({
    required String accessToken,
    required int storeId,
    required String storeSlug,
    required UpdateVendorStoreProfileInput input,
  }) {
    return _apiService.updateStoreProfile(
      accessToken: accessToken,
      storeId: storeId,
      storeSlug: storeSlug,
      input: input,
    );
  }

  Future<String> uploadStoreLogo({
    required String accessToken,
    required File file,
  }) {
    return _apiService.uploadStoreLogo(
      accessToken: accessToken,
      file: file,
    );
  }
}
