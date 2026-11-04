import 'dart:typed_data';
import 'package:http/http.dart' as http;

class File {
  File(this.path);
  final String path;

  Future<Uint8List> readAsBytes() async {
    try {
      if (path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
        final response = await http.get(Uri.parse(path));
        return response.bodyBytes;
      }
    } catch (_) {}
    return Uint8List(0);
  }

  Uint8List readAsBytesSync() => Uint8List(0);
  bool existsSync() => true;
  int lengthSync() => 0;
}

class SocketException implements Exception {
  final String message;
  const SocketException([this.message = '']);

  @override
  String toString() => 'SocketException: $message';
}
