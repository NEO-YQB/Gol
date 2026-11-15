import 'dart:async';
import 'dart:html' as html;
import 'dart:js_util' as js_util;

Future<String?> pickWebMapLocation({
  required double initialLat,
  required double initialLng,
  required String apiKey,
  required String styleUrl,
  required String rtlPluginUrl,
}) async {
  try {
    if (!js_util.hasProperty(html.window, 'openVendorMapPicker')) {
      return null;
    }
    final promise = js_util.callMethod(
      html.window,
      'openVendorMapPicker',
      [initialLat, initialLng, apiKey, styleUrl, rtlPluginUrl],
    );
    if (promise == null) return null;
    final result = await js_util.promiseToFuture(promise);
    return result?.toString();
  } catch (error) {
    return null;
  }
}
