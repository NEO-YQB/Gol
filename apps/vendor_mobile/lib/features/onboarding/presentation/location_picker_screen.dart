import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_glass_card.dart';
import '../domain/mobile_runtime_config.dart';

class OnboardingLocationPickerScreen extends StatefulWidget {
  const OnboardingLocationPickerScreen({
    super.key,
    required this.runtimeConfig,
    this.initialLat,
    this.initialLng,
  });

  final MobileRuntimeConfig runtimeConfig;
  final double? initialLat;
  final double? initialLng;

  @override
  State<OnboardingLocationPickerScreen> createState() =>
      _OnboardingLocationPickerScreenState();
}

class _OnboardingLocationPickerScreenState
    extends State<OnboardingLocationPickerScreen> {
  static const _defaultLat = 35.7219;
  static const _defaultLng = 51.3347;

  late double _selectedLat;
  late double _selectedLng;
  late final WebViewController _controller;
  bool _isMapReady = false;
  String? _mapError;

  @override
  void initState() {
    super.initState();
    _selectedLat = widget.initialLat ?? _defaultLat;
    _selectedLng = widget.initialLng ?? _defaultLng;

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..addJavaScriptChannel(
        'GapCodeMapBridge',
        onMessageReceived: (message) {
          final parts = message.message.split(',');
          if (parts.length != 2) return;
          final lat = double.tryParse(parts.first);
          final lng = double.tryParse(parts.last);
          if (lat == null || lng == null || !mounted) return;
          setState(() {
            _selectedLat = lat;
            _selectedLng = lng;
          });
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() {
              _isMapReady = true;
            });
          },
        ),
      )
      ..loadHtmlString(_buildHtml());
  }

  String _buildHtml() {
    final apiKey = widget.runtimeConfig.mapPublicKey;
    final styleUrl = widget.runtimeConfig.mapStyleUrl;
    final rtlPlugin = widget.runtimeConfig.mapRtlPluginUrl;

    return '''
<!DOCTYPE html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
    <style>
      html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f7f1e7; }
      .error {
        position: fixed; inset: 16px 16px auto 16px; z-index: 9;
        background: rgba(137, 21, 47, 0.92); color: white; border-radius: 12px;
        padding: 12px 14px; font-family: sans-serif; font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
    <script>
      const apiKey = ${_escapeJsString(apiKey)};
      const styleUrl = ${_escapeJsString(styleUrl)};
      const rtlPlugin = ${_escapeJsString(rtlPlugin)};
      const initialLat = ${_selectedLat.toStringAsFixed(8)};
      const initialLng = ${_selectedLng.toStringAsFixed(8)};

      function report(lat, lng) {
        if (window.GapCodeMapBridge) {
          GapCodeMapBridge.postMessage(lat + ',' + lng);
        }
      }

      function showError(text) {
        const node = document.createElement('div');
        node.className = 'error';
        node.innerText = text;
        document.body.appendChild(node);
      }

      try {
        if (!apiKey || apiKey === '') {
          showError('کلید MAP_IR_API_KEY تنظیم نشده است.');
        } else {
          mapboxgl.accessToken = apiKey;
          if (mapboxgl.setRTLTextPlugin) {
            mapboxgl.setRTLTextPlugin(rtlPlugin, undefined, true);
          }

          const map = new mapboxgl.Map({
            container: 'map',
            style: styleUrl,
            center: [initialLng, initialLat],
            zoom: 15,
            transformRequest: (url) => {
              if (url.startsWith('https://map.ir')) {
                return { url, headers: { 'x-api-key': apiKey } };
              }
              return { url };
            }
          });

          map.addControl(new mapboxgl.NavigationControl(), 'top-left');

          const marker = new mapboxgl.Marker({ draggable: true })
            .setLngLat([initialLng, initialLat])
            .addTo(map);

          map.on('click', (event) => {
            const lat = event.lngLat?.lat;
            const lng = event.lngLat?.lng;
            if (typeof lat !== 'number' || typeof lng !== 'number') return;
            marker.setLngLat([lng, lat]);
            report(lat, lng);
          });

          marker.on('dragend', () => {
            const point = marker.getLngLat();
            report(point.lat, point.lng);
          });

          map.on('load', () => {
            report(initialLat, initialLng);
          });
        }
      } catch (error) {
        showError('بارگذاری نقشه ممکن نشد.');
      }
    </script>
  </body>
</html>
''';
  }

  String _escapeJsString(String value) {
    final escaped = value
        .replaceAll(r'\', r'\\')
        .replaceAll("'", r"\'")
        .replaceAll('\n', r'\n');
    return "'$escaped'";
  }

  @override
  Widget build(BuildContext context) {
    final canConfirm = _selectedLat != 0 && _selectedLng != 0;
    final hasMapKey = widget.runtimeConfig.mapPublicKey.trim().isNotEmpty;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('انتخاب موقعیت کسب‌وکار'),
        ),
        body: Column(
          children: [
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: WebViewWidget(controller: _controller),
                  ),
                  if (!_isMapReady)
                    const Positioned.fill(
                      child: ColoredBox(
                        color: Color(0xCCFFF9F0),
                        child: Center(
                          child: CircularProgressIndicator(),
                        ),
                      ),
                    ),
                  if (!hasMapKey)
                    Positioned.fill(
                  child: ColoredBox(
                        color: const Color(0xF2FFF9F0),
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Text(
                              'نمایش نقشه در حال حاضر در دسترس نیست.',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          ),
                        ),
                      ),
                    ),
                  if (_mapError != null)
                    Positioned(
                      top: 16,
                      left: 16,
                      right: 16,
                      child: Material(
                        color: AppColors.danger,
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(
                            _mapError!,
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            SafeArea(
              top: false,
              minimum: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: AppGlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'نقطه فروشگاه را انتخاب کن.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      '${_selectedLat.toStringAsFixed(5)} ، ${_selectedLng.toStringAsFixed(5)}',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: canConfirm
                            ? () {
                                Navigator.of(context).pop(
                                  OnboardingLocationSelection(
                                    lat: _selectedLat,
                                    lng: _selectedLng,
                                  ),
                                );
                              }
                            : null,
                        child: const Text('تایید موقعیت'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class OnboardingLocationSelection {
  const OnboardingLocationSelection({
    required this.lat,
    required this.lng,
  });

  final double lat;
  final double lng;
}
