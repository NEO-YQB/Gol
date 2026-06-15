import 'package:flutter/material.dart';

import 'app/vendor_mobile_app.dart';
import 'core/services/push_notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PushNotificationService.instance.initialize();
  runApp(const VendorMobileApp());
}
