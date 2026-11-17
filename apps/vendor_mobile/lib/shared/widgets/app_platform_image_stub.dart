import 'package:flutter/material.dart';
import '../../core/platform/io_shim.dart';

Widget buildPlatformFileImage({
  required String path,
  double? width,
  double? height,
  BoxFit fit = BoxFit.cover,
}) {
  final cachedBytes = File.getBytesForPath(path);
  if (cachedBytes != null && cachedBytes.isNotEmpty) {
    return Image.memory(
      cachedBytes,
      width: width,
      height: height,
      fit: fit,
    );
  }

  return Image.network(
    path,
    width: width,
    height: height,
    fit: fit,
  );
}
