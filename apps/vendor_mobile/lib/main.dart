import 'package:flutter/material.dart';

import 'app/vendor_mobile_app.dart';
import 'core/services/push_notification_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  PushNotificationService.instance.initialize();
  runApp(const VendorMobileApp());
}
