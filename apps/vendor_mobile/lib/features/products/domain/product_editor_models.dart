import 'vendor_product_detail.dart';

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
