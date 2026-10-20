import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vendor_mobile/core/theme/app_theme.dart';
import 'package:vendor_mobile/features/app_shell/presentation/widgets/store_suspension_dialog.dart';

void main() {
  Future<void> openDialog(
    WidgetTester tester, {
    String? reason,
    ValueChanged<bool?>? onClosed,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                final result = await showDialog<bool>(
                  context: context,
                  builder: (context) => StoreSuspensionDialog(reason: reason),
                );
                onClosed?.call(result);
              },
              child: const Text('نمایش پیام'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('نمایش پیام'));
    await tester.pumpAndSettle();
  }

  testWidgets('shows the reason and can be closed', (tester) async {
    await openDialog(tester, reason: '  نیاز به بررسی مدارک  ');

    expect(find.text('نیاز به بررسی مدارک'), findsOneWidget);
    expect(find.text('فروشگاه شما غیرفعال شده است'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.byType(AlertDialog))),
      TextDirection.rtl,
    );

    await tester.tap(find.byTooltip('بستن پیام'));
    await tester.pumpAndSettle();

    expect(find.byType(StoreSuspensionDialog), findsNothing);
  });

  testWidgets('hides empty reasons and acknowledges the message', (tester) async {
    await openDialog(tester, reason: '   ');

    expect(find.text('دلیل اعلام‌شده توسط مدیریت'), findsNothing);
    await tester.ensureVisible(find.text('متوجه شدم'));
    await tester.tap(find.text('متوجه شدم'));
    await tester.pumpAndSettle();

    expect(find.byType(StoreSuspensionDialog), findsNothing);
  });

  testWidgets('returns a support navigation request', (tester) async {
    bool? openSupport;
    await openDialog(tester, onClosed: (result) => openSupport = result);

    await tester.ensureVisible(find.text('پیگیری از پشتیبانی'));
    await tester.tap(find.text('پیگیری از پشتیبانی'));
    await tester.pumpAndSettle();

    expect(openSupport, isTrue);
    expect(find.byType(StoreSuspensionDialog), findsNothing);
  });
}
