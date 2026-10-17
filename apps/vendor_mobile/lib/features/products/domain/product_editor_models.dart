import 'vendor_product_detail.dart';

class EditableDeliverySettings {
  const EditableDeliverySettings({
    this.minimumHours = '',
    this.maximumHours = '',
    this.expressMode = '',
    this.expressHours = '',
    this.advanceDays = '5',
  });

  final String minimumHours;
  final String maximumHours;
  final String expressMode;
  final String expressHours;
  final String advanceDays;

  factory EditableDeliverySettings.fromDetail(VendorProductDetail product) {
    return EditableDeliverySettings(
      minimumHours: product.minDeliveryHours?.toString() ?? '',
      maximumHours: product.maxDeliveryHours?.toString() ?? '',
      expressMode: product.hasExpressDelivery?.toString() ?? '',
      expressHours: product.expressDeliveryHours?.toString() ?? '',
      advanceDays: product.maxAdvanceOrderDays.toString(),
    );
  }

  EditableDeliverySettings copyWith({
    String? minimumHours,
    String? maximumHours,
    String? expressMode,
    String? expressHours,
    String? advanceDays,
  }) {
    return EditableDeliverySettings(
      minimumHours: minimumHours ?? this.minimumHours,
      maximumHours: maximumHours ?? this.maximumHours,
      expressMode: expressMode ?? this.expressMode,
      expressHours: expressHours ?? this.expressHours,
      advanceDays: advanceDays ?? this.advanceDays,
    );
  }

  String? get validationError {
    for (final hours in [minimumHours, maximumHours, expressHours]) {
      if (hours.trim().isEmpty) continue;
      final parsed = _parseDeliveryInt(hours);
      if (parsed == null || parsed < 0 || parsed > 120) {
        return 'زمان تحویل باید عدد صحیح بین صفر و ۱۲۰ ساعت باشد.';
      }
    }
    final minimum = _parseDeliveryInt(minimumHours);
    final maximum = _parseDeliveryInt(maximumHours);
    if (minimum != null && maximum != null && minimum > maximum) {
      return 'حداقل زمان تحویل نباید از حداکثر آن بیشتر باشد.';
    }
    if (expressHours.trim().isNotEmpty && (_parseDeliveryInt(expressHours) ?? 0) < 1) {
      return 'زمان تحویل فوری باید حداقل یک ساعت باشد.';
    }
    final days = _parseDeliveryInt(advanceDays);
    if (days == null || days < 0 || days > 5) {
      return 'مهلت پیش‌سفارش باید عددی بین صفر و ۵ روز باشد.';
    }
    return null;
  }

  Map<String, dynamic> toJson() => {
        'minDeliveryHours': _parseDeliveryInt(minimumHours),
        'maxDeliveryHours': _parseDeliveryInt(maximumHours),
        'hasExpressDelivery': expressMode.isEmpty ? null : expressMode == 'true',
        'expressDeliveryHours': _parseDeliveryInt(expressHours),
        'maxAdvanceOrderDays': _parseDeliveryInt(advanceDays),
      };
}

int? _parseDeliveryInt(String value) {
  final normalized = value.trim().replaceAllMapped(RegExp('[۰-۹٠-٩]'), (match) {
    final code = match[0]!.codeUnitAt(0);
    return (code >= 0x06f0 ? code - 0x06f0 : code - 0x0660).toString();
  });
  return int.tryParse(normalized);
}

class EditableGalleryItem {
  const EditableGalleryItem({
    required this.url,
    required this.alt,
  });

  final String url;
  final String alt;

  factory EditableGalleryItem.fromDetail(VendorProductGalleryItem item) {
    return EditableGalleryItem(
      url: item.url,
      alt: item.alt,
    );
  }

  EditableGalleryItem copyWith({
    String? url,
    String? alt,
  }) {
    return EditableGalleryItem(
      url: url ?? this.url,
      alt: alt ?? this.alt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'url': url.trim(),
      'alt': alt.trim().isEmpty ? null : alt.trim(),
    };
  }
}

class EditableCompositionItem {
  const EditableCompositionItem({
    required this.elementId,
    required this.elementType,
    required this.quantity,
  });

  final int? elementId;
  final String elementType;
  final num quantity;

  factory EditableCompositionItem.empty() {
    return const EditableCompositionItem(
      elementId: null,
      elementType: '',
      quantity: 1,
    );
  }

  factory EditableCompositionItem.fromDetail(VendorProductComposition item) {
    return EditableCompositionItem(
      elementId: item.elementId,
      elementType: item.elementType,
      quantity: item.quantity,
    );
  }

  EditableCompositionItem copyWith({
    int? elementId,
    String? elementType,
    num? quantity,
    bool clearElementId = false,
  }) {
    return EditableCompositionItem(
      elementId: clearElementId ? null : (elementId ?? this.elementId),
      elementType: elementType ?? this.elementType,
      quantity: quantity ?? this.quantity,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'elementId': elementId,
      'elementType': elementType,
      'quantity': quantity,
    };
  }
}
