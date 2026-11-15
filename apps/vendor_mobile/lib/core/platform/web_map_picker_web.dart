import 'dart:async';
import 'dart:html' as html;
import 'dart:js_util' as js_util;
import 'package:flutter/foundation.dart';

Future<String?> pickWebMapLocation({
  required double initialLat,
  required double initialLng,
  required String apiKey,
  required String styleUrl,
  required String rtlPluginUrl,
}) async {
  try {
    final target = js_util.hasProperty(js_util.globalThis, 'openVendorMapPicker')
        ? js_util.globalThis
        : (js_util.hasProperty(html.window, 'openVendorMapPicker') ? html.window : null);

    if (target == null) {
      debugPrint('[WebMapPicker] openVendorMapPicker function not found on window or globalThis');
      return null;
    }

    final promise = js_util.callMethod(
      target,
      'openVendorMapPicker',
      [initialLat, initialLng, apiKey, styleUrl, rtlPluginUrl],
    );
    if (promise == null) return null;
    final result = await js_util.promiseToFuture(promise);
    return result?.toString();
  } catch (error, stack) {
    debugPrint('[WebMapPicker] error invoking openVendorMapPicker: $error\n$stack');
    return null;
  }
}
