import 'dart:io';
import 'package:flutter/material.dart';

Widget buildPlatformFileImage({
  required String path,
  double? width,
  double? height,
  BoxFit fit = BoxFit.cover,
}) {
  return Image.file(
    File(path),
    width: width,
    height: height,
    fit: fit,
  );
}
