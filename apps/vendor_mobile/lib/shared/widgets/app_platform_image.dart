import 'package:flutter/material.dart';

export 'app_platform_image_stub.dart'
    if (dart.library.io) 'app_platform_image_io.dart';
