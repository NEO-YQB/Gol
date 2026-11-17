import 'dart:js_util' as js_util;
import 'dart:typed_data';
import 'package:http/http.dart' as http;

class File {
  File(this.path, {this.bytes, this.name});
  final String path;
  final Uint8List? bytes;
  final String? name;

  static final Map<String, Uint8List> _bytesCache = {};
  static final Map<String, String> _nameCache = {};

  static void cache(String path, Uint8List bytes, [String? name]) {
    if (path.isEmpty) return;
    _bytesCache[path] = bytes;
    if (name != null && name.isNotEmpty) {
      _nameCache[path] = name;
    }
  }

  static Uint8List? getBytesForPath(String path) {
    return _bytesCache[path];
  }

  static String? getNameForPath(String path) {
    return _nameCache[path];
  }

  Future<Uint8List> readAsBytes() async {
    if (bytes != null && bytes!.isNotEmpty) {
      return bytes!;
    }
    if (_bytesCache.containsKey(path) && _bytesCache[path]!.isNotEmpty) {
      return _bytesCache[path]!;
    }
    try {
      if (path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
        final response = await http.get(Uri.parse(path));
        if (response.bodyBytes.isNotEmpty) {
          _bytesCache[path] = response.bodyBytes;
          return response.bodyBytes;
        }
      }
    } catch (_) {}
    return Uint8List(0);
  }

  Uint8List readAsBytesSync() => bytes ?? _bytesCache[path] ?? Uint8List(0);
  bool existsSync() => true;
  int lengthSync() => bytes?.length ?? _bytesCache[path]?.length ?? 0;
}

Future<Uint8List?> _convertViaBrowserCanvas(String blobUrl) async {
  try {
    if (js_util.hasProperty(js_util.globalThis, 'processImageForWebUpload')) {
      final promise = js_util.callMethod(
        js_util.globalThis,
        'processImageForWebUpload',
        [blobUrl],
      );
      if (promise != null) {
        final result = await js_util.promiseToFuture(promise);
        if (result != null) {
          if (result is Uint8List) return result;
          if (result is List<int>) return Uint8List.fromList(result);
          final dartList = js_util.dartify(result);
          if (dartList is List) {
            return Uint8List.fromList(dartList.cast<int>());
          }
        }
      }
    }
  } catch (_) {}
  return null;
}

Future<File> wrapXFile(dynamic xFile) async {
  if (xFile == null) throw ArgumentError.notNull('xFile');
  try {
    final String path = (xFile.path as String?) ?? '';
    final String name = (xFile.name as String?) ?? '';

    // First attempt: Convert HEIC / HEIF / large camera photo via Safari's native canvas
    Uint8List? processedBytes;
    if (path.isNotEmpty && (path.startsWith('blob:') || path.startsWith('http'))) {
      try {
        processedBytes = await _convertViaBrowserCanvas(path);
      } catch (_) {}
    }

    Uint8List uint8Bytes = processedBytes ?? Uint8List(0);
    if (uint8Bytes.isEmpty) {
      final bytes = await xFile.readAsBytes();
      if (bytes is Uint8List) {
        uint8Bytes = bytes;
      } else if (bytes is List<int>) {
        uint8Bytes = Uint8List.fromList(bytes);
      }
    }

    // If it was HEIC or HEIF, sanitize name to .jpg
    String finalName = name;
    if (finalName.toLowerCase().endsWith('.heic') ||
        finalName.toLowerCase().endsWith('.heif')) {
      finalName =
          '${finalName.replaceAll(RegExp(r'\.(heic|heif)$', caseSensitive: false), '')}.jpg';
    }

    if (path.isNotEmpty && uint8Bytes.isNotEmpty) {
      File.cache(path, uint8Bytes, finalName);
    }
    return File(path, bytes: uint8Bytes, name: finalName);
  } catch (_) {
    return File(xFile.path as String);
  }
}

class SocketException implements Exception {
  final String message;
  const SocketException([this.message = '']);

  @override
  String toString() => 'SocketException: $message';
}
