import 'dart:async';
import 'dart:developer' as developer;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../../firebase_options.dart';
import '../../features/notifications/data/push_device_api_service.dart';

class PushNavigationIntent {
  const PushNavigationIntent({
    required this.topic,
    this.orderId,
    this.supportTicketId,
  });

  final String topic;
  final int? orderId;
  final int? supportTicketId;

  factory PushNavigationIntent.fromMessage(RemoteMessage message) {
    final data = message.data;
    final topic = data['topic']?.toString() ??
        data['type']?.toString() ??
        message.notification?.title ??
        'notification';

    int? parseInt(Object? value) => int.tryParse('${value ?? ''}');

    return PushNavigationIntent(
      topic: topic,
      orderId: parseInt(data['orderId']),
      supportTicketId: parseInt(data['supportTicketId']),
    );
  }
}

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  developer.log(
    'Push background message: ${message.messageId}',
    name: 'PushNotificationService',
  );
}

class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  final _navigationController =
      StreamController<PushNavigationIntent>.broadcast();
  final PushDeviceApiService _pushDeviceApiService = const PushDeviceApiService();
  bool _initialized = false;

  Stream<PushNavigationIntent> get navigationStream =>
      _navigationController.stream;

  void _consoleLog(String message) {
    developer.log(message, name: 'PushNotificationService');
    debugPrint(message);
    print(message);
  }

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      _consoleLog('PUSH init start');
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      ).timeout(const Duration(seconds: 8));
      _consoleLog('PUSH firebase initialized');

      final messaging = FirebaseMessaging.instance;

      FirebaseMessaging.onBackgroundMessage(
        _firebaseMessagingBackgroundHandler,
      );

      await _requestPermission(messaging);
      await _logToken(messaging);
      await _handleInitialMessage();
      _listenForegroundMessages();
      _initialized = true;
      _consoleLog('PUSH init done');
    } catch (error, stackTrace) {
      _consoleLog('PUSH init failed: $error');
      developer.log(
        'Push initialize failed: $error',
        name: 'PushNotificationService',
        stackTrace: stackTrace,
      );
    }
  }

  Future<void> _requestPermission(FirebaseMessaging messaging) async {
    try {
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      ).timeout(const Duration(seconds: 8));

      developer.log(
        'Push permission: ${settings.authorizationStatus.name}',
        name: 'PushNotificationService',
      );
      _consoleLog('PUSH permission: ${settings.authorizationStatus.name}');
    } catch (error, stackTrace) {
      _consoleLog('PUSH permission failed: $error');
      developer.log(
        'Push permission request failed: $error',
        name: 'PushNotificationService',
        stackTrace: stackTrace,
      );
    }
  }

  Future<String?> getToken() async {
    Firebase.app();
    return FirebaseMessaging.instance.getToken();
  }

  Future<String?> logToken({
    bool forceRefresh = false,
    String reason = 'manual',
  }) async {
    try {
      Firebase.app();
      final messaging = FirebaseMessaging.instance;
      final token = forceRefresh
          ? await messaging.getToken().timeout(const Duration(seconds: 8))
          : await getToken().timeout(const Duration(seconds: 8));

      developer.log(
        'FCM token [$reason]: ${token ?? 'null'}',
        name: 'PushNotificationService',
      );
      _consoleLog('FCM token [$reason]: ${token ?? 'null'}');

      return token;
    } catch (error, stackTrace) {
      _consoleLog('FCM token [$reason] failed: $error');
      developer.log(
        'FCM token [$reason] failed: $error',
        name: 'PushNotificationService',
        stackTrace: stackTrace,
      );
      return null;
    }
  }

  Future<void> registerTokenForSession({
    required String accessToken,
  }) async {
    try {
      final token = await logToken(
        forceRefresh: true,
        reason: 'register-device',
      );

      if (token == null || token.isEmpty) {
        _consoleLog('PUSH register device skipped: token is empty');
        return;
      }

      await _pushDeviceApiService.registerDevice(
        accessToken: accessToken,
        token: token,
        platform: _platformName(),
        deviceLabel: _deviceLabel(),
        appVersion: '1.0.0+1',
      );

      _consoleLog('PUSH device token registered on backend');
    } catch (error, stackTrace) {
      _consoleLog('PUSH register device failed: $error');
      developer.log(
        'PUSH register device failed: $error',
        name: 'PushNotificationService',
        stackTrace: stackTrace,
      );
    }
  }

  Future<void> _logToken(FirebaseMessaging messaging) async {
    try {
      final token = await messaging.getToken().timeout(const Duration(seconds: 8));
      developer.log(
        'FCM token: ${token ?? 'null'}',
        name: 'PushNotificationService',
      );
      _consoleLog('FCM token: ${token ?? 'null'}');
    } catch (error, stackTrace) {
      _consoleLog('Fetch FCM token failed: $error');
      developer.log(
        'Fetch FCM token failed: $error',
        name: 'PushNotificationService',
        stackTrace: stackTrace,
      );
    }
  }

  void _listenForegroundMessages() {
    FirebaseMessaging.onMessage.listen((message) {
      _consoleLog(
        'PUSH foreground message: ${message.messageId} / ${message.notification?.title}',
      );
      developer.log(
        'Push foreground message: ${message.messageId} / ${message.notification?.title}',
        name: 'PushNotificationService',
      );
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _consoleLog('PUSH opened app: ${message.messageId}');
      developer.log(
        'Push opened app: ${message.messageId}',
        name: 'PushNotificationService',
      );
      _navigationController.add(PushNavigationIntent.fromMessage(message));
    });
  }

  Future<void> _handleInitialMessage() async {
    try {
      final message = await FirebaseMessaging.instance.getInitialMessage();
      if (message != null) {
        _consoleLog('PUSH initial message: ${message.messageId}');
        _navigationController.add(PushNavigationIntent.fromMessage(message));
      }
    } catch (error, stackTrace) {
      _consoleLog('Read initial push message failed: $error');
      developer.log(
        'Read initial push message failed: $error',
        name: 'PushNotificationService',
        stackTrace: stackTrace,
      );
    }
  }

  String _platformName() {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.iOS:
        return 'ios';
      default:
        return 'web';
    }
  }

  String _deviceLabel() {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'Android Device';
      case TargetPlatform.iOS:
        return 'iPhone';
      default:
        return 'Unknown Device';
    }
  }
}
