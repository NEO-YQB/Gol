import 'package:flutter_test/flutter_test.dart';

import 'package:vendor_mobile/main.dart';

void main() {
  testWidgets('app shows login flow as first screen', (WidgetTester tester) async {
    await tester.pumpWidget(const VendorMobileApp());

    expect(find.text('ورود فروشنده'), findsOneWidget);
    expect(find.text('ارسال کد تایید'), findsOneWidget);
  });
}
