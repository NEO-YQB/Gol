import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions برای وب تنظیم نشده است.',
      );
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions برای iOS هنوز تنظیم نشده است.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions برای این پلتفرم تنظیم نشده است.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDhyJMOW5zxiZGiWdigsEGjNXQyZBSG07c',
    appId: '1:977700143265:android:26139ba0bde980d45730e0',
    messagingSenderId: '977700143265',
    projectId: 'golino2026',
    storageBucket: 'golino2026.firebasestorage.app',
  );
}
