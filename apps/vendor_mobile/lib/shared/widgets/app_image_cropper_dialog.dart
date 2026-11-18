import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/platform/io_shim.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';

class AppImageCropperDialog extends StatefulWidget {
  const AppImageCropperDialog({
    super.key,
    required this.imageBytes,
    this.title = 'برش تصویر (۱:۱)',
  });

  final Uint8List imageBytes;
  final String title;

  static Future<Uint8List?> show(
    BuildContext context, {
    required Uint8List imageBytes,
    String title = 'برش تصویر (۱:۱)',
  }) {
    return showDialog<Uint8List>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.85),
      builder: (context) => AppImageCropperDialog(
        imageBytes: imageBytes,
        title: title,
      ),
    );
  }

  static Future<File?> cropXFileOnWeb(
    BuildContext context,
    XFile xFile, {
    String title = 'برش تصویر (۱:۱)',
  }) async {
    final rawBytes = await xFile.readAsBytes();
    if (!context.mounted) return null;

    final croppedBytes = await show(
      context,
      imageBytes: rawBytes,
      title: title,
    );

    if (croppedBytes == null || croppedBytes.isEmpty) {
      return null;
    }

    final sanitizedName = xFile.name.toLowerCase().endsWith('.png')
        ? '${xFile.name.replaceAll(RegExp(r'\.png$', caseSensitive: false), '')}.png'
        : '${xFile.name.replaceAll(RegExp(r'\.[^.]*$', caseSensitive: false), '')}.jpg';

    File.cache(xFile.path, croppedBytes, sanitizedName);
    return File(xFile.path, bytes: croppedBytes, name: sanitizedName);
  }

  @override
  State<AppImageCropperDialog> createState() => _AppImageCropperDialogState();
}

class _AppImageCropperDialogState extends State<AppImageCropperDialog> {
  final GlobalKey _cropBoundaryKey = GlobalKey();
  final TransformationController _transformController =
      TransformationController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _transformController.dispose();
    super.dispose();
  }

  Future<void> _handleConfirm() async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);

    try {
      final boundary = _cropBoundaryKey.currentContext?.findRenderObject()
          as RenderRepaintBoundary?;
      if (boundary == null) {
        Navigator.of(context).pop(widget.imageBytes);
        return;
      }

      // Render at pixelRatio 2.5 for crisp high-resolution output
      final image = await boundary.toImage(pixelRatio: 2.5);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) {
        if (mounted) Navigator.of(context).pop(widget.imageBytes);
        return;
      }

      final croppedBytes = byteData.buffer.asUint8List();
      if (mounted) {
        Navigator.of(context).pop(croppedBytes);
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(widget.imageBytes);
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final maxCropSize = (screenSize.width - 48).clamp(260.0, 360.0);

    return PopScope(
      canPop: !_isProcessing,
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 420),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF132A20),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.15),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.5),
                blurRadius: 30,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                children: [
                  const Icon(
                    Icons.crop_rounded,
                    color: AppColors.secondary,
                    size: 22,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed:
                        _isProcessing ? null : () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, color: Colors.white70),
                    tooltip: 'انصراف',
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'کادر ۱:۱ را جابه‌جا یا با دو انگشت زوم کنید تا بخش مورد نظر تنظیم شود.',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.white70,
                  height: 1.4,
                ),
                textAlign: TextAlign.start,
              ),
              const SizedBox(height: AppSpacing.md),

              // Square 1:1 Crop Viewport
              Center(
                child: Container(
                  width: maxCropSize,
                  height: maxCropSize,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.secondary,
                      width: 2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 16,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        RepaintBoundary(
                          key: _cropBoundaryKey,
                          child: InteractiveViewer(
                            transformationController: _transformController,
                            panEnabled: true,
                            scaleEnabled: true,
                            minScale: 1.0,
                            maxScale: 4.5,
                            boundaryMargin: const EdgeInsets.all(double.infinity),
                            child: Image.memory(
                              widget.imageBytes,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        // Grid Overlay
                        IgnorePointer(
                          child: CustomPaint(
                            painter: _CropGridPainter(),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Bottom Actions
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _isProcessing ? null : _handleConfirm,
                      icon: _isProcessing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.check_rounded),
                      label: Text(
                        _isProcessing ? 'در حال برش...' : 'تأیید و برش',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white70,
                      side: BorderSide(
                        color: Colors.white.withValues(alpha: 0.25),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    onPressed:
                        _isProcessing ? null : () => Navigator.of(context).pop(),
                    child: const Text('انصراف'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CropGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final stepX = size.width / 3;
    final stepY = size.height / 3;

    canvas.drawLine(Offset(stepX, 0), Offset(stepX, size.height), paint);
    canvas.drawLine(Offset(stepX * 2, 0), Offset(stepX * 2, size.height), paint);
    canvas.drawLine(Offset(0, stepY), Offset(size.width, stepY), paint);
    canvas.drawLine(Offset(0, stepY * 2), Offset(size.width, stepY * 2), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
