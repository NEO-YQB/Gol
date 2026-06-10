import 'package:flutter_test/flutter_test.dart';

import 'package:vendor_mobile/main.dart';

void main() {
  testWidgets('app bootstrap screen renders base texts', (WidgetTester tester) async {
    await tester.pumpWidget(const VendorMobileApp());

    expect(find.text('اپ فروشنده'), findsOneWidget);
    expect(find.text('شروع زیرساخت اپ موبایل فروشنده'), findsOneWidget);
  });
}
