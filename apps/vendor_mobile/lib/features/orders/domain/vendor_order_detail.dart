class VendorOrderDetail {
  const VendorOrderDetail({
    required this.id,
    required this.status,
    required this.paymentStatus,
    required this.settlementStatus,
    required this.customerName,
    required this.phoneNumber,
    required this.totalAmount,
    required this.createdAt,
    required this.deliveryDate,
    required this.availableActions,
    required this.timeline,
    required this.auditTrail,
    required this.latestOperationalFlags,
    required this.items,
  });

  final int id;
  final String status;
  final String paymentStatus;
  final String settlementStatus;
  final String customerName;
  final String phoneNumber;
  final num totalAmount;
  final String createdAt;
  final String deliveryDate;
  final Map<String, dynamic> availableActions;
  final List<VendorOrderTimelineEvent> timeline;
  final List<VendorOrderAuditEvent> auditTrail;
  final List<String> latestOperationalFlags;
  final List<VendorOrderItem> items;

  factory VendorOrderDetail.fromJson(Map<String, dynamic> json) {
    return VendorOrderDetail(
      id: _asInt(json['id']),
      status: _readText(json, const ['status'], fallback: 'UNKNOWN'),
      paymentStatus:
          _readText(json, const ['paymentStatus'], fallback: 'UNKNOWN'),
      settlementStatus:
          _readText(json, const ['settlementStatus'], fallback: 'UNKNOWN'),
      customerName: _readText(json, const [
        'customerName',
        'customer',
        'recipientName',
      ], fallback: '—'),
      phoneNumber: _readText(
        json,
        const ['recipientPhoneNumber', 'phoneNumber'],
        fallback: '—',
      ),
      totalAmount: _asNum(
        json['totalAmount'] ?? json['payableAmount'] ?? json['finalAmount'],
      ),
      createdAt: _readText(json, const ['createdAt', 'updatedAt']),
      deliveryDate: _readText(
        json,
        const ['deliveredAt', 'deliveryDate', 'scheduledFor'],
      ),
      availableActions:
          (json['availableActions'] as Map<String, dynamic>?) ?? const {},
      timeline: ((json['timeline'] as List<dynamic>?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(VendorOrderTimelineEvent.fromJson)
          .toList(),
      auditTrail: ((json['auditTrail'] as List<dynamic>?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(VendorOrderAuditEvent.fromJson)
          .toList(),
      latestOperationalFlags:
          ((json['latestOperationalFlags'] as List<dynamic>?) ?? const [])
              .map((item) => item.toString())
              .toList(),
      items: ((json['orderItems'] as List<dynamic>?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(VendorOrderItem.fromJson)
          .toList(),
    );
  }
}

class VendorOrderItem {
  const VendorOrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.productSlug,
    required this.productImage,
    required this.quantity,
    required this.price,
    required this.lineTotal,
  });

  final int id;
  final int productId;
  final String productName;
  final String productSlug;
  final String productImage;
  final int quantity;
  final num price;
  final num lineTotal;

  factory VendorOrderItem.fromJson(Map<String, dynamic> json) {
    final quantity = _asInt(json['quantity']);
    final price = _asNum(json['price']);
    final explicitLineTotal = _asNum(json['lineTotal']);

    return VendorOrderItem(
      id: _asInt(json['id']),
      productId: _asInt(json['productId']),
      productName: _readText(
        json,
        const ['productName', 'name'],
        fallback: 'محصول بدون نام',
      ),
      productSlug: _readText(json, const ['productSlug', 'slug']),
      productImage: _readText(
        json,
        const ['productImage', 'mainImage', 'image', 'imageUrl'],
      ),
      quantity: quantity,
      price: price,
      lineTotal: explicitLineTotal == 0 ? price * quantity : explicitLineTotal,
    );
  }
}

class VendorOrderTimelineEvent {
  const VendorOrderTimelineEvent({
    required this.id,
    required this.fromStatus,
    required this.toStatus,
    required this.note,
    required this.createdAt,
  });

  final String id;
  final String fromStatus;
  final String toStatus;
  final String note;
  final String createdAt;

  factory VendorOrderTimelineEvent.fromJson(Map<String, dynamic> json) {
    return VendorOrderTimelineEvent(
      id: _readText(json, const ['id'], fallback: '0'),
      fromStatus: _readText(json, const ['fromStatus'], fallback: '—'),
      toStatus: _readText(json, const ['toStatus', 'status'], fallback: '—'),
      note: _readText(json, const ['note']),
      createdAt: _readText(json, const ['createdAt', 'updatedAt']),
    );
  }
}

class VendorOrderAuditEvent {
  const VendorOrderAuditEvent({
    required this.id,
    required this.summary,
    required this.createdAt,
  });

  final String id;
  final String summary;
  final String createdAt;

  factory VendorOrderAuditEvent.fromJson(Map<String, dynamic> json) {
    return VendorOrderAuditEvent(
      id: _readText(json, const ['id'], fallback: '0'),
      summary: _readText(json, const ['summary'], fallback: 'رویداد سفارش'),
      createdAt: _readText(json, const ['createdAt', 'updatedAt']),
    );
  }
}

int _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

num _asNum(Object? value) {
  if (value is num) return value;
  return num.tryParse('$value') ?? 0;
}

String _readText(
  Map<String, dynamic> json,
  List<String> keys, {
  String fallback = '',
}) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) continue;
    final text = value.toString().trim();
    if (text.isNotEmpty) return text;
  }
  return fallback;
}
