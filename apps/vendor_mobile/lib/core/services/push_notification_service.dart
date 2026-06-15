import 'dart:developer' as developer;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  developer.log(
    'Push background message: ${message.messageId}',
    name: 'PushNotificationService',
  );
}

class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(
      _firebaseMessagingBackgroundHandler,
    );

    await _requestPermission();
    await _logToken();
    _listenForegroundMessages();
    _initialized = true;
  }

  Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    developer.log(
      'Push permission: ${settings.authorizationStatus.name}',
      name: 'PushNotificationService',
    );
  }

  Future<String?> getToken() async {
    return _messaging.getToken();
  }

  Future<void> _logToken() async {
    final token = await getToken();
    developer.log(
      'FCM token: ${token ?? 'null'}',
      name: 'PushNotificationService',
    );
  }

  void _listenForegroundMessages() {
    FirebaseMessaging.onMessage.listen((message) {
      developer.log(
        'Push foreground message: ${message.messageId} / ${message.notification?.title}',
        name: 'PushNotificationService',
      );
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      developer.log(
        'Push opened app: ${message.messageId}',
        name: 'PushNotificationService',
      );
    });
  }
}
