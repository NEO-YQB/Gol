import 'dart:io';
import 'package:http/http.dart' as http;

Future<http.MultipartFile> createMultipartFile(String field, dynamic file) async {
  if (file is File) {
    return http.MultipartFile.fromPath(field, file.path);
  }
  return http.MultipartFile.fromPath(field, file.path as String);
}
