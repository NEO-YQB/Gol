import 'package:persian_datetime_picker/persian_datetime_picker.dart';

import '../domain/vendor_order_detail.dart';

String formatOrderDate(String raw) {
  final value = raw.trim();
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value.isEmpty ? '—' : value;

  final tehran = parsed.isUtc
      ? parsed.add(const Duration(hours: 3, minutes: 30))
      : parsed;
  final jalali = Jalali.fromDateTime(tehran);
  final date = jalali.formatCompactDate();
  if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) {
    return _toPersianDigits(date);
  }

  final hours = tehran.hour.toString().padLeft(2, '0');
  final minutes = tehran.minute.toString().padLeft(2, '0');
  return _toPersianDigits('$date - $hours:$minutes');
}

String formatRequestedOrderDelivery(VendorOrderDetail order) {
  if (order.scheduledDeliveryAt.trim().isNotEmpty) {
    return 'تحویل زمان‌بندی‌شده · ${formatOrderDate(order.scheduledDeliveryAt)}';
  }

  final deliveryLabel = switch (order.deliveryType.trim().toUpperCase()) {
    'STANDARD' => 'ارسال استاندارد',
    'EXPRESS' => 'ارسال فوری',
    _ => 'نوع ارسال مشخص نشده',
  };
  final minimumHours = order.estimatedDeliveryMinHours;
  final maximumHours = order.estimatedDeliveryMaxHours;
  final hasMinimum = minimumHours != null && minimumHours > 0;
  final hasMaximum = maximumHours != null && maximumHours > 0;
  final String hoursLabel;
  if (hasMinimum && hasMaximum && minimumHours < maximumHours) {
    hoursLabel = '${_formatHours(minimumHours)} تا '
        '${_formatHours(maximumHours)} ساعت';
  } else if (hasMaximum) {
    hoursLabel = 'حداکثر ${_formatHours(maximumHours)} ساعت';
  } else if (hasMinimum) {
    hoursLabel = 'حداقل ${_formatHours(minimumHours)} ساعت';
  } else {
    hoursLabel = '';
  }

  return [
    deliveryLabel,
    if (order.deliveryWindowLabel.trim().isNotEmpty)
      'بازه انتخابی: ${_toPersianDigits(order.deliveryWindowLabel.trim())}',
    if (hoursLabel.isNotEmpty) hoursLabel,
  ].join(' · ');
}

String _formatHours(num value) {
  final label = value == value.roundToDouble()
      ? value.toInt().toString()
      : value.toString();
  return _toPersianDigits(label);
}

String _toPersianDigits(String value) {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return value.replaceAllMapped(
    RegExp(r'[0-9]'),
    (match) => persianDigits[int.parse(match.group(0)!)],
  );
}
