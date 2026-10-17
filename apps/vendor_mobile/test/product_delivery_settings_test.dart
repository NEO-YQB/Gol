import 'package:flutter_test/flutter_test.dart';
import 'package:vendor_mobile/features/products/domain/product_editor_models.dart';
import 'package:vendor_mobile/features/products/domain/vendor_product_detail.dart';

void main() {
  group('product delivery settings', () {
    test('defaults to store settings and five advance days', () {
      const settings = EditableDeliverySettings();
      expect(settings.validationError, isNull);
      expect(settings.toJson(), {
        'minDeliveryHours': null,
        'maxDeliveryHours': null,
        'hasExpressDelivery': null,
        'expressDeliveryHours': null,
        'maxAdvanceOrderDays': 5,
      });
    });

    test('reads saved overrides for editing', () {
      final product = VendorProductDetail.fromJson({
        'minDeliveryHours': 6,
        'maxDeliveryHours': 24,
        'hasExpressDelivery': false,
        'expressDeliveryHours': 2,
        'maxAdvanceOrderDays': 3,
      });
      final settings = EditableDeliverySettings.fromDetail(product);
      expect(settings.minimumHours, '6');
      expect(settings.maximumHours, '24');
      expect(settings.expressMode, 'false');
      expect(settings.advanceDays, '3');
    });

    test('supports Persian and Arabic digits', () {
      const settings = EditableDeliverySettings(
        minimumHours: '۶', maximumHours: '٢٤', expressMode: 'true',
        expressHours: '۲', advanceDays: '۵',
      );
      expect(settings.validationError, isNull);
      expect(settings.toJson()['maxDeliveryHours'], 24);
      expect(settings.toJson()['expressDeliveryHours'], 2);
      expect(settings.toJson()['hasExpressDelivery'], isTrue);
    });

    test('allows same-day-only orders', () {
      expect(const EditableDeliverySettings(advanceDays: '0').validationError, isNull);
    });

    test('rejects invalid limits and non-integer hours', () {
      for (final settings in [
        const EditableDeliverySettings(advanceDays: '6'),
        const EditableDeliverySettings(advanceDays: '-1'),
        const EditableDeliverySettings(advanceDays: ''),
        const EditableDeliverySettings(maximumHours: '1.5'),
        const EditableDeliverySettings(maximumHours: '121'),
        const EditableDeliverySettings(expressHours: '0'),
        const EditableDeliverySettings(minimumHours: '12', maximumHours: '6'),
      ]) {
        expect(settings.validationError, isNotNull);
      }
    });

    test('clearing an override restores inheritance', () {
      const settings = EditableDeliverySettings(maximumHours: '6', expressMode: 'true');
      final reset = settings.copyWith(maximumHours: '', expressMode: '');
      expect(reset.toJson()['maxDeliveryHours'], isNull);
      expect(reset.toJson()['hasExpressDelivery'], isNull);
    });
  });
}
