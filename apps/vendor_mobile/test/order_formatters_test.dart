import 'package:flutter_test/flutter_test.dart';
import 'package:vendor_mobile/features/orders/domain/vendor_order_detail.dart';
import 'package:vendor_mobile/features/orders/presentation/order_formatters.dart';

void main() {
  group('order dates', () {
    test('converts UTC to Jalali in Tehran across midnight and Nowruz', () {
      expect(
        formatOrderDate('2024-03-19T21:00:00Z'),
        '۱۴۰۳/۰۱/۰۱ - ۰۰:۳۰',
      );
    });

    test('accepts explicit Tehran offsets without shifting twice', () {
      expect(
        formatOrderDate('2024-03-20T00:30:00+03:30'),
        '۱۴۰۳/۰۱/۰۱ - ۰۰:۳۰',
      );
    });

    test('preserves wall time for timestamps without a timezone', () {
      expect(
        formatOrderDate('2024-03-20T15:45:00'),
        '۱۴۰۳/۰۱/۰۱ - ۱۵:۴۵',
      );
    });

    test('formats date-only values without inventing a time', () {
      expect(formatOrderDate('2024-03-20'), '۱۴۰۳/۰۱/۰۱');
    });

    test('handles missing and invalid dates', () {
      expect(formatOrderDate('  '), '—');
      expect(formatOrderDate('invalid'), 'invalid');
    });
  });

  group('requested delivery', () {
    test('reads delivery snapshots from the API', () {
      final order = VendorOrderDetail.fromJson({
        'deliveryType': 'STANDARD',
        'deliveryWindowLabel': 'عصر',
        'estimatedDeliveryMinHours': '12',
        'estimatedDeliveryMaxHours': 24,
      });

      expect(order.deliveryType, 'STANDARD');
      expect(order.deliveryWindowLabel, 'عصر');
      expect(order.estimatedDeliveryMinHours, 12);
      expect(order.estimatedDeliveryMaxHours, 24);
      expect(
        formatRequestedOrderDelivery(order),
        'ارسال استاندارد · بازه انتخابی: عصر · ۱۲ تا ۲۴ ساعت',
      );
    });

    test('distinguishes express delivery and its promised hours', () {
      final order = VendorOrderDetail.fromJson({
        'deliveryType': 'EXPRESS',
        'estimatedDeliveryMinHours': 2,
        'estimatedDeliveryMaxHours': 2,
      });

      expect(formatRequestedOrderDelivery(order), 'ارسال فوری · حداکثر ۲ ساعت');
    });

    test('shows standard and express labels even without an hour estimate', () {
      for (final entry in {
        'STANDARD': 'ارسال استاندارد',
        'EXPRESS': 'ارسال فوری',
      }.entries) {
        final order = VendorOrderDetail.fromJson({'deliveryType': entry.key});
        expect(formatRequestedOrderDelivery(order), entry.value);
      }
    });

    test('shows the selected delivery date in Jalali and Tehran time', () {
      final order = VendorOrderDetail.fromJson({
        'deliveryType': 'STANDARD',
        'scheduledDeliveryAt': '2024-03-20T12:00:00Z',
        'estimatedDeliveryMinHours': 12,
        'estimatedDeliveryMaxHours': 24,
      });

      expect(
        formatRequestedOrderDelivery(order),
        'تحویل زمان‌بندی‌شده · ۱۴۰۳/۰۱/۰۱ - ۱۵:۳۰',
      );
    });

    test('does not invent a delivery type for incomplete data', () {
      expect(
        formatRequestedOrderDelivery(VendorOrderDetail.fromJson({})),
        'نوع ارسال مشخص نشده',
      );
    });

    test('handles a single positive delivery bound', () {
      expect(
        formatRequestedOrderDelivery(VendorOrderDetail.fromJson({
          'deliveryType': 'STANDARD',
          'estimatedDeliveryMinHours': 6,
        })),
        'ارسال استاندارد · حداقل ۶ ساعت',
      );
      expect(
        formatRequestedOrderDelivery(VendorOrderDetail.fromJson({
          'deliveryType': 'EXPRESS',
          'estimatedDeliveryMinHours': 0,
          'estimatedDeliveryMaxHours': 1.5,
        })),
        'ارسال فوری · حداکثر ۱.۵ ساعت',
      );
    });
  });
}
