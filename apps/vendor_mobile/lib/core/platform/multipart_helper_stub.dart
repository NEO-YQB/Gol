import 'dart:typed_data';
import 'package:http/http.dart' as http;

Future<http.MultipartFile> createMultipartFile(String field, dynamic file) async {
  String path = '';
  Uint8List bytes = Uint8List(0);
  try {
    path = (file.path as String?) ?? '';
    final res = await file.readAsBytes();
    if (res is Uint8List) {
      bytes = res;
    } else if (res is List<int>) {
      bytes = Uint8List.fromList(res);
    }
  } catch (_) {}

  final filename = path.split('/').last.split('?').first;
  return http.MultipartFile.fromBytes(
    field,
    bytes,
    filename: filename.isEmpty ? 'upload.jpg' : filename,
  );
}
