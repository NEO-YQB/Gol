export 'dart:io' show File, SocketException;
import 'dart:io';
import 'dart:typed_data';

Future<File> wrapXFile(dynamic xFile) async {
  return File(xFile.path as String);
}

File createPlatformFileFromBytes(String path, Uint8List bytes, String name) {
  final file = File(path);
  try {
    file.writeAsBytesSync(bytes);
  } catch (_) {}
  return file;
}
