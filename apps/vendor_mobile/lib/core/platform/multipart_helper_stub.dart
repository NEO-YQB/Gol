import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'io_shim.dart';

Future<http.MultipartFile> createMultipartFile(String field, dynamic file) async {
  String path = '';
  Uint8List bytes = Uint8List(0);
  String? originalName;

  try {
    if (file != null) {
      try {
        originalName = file.name as String?;
      } catch (_) {}

      try {
        path = (file.path as String?) ?? '';
      } catch (_) {}

      if (originalName == null || originalName.isEmpty) {
        originalName = File.getNameForPath(path);
      }

      final cached = File.getBytesForPath(path);
      if (cached != null && cached.isNotEmpty) {
        bytes = cached;
      } else {
        final res = await file.readAsBytes();
        if (res is Uint8List) {
          bytes = res;
        } else if (res is List<int>) {
          bytes = Uint8List.fromList(res);
        }
      }
    }
  } catch (_) {}

  // Determine valid filename with standard image extension (.jpg, .png, .webp)
  String filename = originalName ?? '';
  if (filename.isEmpty && path.isNotEmpty) {
    filename = path.split('/').last.split('?').first;
  }

  final lower = filename.toLowerCase();
  MediaType contentType = MediaType('image', 'jpeg');

  if (lower.endsWith('.png')) {
    contentType = MediaType('image', 'png');
  } else if (lower.endsWith('.webp')) {
    contentType = MediaType('image', 'webp');
  } else if (lower.endsWith('.jpeg') || lower.endsWith('.jpg')) {
    contentType = MediaType('image', 'jpeg');
  } else {
    // If it's a blob UUID without extension, or HEIC/other:
    // Strip existing non-standard extension and enforce .jpg
    final clean = filename.replaceAll(RegExp(r'\.[^.]*$'), '');
    filename = '${clean.isEmpty ? "image" : clean}.jpg';
    contentType = MediaType('image', 'jpeg');
  }

  if (filename.isEmpty || filename == '.jpg') {
    filename = 'upload_${DateTime.now().millisecondsSinceEpoch}.jpg';
  }

  return http.MultipartFile.fromBytes(
    field,
    bytes,
    filename: filename,
    contentType: contentType,
  );
}
