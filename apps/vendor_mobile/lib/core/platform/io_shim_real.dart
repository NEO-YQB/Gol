export 'dart:io' show File, SocketException;
import 'dart:io';

Future<File> wrapXFile(dynamic xFile) async {
  return File(xFile.path as String);
}
