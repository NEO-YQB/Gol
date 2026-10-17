import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../domain/product_editor_models.dart';

class ProductDeliveryFields extends StatelessWidget {
  const ProductDeliveryFields({
    super.key,
    required this.settings,
    required this.onChanged,
    this.enabled = true,
  });

  final EditableDeliverySettings settings;
  final ValueChanged<EditableDeliverySettings> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('زمان‌بندی تحویل محصول', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          initialValue: settings.minimumHours,
          enabled: enabled,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'حداقل تحویل عادی (ساعت)', hintText: 'خالی: تنظیم فروشگاه'),
          onChanged: (value) => onChanged(settings.copyWith(minimumHours: value)),
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          initialValue: settings.maximumHours,
          enabled: enabled,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'حداکثر تحویل عادی (ساعت)', hintText: 'مثلاً ۶؛ خالی: تنظیم فروشگاه'),
          onChanged: (value) => onChanged(settings.copyWith(maximumHours: value)),
        ),
        const SizedBox(height: AppSpacing.md),
        DropdownButtonFormField<String>(
          initialValue: settings.expressMode,
          decoration: const InputDecoration(labelText: 'ارسال فوری این محصول'),
          items: const [
            DropdownMenuItem(value: '', child: Text('طبق تنظیم فروشگاه')),
            DropdownMenuItem(value: 'true', child: Text('فعال')),
            DropdownMenuItem(value: 'false', child: Text('غیرفعال؛ فقط عادی')),
          ],
          onChanged: enabled ? (value) => onChanged(settings.copyWith(expressMode: value)) : null,
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          initialValue: settings.expressHours,
          enabled: enabled,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'زمان تحویل فوری (ساعت)', hintText: 'مثلاً ۲؛ خالی: تنظیم فروشگاه'),
          onChanged: (value) => onChanged(settings.copyWith(expressHours: value)),
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          initialValue: settings.advanceDays,
          enabled: enabled,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'حداکثر روز پیش‌سفارش (۰ تا ۵)'),
          onChanged: (value) => onChanged(settings.copyWith(advanceDays: value)),
        ),
        const SizedBox(height: AppSpacing.md),
        const Text('صفر یعنی فقط امروز. زمان آماده‌سازی در سفارش آینده هم رعایت می‌شود. تنظیمات بعداً قابل ویرایش‌اند.'),
        if (settings.validationError != null)
          Text(settings.validationError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
      ],
    );
  }
}
